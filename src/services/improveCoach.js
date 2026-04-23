function buildLocalPlan({ streak, sleepTargetHours, gapXp, nightsToClose }) {
  const riskLevel = streak === 0 ? 'high' : streak < 4 ? 'medium' : 'low';
  return {
    source: 'local',
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
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(cleaned);
}

export async function generateCoachPlan(input) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return buildLocalPlan(input);
  }

  const prompt = `
You are an elite sleep performance coach for a gamified app.
Return ONLY valid JSON with keys:
objective (string),
riskLevel ("low"|"medium"|"high"),
actions (array of 5-7 short strings),
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
  `.trim();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6 },
        }),
      }
    );

    if (!response.ok) {
      return buildLocalPlan(input);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = safeJsonParse(text);

    if (!parsed?.objective || !Array.isArray(parsed?.actions)) {
      return buildLocalPlan(input);
    }

    return {
      source: 'gemini',
      riskLevel: parsed.riskLevel ?? 'medium',
      objective: parsed.objective,
      actions: parsed.actions.slice(0, 7),
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule.slice(0, 3) : [],
      motivation: parsed.motivation ?? 'Stay consistent tonight.',
    };
  } catch {
    return buildLocalPlan(input);
  }
}

