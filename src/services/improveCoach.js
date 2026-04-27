const PREFERRED_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'];
const FORBIDDEN_ACTION_REGEX = /(log|record|track).*(sleep duration)|sleep duration.*(log|record|track)/i;

function buildLocalPlan({ streak, sleepTargetHours, gapXp, nightsToClose }) {
  const riskLevel = streak === 0 ? 'high' : streak < 4 ? 'medium' : 'low';
  return {
    source: 'local',
    fallbackReason: 'local_default',
    riskLevel,
    objective: `Hit ${sleepTargetHours}h tonight to protect your momentum.`,
    actions: [
      'Set a hard screen-off time 45 minutes before bed.',
      'Prepare your room: cool, dark, and quiet before bedtime.',
      `Focus on ${nightsToClose} consistent nights to close ~${gapXp} XP.`,
    ],
    schedule: [
      'Afternoon: avoid caffeine after 1 PM and hydrate early.',
      'Evening: dinner 2-3h before bed, reduce bright light exposure.',
      `Pre-bed: 10-minute wind-down and lights out at your target bedtime.`,
    ],
    motivation:
      streak === 0
        ? 'One night is enough to restart your climb.'
        : 'Protect tonight and you keep the streak compounding.',
  };
}

function safeJsonParse(text) {
  const cleaned = String(text)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(cleaned);
}

function extractTextFromResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts) && parts[0]?.text) return parts[0].text;
  return '';
}

async function callGeminiGenerateContent(apiKey, model, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

async function listGeminiGenerateModels(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { models: [], error: `list_models_http_${res.status}` };
  }
  const data = await res.json();
  const models = (data?.models ?? [])
    .filter((item) => Array.isArray(item?.supportedGenerationMethods) && item.supportedGenerationMethods.includes('generateContent'))
    .map((item) => String(item.name ?? '').replace(/^models\//, ''))
    .filter(Boolean);
  return { models, error: null };
}

function rankModels(availableModels) {
  const seen = new Set();
  const ranked = [];

  for (const preferred of PREFERRED_GEMINI_MODELS) {
    if (availableModels.includes(preferred) && !seen.has(preferred)) {
      ranked.push(preferred);
      seen.add(preferred);
    }
  }

  for (const model of availableModels) {
    if (!seen.has(model) && model.includes('gemini')) {
      ranked.push(model);
      seen.add(model);
    }
  }

  return ranked;
}

function sanitizeActions(actions = []) {
  const normalized = actions
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .filter((item) => !FORBIDDEN_ACTION_REGEX.test(item));

  const fallbackPool = [
    'Set a fixed screen-off time 45 minutes before bed.',
    'Prepare your room to be cool, dark, and quiet before lights out.',
    'Use one short wind-down ritual at the same time tonight.',
  ];

  for (const candidate of fallbackPool) {
    if (normalized.length >= 3) break;
    if (!normalized.includes(candidate)) normalized.push(candidate);
  }

  return normalized.slice(0, 3);
}

export async function generateCoachPlan(input) {
  const apiKey = String(import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    return { ...buildLocalPlan(input), fallbackReason: 'missing_api_key' };
  }

  const prompt = `
You are an elite sleep performance coach for a gamified app.
Return ONLY valid JSON (no markdown) with keys:
objective (string),
riskLevel ("low"|"medium"|"high"),
actions (array of exactly 3 strings),
schedule (array of exactly 3 strings: afternoon, evening, pre-bed),
motivation (string).

User profile:
- displayName: ${input.displayName}
- continent: ${input.continent}
- hasAndroidApk: ${input.hasAndroidApk}

Performance data:
- currentStreak: ${input.streak}
- longestStreak: ${input.longestStreak}
- totalXp: ${input.xp}
- sleepTargetHours: ${input.sleepTargetHours}
- top3GapXp: ${input.gapXp}
- nightsToCloseTop3: ${input.nightsToClose}
- bestDaysSummary: ${input.bestDaysSummary}

Constraints:
- Keep it practical and specific for tonight.
- No medical diagnosis.
- Use clear action verbs.
- Never suggest logging, recording, or tracking sleep duration.
  `.trim();

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      responseMimeType: 'application/json',
    },
  };

  let lastError = 'unknown';
  const { models: availableModels, error: listError } = await listGeminiGenerateModels(apiKey);
  const modelsToTry = rankModels(availableModels);
  if (!modelsToTry.length) {
    return { ...buildLocalPlan(input), fallbackReason: listError ?? 'no_generate_models_available' };
  }

  for (const model of modelsToTry) {
    try {
      const response = await callGeminiGenerateContent(apiKey, model, requestBody);
      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        lastError = `http_${response.status}_invalid_json`;
        if (!response.ok) continue;
        return { ...buildLocalPlan(input), fallbackReason: lastError };
      }

      if (!response.ok) {
        const msg = data?.error?.message ? String(data.error.message).slice(0, 200) : raw.slice(0, 200);
        if (response.status === 404) {
          lastError = `http_404:${msg || 'not_found'}`;
          continue;
        }
        if (msg.toLowerCase().includes('not found') && (response.status === 400 || response.status === 404)) {
          lastError = `http_${response.status}:${msg}`;
          continue;
        }
        return {
          ...buildLocalPlan(input),
          fallbackReason: `http_${response.status}:${msg || 'error'}`,
        };
      }

      const finish = data?.candidates?.[0]?.finishReason;
      if (finish && finish !== 'STOP') {
        lastError = `finish_${finish}`;
        continue;
      }

      const text = extractTextFromResponse(data);
      if (!text) {
        if (data?.promptFeedback?.blockReason) {
          return { ...buildLocalPlan(input), fallbackReason: `blocked_${data.promptFeedback.blockReason}` };
        }
        lastError = 'empty_candidate';
        continue;
      }

      let parsed;
      try {
        parsed = safeJsonParse(text);
      } catch {
        lastError = 'json_parse';
        continue;
      }

      if (!parsed?.objective || !Array.isArray(parsed?.actions) || !Array.isArray(parsed?.schedule)) {
        lastError = 'invalid_model_shape';
        continue;
      }

      return {
        source: 'gemini',
        fallbackReason: null,
        model,
        riskLevel: parsed.riskLevel ?? 'medium',
        objective: parsed.objective,
        actions: sanitizeActions(parsed.actions),
        schedule: Array.isArray(parsed.schedule) ? parsed.schedule.slice(0, 3) : [],
        motivation: parsed.motivation ?? 'Stay consistent tonight.',
      };
    } catch (error) {
      const message = error?.message ? String(error.message) : 'request_error';
      lastError = `request_or_parse_error:${message.slice(0, 120)}`;
    }
  }

  return { ...buildLocalPlan(input), fallbackReason: lastError };
}
