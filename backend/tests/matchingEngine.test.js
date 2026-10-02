jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const {
    DEFAULT_MATCHING_CONFIG,
    calculateHaversineDistance,
    calculateExpiryUrgency,
    isFoodTypeSupported,
    checkNGOEligibility,
    scoreNGOForDonation,
    rankEligibleNGOs,
    getMatchingNGOsForDonation
} = require("../services/matchingService");

describe("Smart NGO Matching Engine - Pure Logic & Unit Tests", () => {
    const fixedNow = new Date("2026-10-03T12:00:00Z").getTime();

    const sampleDonation = {
        id: 101,
        donor_id: 10,
        food_name: "Fresh Rice & Curry",
        food_type: "Veg",
        quantity: 50,
        expiry_time: new Date(fixedNow + 4 * 3600 * 1000).toISOString(), // 4 hours in future (Critical)
        pickup_address: "123 Main St",
        pickup_latitude: 12.9716,
        pickup_longitude: 77.5946,
        status: "Available"
    };

    const sampleNGO = {
        ngo_id: 20,
        user_id: 20,
        full_name: "Community Care Foundation",
        organization_name: "Care Org",
        email: "ngo@care.org",
        phone: "9876543210",
        ngo_address: "456 Hope Ave",
        ngo_latitude: 12.9352,
        ngo_longitude: 77.6245,
        max_capacity: 100,
        supported_food_types: "Veg,Non-Veg,Vegan,Other",
        is_active: 1,
        max_active_donations: 3,
        current_active_donations: 1
    };

    // 1. Haversine Distance Test
    test("calculates Haversine distance accurately between valid coordinates", () => {
        // Distance between Bangalore Center (12.9716, 77.5946) and Koramangala (12.9352, 77.6245) is approx 5.2 - 5.5 km
        const dist = calculateHaversineDistance(12.9716, 77.5946, 12.9352, 77.6245);
        expect(dist).toBeGreaterThan(5);
        expect(dist).toBeLessThan(6);
    });

    // 2. Missing Coordinates Test
    test("handles missing coordinates by returning null without throwing", () => {
        expect(calculateHaversineDistance(null, 77.5946, 12.9352, 77.6245)).toBeNull();
        expect(calculateHaversineDistance(12.9716, undefined, 12.9352, 77.6245)).toBeNull();
        expect(calculateHaversineDistance("invalid", 77.5946, 12.9352, 77.6245)).toBeNull();
    });

    // 3. Expiry Urgency Test
    test("calculates expiry urgency correctly based on time remaining", () => {
        // Critical: <= 6h
        const crit = calculateExpiryUrgency(new Date(fixedNow + 3 * 3600 * 1000).toISOString(), fixedNow);
        expect(crit.isExpired).toBe(false);
        expect(crit.urgencyScore).toBe(25);
        expect(crit.urgencyLabel).toContain("Critical");

        // High: <= 24h
        const high = calculateExpiryUrgency(new Date(fixedNow + 12 * 3600 * 1000).toISOString(), fixedNow);
        expect(high.isExpired).toBe(false);
        expect(high.urgencyScore).toBe(18);

        // Standard: > 24h
        const std = calculateExpiryUrgency(new Date(fixedNow + 48 * 3600 * 1000).toISOString(), fixedNow);
        expect(std.isExpired).toBe(false);
        expect(std.urgencyScore).toBe(10);

        // Expired
        const exp = calculateExpiryUrgency(new Date(fixedNow - 3600 * 1000).toISOString(), fixedNow);
        expect(exp.isExpired).toBe(true);
        expect(exp.urgencyScore).toBe(0);
    });

    // 4. Unsupported Food Type Test
    test("rejects NGO with unsupported food type during eligibility check", () => {
        const nonVegNGO = { ...sampleNGO, supported_food_types: "Non-Veg,Vegan" };
        const result = checkNGOEligibility(nonVegNGO, sampleDonation, fixedNow);
        expect(result.eligible).toBe(false);
        expect(result.reasons.some(r => r.includes("not supported"))).toBe(true);
    });

    // 5. Inactive NGO Test
    test("rejects inactive NGO during eligibility check", () => {
        const inactiveNGO = { ...sampleNGO, is_active: 0 };
        const result = checkNGOEligibility(inactiveNGO, sampleDonation, fixedNow);
        expect(result.eligible).toBe(false);
        expect(result.reasons).toContain("NGO is inactive");
    });

    // 6. Capacity Exceeded Test
    test("rejects NGO if donation quantity exceeds max capacity", () => {
        const smallNGO = { ...sampleNGO, max_capacity: 30 }; // donation quantity is 50
        const result = checkNGOEligibility(smallNGO, sampleDonation, fixedNow);
        expect(result.eligible).toBe(false);
        expect(result.reasons.some(r => r.includes("exceeds NGO max capacity"))).toBe(true);
    });

    // 7. Max Active Donations Exceeded Test
    test("rejects NGO if current active donations reach or exceed max_active_donations", () => {
        const busyNGO = { ...sampleNGO, max_active_donations: 3, current_active_donations: 3 };
        const result = checkNGOEligibility(busyNGO, sampleDonation, fixedNow);
        expect(result.eligible).toBe(false);
        expect(result.reasons.some(r => r.includes("active donations limit reached"))).toBe(true);
    });

    // 8. Donor Self-Matching Prevention
    test("does not recommend donor restaurant to itself", () => {
        const selfNGO = { ...sampleNGO, ngo_id: 10 }; // same as donation.donor_id = 10
        const result = checkNGOEligibility(selfNGO, sampleDonation, fixedNow);
        expect(result.eligible).toBe(false);
        expect(result.reasons).toContain("Cannot recommend donor restaurant to itself");
    });

    // 9. Expired Donation Rejection
    test("rejects expired donation during matching", () => {
        const expiredDonation = {
            ...sampleDonation,
            expiry_time: new Date(fixedNow - 3600 * 1000).toISOString()
        };
        const result = checkNGOEligibility(sampleNGO, expiredDonation, fixedNow);
        expect(result.eligible).toBe(false);
        expect(result.reasons).toContain("Donation is expired");
    });

    // 10. Eligible NGO Returned & Score Calculation
    test("calculates transparent score breakdown and reasons for an eligible NGO", () => {
        const scored = scoreNGOForDonation(sampleNGO, sampleDonation, DEFAULT_MATCHING_CONFIG, fixedNow);

        expect(scored.ngo_id).toBe(20);
        expect(scored.organization_name).toBe("Care Org");
        expect(scored.email).toBeUndefined();
        expect(scored.phone).toBeUndefined();
        expect(scored.address).toBeUndefined();
        expect(scored.ngo_name).toBeUndefined();
        expect(scored.score).toBeGreaterThan(0);
        expect(scored.score_breakdown).toHaveProperty("distanceScore");
        expect(scored.score_breakdown).toHaveProperty("urgencyScore");
        expect(scored.score_breakdown).toHaveProperty("foodCompatibilityScore");
        expect(scored.score_breakdown).toHaveProperty("capacityScore");
        expect(scored.score_breakdown).toHaveProperty("workloadScore");
        expect(scored.reasons.length).toBe(5);
    });

    // 11. Missing Coordinates Score Handling
    test("applies neutral fallback score when coordinates are missing", () => {
        const noCoordDonation = { ...sampleDonation, pickup_latitude: null, pickup_longitude: null };
        const scored = scoreNGOForDonation(sampleNGO, noCoordDonation, DEFAULT_MATCHING_CONFIG, fixedNow);

        expect(scored.distance_km).toBeNull();
        expect(scored.score_breakdown.distanceScore).toBe(DEFAULT_MATCHING_CONFIG.FALLBACK_DISTANCE_SCORE);
        expect(scored.reasons.some(r => r.includes("Coordinates missing, applied neutral fallback"))).toBe(true);
    });

    // 12. Ranking Order Test
    test("ranks NGOs in descending order of score", () => {
        const closeNGO = {
            ...sampleNGO,
            ngo_id: 21,
            full_name: "Close NGO",
            ngo_latitude: 12.9720, // Very close
            ngo_longitude: 77.5950,
            current_active_donations: 0
        };

        const farNGO = {
            ...sampleNGO,
            ngo_id: 22,
            full_name: "Far NGO",
            ngo_latitude: 13.1000, // ~15km away
            ngo_longitude: 77.7000,
            current_active_donations: 2
        };

        const ranked = rankEligibleNGOs([farNGO, closeNGO], sampleDonation, DEFAULT_MATCHING_CONFIG, fixedNow);

        expect(ranked.length).toBe(2);
        expect(ranked[0].ngo_id).toBe(21); // Close NGO first
        expect(ranked[1].ngo_id).toBe(22);
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });
});

