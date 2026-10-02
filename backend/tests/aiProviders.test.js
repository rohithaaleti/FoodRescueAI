const { getAIProvider } = require("../services/aiProviders");
const geminiProvider = require("../services/aiProviders/geminiProvider");
const openaiProvider = require("../services/aiProviders/openaiProvider");
const mockProvider = require("../services/aiProviders/mockProvider");

describe("AI Providers Interface & Unit Tests", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    const samplePayload = {
        donation: {
            food_type: "Veg",
            quantity: 30,
            expiry_time: "2026-10-03T20:00:00.000Z",
            urgency: { label: "High (<24h)", hours_remaining: 8 }
        },
        candidate_ngos: [
            {
                ngo_id: 10,
                organization_name: "Feed All Org",
                score: 85,
                distance_km: 3.2,
                remaining_capacity: 50,
                max_capacity: 80,
                current_active_donations: 0,
                max_active_donations: 3,
                deterministic_reasons: ["Nearby"]
            }
        ]
    };

    // 1. Factory tests
    test("getAIProvider returns expected provider modules", () => {
        expect(getAIProvider("gemini")).toBe(geminiProvider);
        expect(getAIProvider("openai")).toBe(openaiProvider);
        expect(getAIProvider("mock")).toBe(mockProvider);
        expect(() => getAIProvider("unsupported")).toThrow("Unsupported AI provider");
    });

    // 2. Mock Provider
    test("mockProvider generates structured explanations matching candidate NGOs", async () => {
        const result = await mockProvider.generateRecommendationExplanation(samplePayload);
        expect(result.summary).toContain("Found 1 qualified NGO candidate");
        expect(result.recommendations.length).toBe(1);
        expect(result.recommendations[0].ngo_id).toBe(10);
        expect(result.recommendations[0].priority).toBe("high");
        expect(result.recommendations[0].reason).toContain("Feed All Org");
    });

    // 3. Gemini Provider - missing API key
    test("geminiProvider throws error when API key is missing", async () => {
        await expect(
            geminiProvider.generateRecommendationExplanation(samplePayload, { apiKey: "" })
        ).rejects.toThrow("Missing Gemini API key");
    });

    // 4. Gemini Provider - successful API response
    test("geminiProvider parses valid Gemini response successfully", async () => {
        const mockGeminiResponse = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    summary: "Good match",
                                    recommendations: [{ ngo_id: 10, reason: "Close proximity", priority: "high" }]
                                })
                            }
                        ]
                    }
                }
            ]
        };

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockGeminiResponse
        });

        const result = await geminiProvider.generateRecommendationExplanation(samplePayload, {
            apiKey: "dummy-key",
            model: "gemini-1.5-flash"
        });

        expect(result.summary).toBe("Good match");
        expect(result.recommendations[0].ngo_id).toBe(10);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("models/gemini-1.5-flash:generateContent?key=dummy-key"),
            expect.objectContaining({ method: "POST" })
        );
    });

    // 5. Gemini Provider - HTTP error
    test("geminiProvider throws descriptive error on non-OK response", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 403,
            text: async () => "API key expired"
        });

        await expect(
            geminiProvider.generateRecommendationExplanation(samplePayload, { apiKey: "bad-key" })
        ).rejects.toThrow("Gemini API error (HTTP 403): API key expired");
    });

    // 6. OpenAI Provider - missing API key
    test("openaiProvider throws error when API key is missing", async () => {
        await expect(
            openaiProvider.generateRecommendationExplanation(samplePayload, { apiKey: "" })
        ).rejects.toThrow("Missing OpenAI API key");
    });

    // 7. OpenAI Provider - successful API response
    test("openaiProvider parses valid OpenAI response successfully", async () => {
        const mockOpenAIResponse = {
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            summary: "OpenAI summary",
                            recommendations: [{ ngo_id: 10, reason: "Ready to accept", priority: "high" }]
                        })
                    }
                }
            ]
        };

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockOpenAIResponse
        });

        const result = await openaiProvider.generateRecommendationExplanation(samplePayload, {
            apiKey: "openai-key",
            model: "gpt-4o-mini"
        });

        expect(result.summary).toBe("OpenAI summary");
        expect(result.recommendations[0].ngo_id).toBe(10);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/chat/completions"),
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    Authorization: "Bearer openai-key"
                })
            })
        );
    });

    // 8. OpenAI Provider - HTTP error
    test("openaiProvider throws descriptive error on non-OK response", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 429,
            text: async () => "Rate limit reached"
        });

        await expect(
            openaiProvider.generateRecommendationExplanation(samplePayload, { apiKey: "key" })
        ).rejects.toThrow("OpenAI API error (HTTP 429): Rate limit reached");
    });
});
