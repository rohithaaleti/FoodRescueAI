// Centralized matching weights and thresholds
const DEFAULT_MATCHING_CONFIG = {
    WEIGHTS: {
        DISTANCE: 30,             // Max points for geographic proximity
        EXPIRY_URGENCY: 25,       // Max points for imminent food expiration
        FOOD_COMPATIBILITY: 20,   // Max points for food type match
        REMAINING_CAPACITY: 15,   // Max points for capacity headroom
        WORKLOAD_AVAILABILITY: 10 // Max points for open active donation slots
    },
    DISTANCE_MAX_KM: 50,           // Maximum distance threshold in km (scores 0 beyond this)
    FALLBACK_DISTANCE_SCORE: 15    // Neutral score when coordinates are missing
};

/**
 * Calculates Haversine distance in kilometers between two lat/lon pairs.
 * Returns null if any coordinate is missing or invalid.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (
        lat1 === null || lat1 === undefined ||
        lon1 === null || lon1 === undefined ||
        lat2 === null || lat2 === undefined ||
        lon2 === null || lon2 === undefined
    ) {
        return null;
    }

    const p1 = Number(lat1);
    const l1 = Number(lon1);
    const p2 = Number(lat2);
    const l2 = Number(lon2);

    if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) {
        return null;
    }

    const R = 6371; // Earth radius in km
    const dLat = (p2 - p1) * (Math.PI / 180);
    const dLon = (l2 - l1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1 * (Math.PI / 180)) * Math.cos(p2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
}

/**
 * Determines expiry urgency label, hours remaining, and urgency score.
 */
function calculateExpiryUrgency(expiryTime, now = Date.now()) {
    if (!expiryTime) {
        return { isExpired: true, hoursRemaining: 0, urgencyLabel: "Expired", urgencyScore: 0 };
    }

    const expiryMs = new Date(expiryTime).getTime();
    if (isNaN(expiryMs)) {
        return { isExpired: true, hoursRemaining: 0, urgencyLabel: "Invalid Expiry", urgencyScore: 0 };
    }

    const diffMs = expiryMs - now;
    if (diffMs <= 0) {
        return { isExpired: true, hoursRemaining: 0, urgencyLabel: "Expired", urgencyScore: 0 };
    }

    const hoursRemaining = diffMs / (1000 * 60 * 60);

    if (hoursRemaining <= 6) {
        return { isExpired: false, hoursRemaining, urgencyLabel: "Critical (<6h)", urgencyScore: 25 };
    } else if (hoursRemaining <= 24) {
        return { isExpired: false, hoursRemaining, urgencyLabel: "High (<24h)", urgencyScore: 18 };
    } else {
        return { isExpired: false, hoursRemaining, urgencyLabel: "Standard (>24h)", urgencyScore: 10 };
    }
}

/**
 * Checks if NGO supported food types string/array includes the donation's food type.
 */
function isFoodTypeSupported(supportedFoodTypes, donationFoodType) {
    if (!donationFoodType || typeof donationFoodType !== "string") return false;
    if (!supportedFoodTypes) return false;

    const list = Array.isArray(supportedFoodTypes)
        ? supportedFoodTypes
        : String(supportedFoodTypes).split(",").map(t => t.trim().toLowerCase());

    return list.includes(donationFoodType.trim().toLowerCase());
}

/**
 * Evaluates strict eligibility rules for an NGO receiving a donation.
 */
function checkNGOEligibility(ngo, donation, now = Date.now()) {
    const reasons = [];

    // 1. Donation availability and expiry
    if (!donation || donation.status !== "Available") {
        reasons.push("Donation is not in Available status");
    }

    const urgency = calculateExpiryUrgency(donation ? donation.expiry_time : null, now);
    if (urgency.isExpired) {
        reasons.push("Donation is expired");
    }

    if (!ngo) {
        reasons.push("NGO profile missing");
        return { eligible: false, reasons };
    }

    // 2. Donor self-matching prevention
    if (donation && donation.donor_id && ngo.ngo_id && Number(donation.donor_id) === Number(ngo.ngo_id)) {
        reasons.push("Cannot recommend donor restaurant to itself");
    }

    // 3. NGO profile status
    if (!ngo.is_active) {
        reasons.push("NGO is inactive");
    }

    // 4. Food type compatibility
    if (donation && !isFoodTypeSupported(ngo.supported_food_types, donation.food_type)) {
        reasons.push(`Food type '${donation.food_type}' is not supported by NGO`);
    }

    // 5. NGO capacity
    const donationQty = Number(donation ? donation.quantity : 0);
    const maxCapacity = Number(ngo.max_capacity || 0);
    if (donationQty > maxCapacity) {
        reasons.push(`Donation quantity (${donationQty}) exceeds NGO max capacity (${maxCapacity})`);
    }

    // 6. NGO active workload
    const currentActive = Number(ngo.current_active_donations || 0);
    const maxActive = Number(ngo.max_active_donations || 0);
    if (currentActive >= maxActive) {
        reasons.push(`NGO active donations limit reached (${currentActive}/${maxActive})`);
    }

    return {
        eligible: reasons.length === 0,
        reasons
    };
}

