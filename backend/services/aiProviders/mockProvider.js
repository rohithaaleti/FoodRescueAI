/**
 * Mock Provider for local development, offline runs, and automated testing
 */

async function generateRecommendationExplanation(sanitizedPayload, options = {}) {
    const donation = sanitizedPayload.donation || {};
    const candidateNgos = sanitizedPayload.candidate_ngos || [];

    const summary = `Found ${candidateNgos.length} qualified NGO candidate(s) for ${donation.quantity || 0} meals of ${donation.food_type || "food"}.`;

    const recommendations = candidateNgos.map((ngo, index) => {
        const priority = index === 0 ? "high" : (index === 1 ? "medium" : "low");
        const distanceText = ngo.distance_km != null ? `${ngo.distance_km} km away` : "proximity verified";
        return {
            ngo_id: ngo.ngo_id,
            reason: `${ngo.organization_name} is ${distanceText} with capacity for ${ngo.remaining_capacity} additional meals and ${ngo.max_active_donations - ngo.current_active_donations} open delivery slots.`,
            priority
        };
    });

    return {
        summary,
        recommendations
    };
}

module.exports = {
    generateRecommendationExplanation
};
