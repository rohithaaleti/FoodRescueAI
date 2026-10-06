/**
 * OpenAI / OpenAI-compatible Provider for AI Recommendation Explanations
 */

const { SYSTEM_INSTRUCTION } = require("./geminiProvider");

async function generateRecommendationExplanation(sanitizedPayload, options = {}) {
    const apiKey = options.apiKey || process.env.AI_API_KEY;
    const model = options.model || process.env.AI_MODEL || "gpt-4o-mini";
    const timeoutMs = Number(options.timeoutMs || process.env.AI_TIMEOUT_MS || 5000);
    const baseUrl = options.apiUrl || process.env.AI_API_URL || "https://api.openai.com/v1";

    if (!apiKey) {
        throw new Error("Missing OpenAI API key in configuration");
    }

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const requestBody = {
        model,
        messages: [
            {
                role: "system",
                content: SYSTEM_INSTRUCTION
            },
            {
                role: "user",
                content: `Candidate NGOs & Donation Data:\n<DATA>\n${JSON.stringify(sanitizedPayload, null, 2)}\n</DATA>`
            }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`OpenAI API error (HTTP ${response.status}): ${errorText.substring(0, 300)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("Empty or malformed choice content in OpenAI response");
    }

    try {
        return JSON.parse(content);
    } catch (parseErr) {
        throw new Error(`Failed to parse OpenAI output as JSON: ${parseErr.message}`);
    }
}

module.exports = {
    generateRecommendationExplanation
};