/**
 * Calculates a transparent, deterministic score and human-readable explanation for an NGO.
 */
function scoreNGOForDonation(ngo, donation, config = DEFAULT_MATCHING_CONFIG, now = Date.now()) {
    const weights = config.WEIGHTS;
    const breakdown = {};
    const reasons = [];

    // 1. Distance score
    const distanceKm = calculateHaversineDistance(
        donation.pickup_latitude,
        donation.pickup_longitude,
        ngo.ngo_latitude,
        ngo.ngo_longitude
    );

    if (distanceKm === null) {
        breakdown.distanceScore = config.FALLBACK_DISTANCE_SCORE;
        reasons.push(`Distance score: ${breakdown.distanceScore}/${weights.DISTANCE} pts (Coordinates missing, applied neutral fallback)`);
    } else if (distanceKm <= config.DISTANCE_MAX_KM) {
        const distanceRatio = 1 - (distanceKm / config.DISTANCE_MAX_KM);
        breakdown.distanceScore = Math.round(weights.DISTANCE * distanceRatio * 100) / 100;
        reasons.push(`Distance score: ${breakdown.distanceScore}/${weights.DISTANCE} pts (${distanceKm} km away)`);
    } else {
        breakdown.distanceScore = 0;
        reasons.push(`Distance score: 0/${weights.DISTANCE} pts (Beyond max distance of ${config.DISTANCE_MAX_KM} km)`);
    }

    // 2. Expiry urgency score
    const urgency = calculateExpiryUrgency(donation.expiry_time, now);
    breakdown.urgencyScore = urgency.urgencyScore;
    reasons.push(`Urgency score: ${breakdown.urgencyScore}/${weights.EXPIRY_URGENCY} pts (${urgency.urgencyLabel})`);

    // 3. Food compatibility score
    const isSupported = isFoodTypeSupported(ngo.supported_food_types, donation.food_type);
    breakdown.foodCompatibilityScore = isSupported ? weights.FOOD_COMPATIBILITY : 0;
    reasons.push(`Food type compatibility score: ${breakdown.foodCompatibilityScore}/${weights.FOOD_COMPATIBILITY} pts (${donation.food_type} supported)`);

    // 4. Remaining capacity score
    const donationQty = Number(donation.quantity || 0);
    const maxCapacity = Number(ngo.max_capacity || 1);
    const remainingCapacity = Math.max(0, maxCapacity - donationQty);
    const capacityRatio = maxCapacity > 0 ? remainingCapacity / maxCapacity : 0;
    breakdown.capacityScore = Math.round(weights.REMAINING_CAPACITY * capacityRatio * 100) / 100;
    reasons.push(`Capacity score: ${breakdown.capacityScore}/${weights.REMAINING_CAPACITY} pts (${remainingCapacity} remaining capacity after ${donationQty} meals)`);

    // 5. Workload availability score
    const currentActive = Number(ngo.current_active_donations || 0);
    const maxActive = Number(ngo.max_active_donations || 1);
    const openSlots = Math.max(0, maxActive - currentActive);
    const workloadRatio = maxActive > 0 ? openSlots / maxActive : 0;
    breakdown.workloadScore = Math.round(weights.WORKLOAD_AVAILABILITY * workloadRatio * 100) / 100;
    reasons.push(`Workload score: ${breakdown.workloadScore}/${weights.WORKLOAD_AVAILABILITY} pts (${openSlots}/${maxActive} active slots open)`);

    // Total aggregate score
    const totalScore = Math.round((
        breakdown.distanceScore +
        breakdown.urgencyScore +
        breakdown.foodCompatibilityScore +
        breakdown.capacityScore +
        breakdown.workloadScore
    ) * 100) / 100;

    return {
        ngo_id: ngo.ngo_id,
        organization_name: ngo.organization_name || ngo.full_name,
        distance_km: distanceKm,
        current_active_donations: currentActive,
        max_active_donations: maxActive,
        max_capacity: maxCapacity,
        remaining_capacity: remainingCapacity,
        urgency: {
            label: urgency.urgencyLabel,
            hours_remaining: urgency.hoursRemaining ? Math.round(urgency.hoursRemaining * 10) / 10 : 0
        },
        score: totalScore,
        score_breakdown: breakdown,
        reasons
    };
}

