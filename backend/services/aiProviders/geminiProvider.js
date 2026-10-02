/**
 * Google Gemini Provider for AI Recommendation Explanations
 */

const SYSTEM_INSTRUCTION = `You are an AI assistant for FoodRescueAI, a food donation matching platform.
You are given structured facts about an available food donation and a list of deterministically pre-qualified, ranked NGO candidates.

Your role:
1. Provide a concise, high-level summary of the matching situation.
2. For each candidate NGO in the provided list, provide a brief, contextual explanation of why they are well-suited for this donation based ONLY on the provided facts (distance, expiry urgency, remaining capacity, food compatibility, workload).
3. Assign an operational contact priority ("high", "medium", "low") for each candidate NGO.

CRITICAL RULES:
- You must ONLY reference the exact NGO IDs provided in the candidate list.
- NEVER invent, suggest, or add new NGOs.
- NEVER invent distance, capacity, or workload numbers.
- Do NOT alter any eligibility determinations or scores.
- Return ONLY a valid JSON object with the following schema:
{
  "summary": "Brief overall summary",
  "recommendations": [
    {
      "ngo_id": 123,
      "reason": "Contextual reason for this specific NGO",
      "priority": "high"
    }
  ]
}`;

async function generateRecommendationExplanation(sanitizedPayload, options = {}) {
    const apiKey = options.apiKey || process.env.AI_API_KEY;
    const model = options.model || process.env.AI_MODEL || "gemini-1.5-flash";
    const timeoutMs = Number(options.timeoutMs || process.env.AI_TIMEOUT_MS || 5000);
    const baseUrl = options.apiUrl || "https://generativelanguage.googleapis.com/v1beta";

    if (!apiKey) {
        throw new Error("Missing Gemini API key in configuration");
    }

    const endpoint = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `${SYSTEM_INSTRUCTION}\n\nStructured Data:\n${JSON.stringify(sanitizedPayload, null, 2)}`
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Gemini API error (HTTP ${response.status}): ${errorText.substring(0, 300)}`);
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("Empty or malformed candidate content in Gemini response");
    }

    try {
        return JSON.parse(text);
    } catch (parseErr) {
        throw new Error(`Failed to parse Gemini output as JSON: ${parseErr.message}`);
    }
}

module.exports = {
    SYSTEM_INSTRUCTION,
    generateRecommendationExplanation
};
