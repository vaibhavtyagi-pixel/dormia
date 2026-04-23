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
    motivation:
      streak === 0
        ? 'One night is enough to restart your climb.'
        : 'Protect tonight and you keep the streak compounding.',
  };
}

export async function generateCoachPlan(input) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return buildLocalPlan(input);
  }

  const prompt = `
You are a sleep performance coach for a gamified app.
Return ONLY valid JSON with keys:
objective (string),
riskLevel ("low"|"medium"|"high"),
actions (array of 3 short strings),
motivation (string).

User data:
- streak: ${input.streak}
- sleepTargetHours: ${input.sleepTargetHours}
- gapXp: ${input.gapXp}
- nightsToClose: ${input.nightsToClose}
  `.trim();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      return buildLocalPlan(input);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(text);

    if (!parsed?.objective || !Array.isArray(parsed?.actions)) {
      return buildLocalPlan(input);
    }

    return {
      source: 'gemini',
      riskLevel: parsed.riskLevel ?? 'medium',
      objective: parsed.objective,
      actions: parsed.actions.slice(0, 3),
      motivation: parsed.motivation ?? 'Stay consistent tonight.',
    };
  } catch {
    return buildLocalPlan(input);
  }
}