/**
 * Ranks all eligible candidate NGOs for a given donation.
 */
function rankEligibleNGOs(ngos, donation, config = DEFAULT_MATCHING_CONFIG, now = Date.now()) {
    if (!donation || !Array.isArray(ngos)) {
        return [];
    }

    const scoredRecommendations = [];

    for (const ngo of ngos) {
        const eligibility = checkNGOEligibility(ngo, donation, now);
        if (eligibility.eligible) {
            const scored = scoreNGOForDonation(ngo, donation, config, now);
            scoredRecommendations.push(scored);
        }
    }

    // Sort descending by total score
    scoredRecommendations.sort((a, b) => b.score - a.score);

    return scoredRecommendations;
}

/**
 * Service function to retrieve database records and compute recommendations for a donation ID.
 */
function getMatchingNGOsForDonation(donationId, customDb = null, config = DEFAULT_MATCHING_CONFIG, now = Date.now()) {
    const db = customDb || require("../config/db");

    return new Promise((resolve, reject) => {
        const donationSql = `
            SELECT * FROM food_items WHERE id = ?
        `;

        db.query(donationSql, [donationId], (err, donationResult) => {
            if (err) {
                return reject(err);
            }

            if (!donationResult || donationResult.length === 0) {
                return resolve({
                    success: false,
                    message: "Donation not found",
                    recommendations: []
                });
            }

            const donation = donationResult[0];

            if (donation.status !== "Available") {
                return resolve({
                    success: false,
                    message: "Donation is not available for matching",
                    recommendations: []
                });
            }

            const urgency = calculateExpiryUrgency(donation.expiry_time, now);
            if (urgency.isExpired) {
                return resolve({
                    success: false,
                    message: "Donation has expired",
                    recommendations: []
                });
            }

            const ngosSql = `
                SELECT 
                    u.id AS ngo_id,
                    u.full_name,
                    u.email,
                    u.phone,
                    u.organization_name,
                    u.address AS ngo_address,
                    np.user_id,
                    np.latitude AS ngo_latitude,
                    np.longitude AS ngo_longitude,
                    np.max_capacity,
                    np.supported_food_types,
                    np.is_active,
                    np.max_active_donations,
                    (
                        SELECT COUNT(*) 
                        FROM food_items 
                        WHERE accepted_by = u.id 
                          AND status IN ('Reserved', 'Assigned')
                    ) AS current_active_donations
                FROM users u
                JOIN ngo_profiles np ON u.id = np.user_id
                WHERE u.role = 'ngo'
            `;

            db.query(ngosSql, (ngoErr, ngoResult) => {
                if (ngoErr) {
                    return reject(ngoErr);
                }

                const recommendations = rankEligibleNGOs(ngoResult || [], donation, config, now);

                return resolve({
                    success: true,
                    donation_id: donation.id,
                    food_name: donation.food_name,
                    food_type: donation.food_type,
                    quantity: donation.quantity,
                    total_candidates_evaluated: ngoResult ? ngoResult.length : 0,
                    total_eligible_matched: recommendations.length,
                    recommendations
                });
            });
        });
    });
}

module.exports = {
    DEFAULT_MATCHING_CONFIG,
    calculateHaversineDistance,
    calculateExpiryUrgency,
    isFoodTypeSupported,
    checkNGOEligibility,
    scoreNGOForDonation,
    rankEligibleNGOs,
    getMatchingNGOsForDonation
};
