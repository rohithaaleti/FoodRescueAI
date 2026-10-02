/**
 * Provider Factory for AI Recommendation Explanations
 */

const geminiProvider = require("./geminiProvider");
const openaiProvider = require("./openaiProvider");
const mockProvider = require("./mockProvider");

function getAIProvider(providerName = process.env.AI_PROVIDER || "gemini") {
    const normalized = String(providerName).trim().toLowerCase();

    switch (normalized) {
        case "gemini":
            return geminiProvider;
        case "openai":
            return openaiProvider;
        case "mock":
            return mockProvider;
        default:
            throw new Error(`Unsupported AI provider: ${providerName}. Supported providers: gemini, openai, mock.`);
    }
}

module.exports = {
    getAIProvider
};