describe("getMatchingNGOsForDonation Database Service Method", () => {
    test("returns empty recommendations with message when donation is not found", async () => {
        const mockDb = {
            query: jest.fn((sql, params, cb) => cb(null, []))
        };

        const res = await getMatchingNGOsForDonation(999, mockDb);
        expect(res.success).toBe(false);
        expect(res.message).toBe("Donation not found");
        expect(res.recommendations).toEqual([]);
    });

    test("returns empty recommendations when donation is expired", async () => {
        const expiredDonation = {
            id: 101,
            status: "Available",
            expiry_time: new Date(Date.now() - 3600 * 1000).toISOString()
        };

        const mockDb = {
            query: jest.fn((sql, params, cb) => cb(null, [expiredDonation]))
        };

        const res = await getMatchingNGOsForDonation(101, mockDb);
        expect(res.success).toBe(false);
        expect(res.message).toBe("Donation has expired");
        expect(res.recommendations).toEqual([]);
    });

    test("fetches candidate NGOs and returns ranked recommendations for eligible donation", async () => {
        const availableDonation = {
            id: 101,
            donor_id: 5,
            food_name: "Meals",
            food_type: "Veg",
            quantity: 40,
            expiry_time: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
            status: "Available"
        };

        const candidateNGOs = [
            {
                ngo_id: 30,
                full_name: "Hope NGO",
                email: "hope@ngo.org",
                max_capacity: 100,
                supported_food_types: "Veg,Non-Veg",
                is_active: 1,
                max_active_donations: 3,
                current_active_donations: 0
            }
        ];

        const mockDb = {
            query: jest.fn()
                .mockImplementationOnce((sql, params, cb) => cb(null, [availableDonation]))
                .mockImplementationOnce((sql, cb) => cb(null, candidateNGOs))
        };

        const res = await getMatchingNGOsForDonation(101, mockDb);
        expect(res.success).toBe(true);
        expect(res.total_eligible_matched).toBe(1);
        expect(res.recommendations[0].ngo_id).toBe(30);
    });
});
