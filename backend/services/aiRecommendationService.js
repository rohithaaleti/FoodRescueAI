/**
 * AI Recommendation Service for Smart NGO Matching
 * 
 * Provides an AI-assisted explanation and operational recommendation layer
 * strictly on top of the deterministic matching engine.
 * 
 * Architectural Guarantee:
 * - Deterministic matching engine (matchingService.js) is the sole source of truth for eligibility and scoring.
 * - The AI layer cannot bypass eligibility rules or alter scores/ranks.
 * - On any AI error, timeout, or missing configuration, gracefully falls back to deterministic recommendations.
 */

const { getAIProvider } = require("./aiProviders");

/**
 * Builds a sanitized payload containing ONLY structured operational facts.
 * Absolutely NO PII (emails, phone numbers, exact addresses, passwords, tokens) is included.
 */
function buildSanitizedAIPayload(donation, candidateNgos = []) {
    if (!donation) {
        throw new Error("Donation data is required to build AI payload");
    }

    if (donation.food_type && typeof donation.food_type === "string" && donation.food_type.length > 100) {
        throw new Error("Donation food_type exceeds maximum length of 100 characters");
    }

    const firstCandidate = candidateNgos && candidateNgos[0];
    const urgency = firstCandidate?.urgency || {
        label: "Standard",
        hours_remaining: null
    };

    const sanitizedDonation = {
        food_type: typeof donation.food_type === "string" ? donation.food_type.trim() : donation.food_type,
        quantity: donation.quantity,
        expiry_time: donation.expiry_time,
        urgency: {
            label: urgency.label,
            hours_remaining: urgency.hours_remaining
        }
    };

    const boundedCandidates = (candidateNgos || []).slice(0, 50);

    const sanitizedNgos = boundedCandidates.map(ngo => {
        const orgName = ngo.organization_name || ngo.ngo_name || `NGO #${ngo.ngo_id}`;
        if (typeof orgName === "string" && orgName.length > 255) {
            throw new Error(`Candidate NGO ${ngo.ngo_id} organization_name exceeds 255 characters`);
        }

        return {
            ngo_id: ngo.ngo_id,
            organization_name: orgName,
            score: ngo.score,
            distance_km: ngo.distance_km,
            remaining_capacity: ngo.remaining_capacity,
            max_capacity: ngo.max_capacity,
            current_active_donations: ngo.current_active_donations,
            max_active_donations: ngo.max_active_donations,
            deterministic_reasons: Array.isArray(ngo.reasons) ? ngo.reasons.slice(0, 10).map(r => String(r).slice(0, 200)) : []
        };
    });

    return {
        donation: sanitizedDonation,
        candidate_ngos: sanitizedNgos
    };
}

/**
 * Validates the structured output from the AI provider.
 * Strictly verifies that the AI references ONLY NGOs that are part of the candidate list.
 * If any unknown NGO is referenced or structure is invalid, the output is rejected.
 */
function validateAndFilterAIResponse(aiOutput, candidateNgos = []) {
    if (!aiOutput || typeof aiOutput !== "object") {
        return { valid: false, error: "AI output is not a valid JSON object" };
    }

    if (!Array.isArray(aiOutput.recommendations)) {
        return { valid: false, error: "AI output is missing recommendations array" };
    }

    if (aiOutput.recommendations.length > 50) {
        return { valid: false, error: "AI output recommendations array exceeds maximum allowed length of 50 items" };
    }

    if (aiOutput.summary && typeof aiOutput.summary === "string" && aiOutput.summary.length > 1000) {
        return { valid: false, error: "AI output summary exceeds maximum allowed length of 1000 characters" };
    }

    const candidateIdSet = new Set(candidateNgos.map(n => Number(n.ngo_id)));

    const validatedRecommendations = [];

    for (const item of aiOutput.recommendations) {
        if (!item || typeof item !== "object") {
            return { valid: false, error: "Malformed item in AI recommendations array" };
        }

        const ngoId = Number(item.ngo_id);
        if (isNaN(ngoId) || !candidateIdSet.has(ngoId)) {
            // Rule 4: If the AI mentions an NGO not present in candidate list, discard/reject that AI output.
            return {
                valid: false,
                error: `AI output referenced an unknown or non-candidate NGO ID: ${item.ngo_id}`
            };
        }

        if (typeof item.reason !== "string" || !item.reason.trim()) {
            return { valid: false, error: `Missing or empty reason for NGO ID ${item.ngo_id}` };
        }

        if (item.reason.length > 1000) {
            return { valid: false, error: `AI output reason for NGO ID ${item.ngo_id} exceeds maximum allowed length of 1000 characters` };
        }

        let priority = "medium";
        if (item.priority && ["high", "medium", "low"].includes(String(item.priority).toLowerCase())) {
            priority = String(item.priority).toLowerCase();
        }

        validatedRecommendations.push({
            ngo_id: ngoId,
            reason: item.reason.trim(),
            priority
        });
    }

    return {
        valid: true,
        data: {
            summary: typeof aiOutput.summary === "string" ? aiOutput.summary.trim() : null,
            recommendations: validatedRecommendations
        }
    };
}

/**
 * Merges validated AI contextual explanations with the authoritative deterministic recommendations.
 * Keeps deterministic scores, rankings, distance, and reasons unchanged.
 */
function mergeAIWithDeterministicRecommendations(deterministicRecommendations, aiData) {
    if (!aiData || !Array.isArray(aiData.recommendations)) {
        return {
            enhanced: false,
            summary: null,
            recommendations: deterministicRecommendations
        };
    }

    const aiLookup = new Map();
    for (const item of aiData.recommendations) {
        aiLookup.set(Number(item.ngo_id), item);
    }

    const enhancedRecommendations = deterministicRecommendations.map(ngo => {
        const aiMatch = aiLookup.get(Number(ngo.ngo_id));
        return {
            ...ngo,
            ai_explanation: aiMatch ? aiMatch.reason : null,
            ai_priority: aiMatch ? aiMatch.priority : null
        };
    });

    return {
        enhanced: true,
        summary: aiData.summary || null,
        recommendations: enhancedRecommendations
    };
}

/**
 * Main entrypoint to enhance deterministic recommendations with AI contextual insights.
 * 
 * Safe Fallback Guarantee:
 * Never throws an error to the caller. Returns deterministic recommendations if AI is disabled,
 * unconfigured, times out, or fails.
 */
async function enhanceRecommendations(donation, deterministicRecommendations, customOptions = {}) {
    // If no candidate NGOs, return as-is
    if (!Array.isArray(deterministicRecommendations) || deterministicRecommendations.length === 0) {
        return {
            enhanced: false,
            summary: null,
            recommendations: deterministicRecommendations || []
        };
    }

    const isEnabled = customOptions.enabled ?? (process.env.AI_ENABLED !== "false");
    const providerName = customOptions.providerName || process.env.AI_PROVIDER || "gemini";
    const apiKey = customOptions.apiKey ?? process.env.AI_API_KEY;

    // If disabled or missing API key (and not using mock provider), skip AI safely
    if (!isEnabled || (!apiKey && providerName.toLowerCase() !== "mock")) {
        return {
            enhanced: false,
            summary: null,
            recommendations: deterministicRecommendations
        };
    }

    try {
        const sanitizedPayload = buildSanitizedAIPayload(donation, deterministicRecommendations);
        const provider = customOptions.provider || getAIProvider(providerName);

        const rawOutput = await provider.generateRecommendationExplanation(sanitizedPayload, {
            apiKey,
            ...customOptions
        });

        const validation = validateAndFilterAIResponse(rawOutput, deterministicRecommendations);

        if (!validation.valid) {
            console.warn(`[AI Service Warning] Discarding AI response: ${validation.error}. Falling back to deterministic matching.`);
            return {
                enhanced: false,
                summary: null,
                recommendations: deterministicRecommendations
            };
        }

        return mergeAIWithDeterministicRecommendations(deterministicRecommendations, validation.data);
    } catch (err) {
        console.warn(`[AI Service Warning] AI generation failed (${err.message}). Falling back to deterministic matching.`);
        return {
            enhanced: false,
            summary: null,
            recommendations: deterministicRecommendations
        };
    }
}

module.exports = {
    buildSanitizedAIPayload,
    validateAndFilterAIResponse,
    mergeAIWithDeterministicRecommendations,
    enhanceRecommendations
};
