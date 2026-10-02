const request = require("supertest");

// Mock dependencies
jest.mock("../config/db", () => ({
    query: jest.fn()
}));

jest.mock("../services/matchingService", () => ({
    getMatchingNGOsForDonation: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

const db = require("../config/db");
const matchingService = require("../services/matchingService");
const jwt = require("jsonwebtoken");
const app = require("../server");

describe("GET /api/ngo/recommendations/:foodId", () => {
    beforeEach(() => {
        db.query.mockReset();
        matchingService.getMatchingNGOsForDonation.mockReset();
        jwt.verify.mockReset();
    });

    const mockAuth = (role = "ngo") => {
        jwt.verify.mockReturnValue({ id: 1, role });
    };

    test("rejects unauthenticated requests", async () => {
        const res = await request(app).get("/api/ngo/recommendations/1");
        expect(res.status).toBe(401);
    });

    test("rejects non-NGO roles", async () => {
        mockAuth("restaurant");
        const res = await request(app)
            .get("/api/ngo/recommendations/1")
            .set("Authorization", "Bearer fake-token");
        expect(res.status).toBe(403);
    });

    test("rejects invalid foodId", async () => {
        mockAuth("ngo");
        const res = await request(app)
            .get("/api/ngo/recommendations/abc")
            .set("Authorization", "Bearer fake-token");
        
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid donation ID.");
    });

    test("returns 500 on database error", async () => {
        mockAuth("ngo");
        db.query.mockImplementation((sql, params, cb) => cb(new Error("DB error"), null));

        const res = await request(app)
            .get("/api/ngo/recommendations/1")
            .set("Authorization", "Bearer fake-token");

        expect(res.status).toBe(500);
    });

    test("returns 404 if donation does not exist", async () => {
        mockAuth("ngo");
        db.query.mockImplementation((sql, params, cb) => cb(null, []));

        const res = await request(app)
            .get("/api/ngo/recommendations/99")
            .set("Authorization", "Bearer fake-token");

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Donation not found");
    });

    test("returns 400 if donation is not Available", async () => {
        mockAuth("ngo");
        db.query.mockImplementation((sql, params, cb) => cb(null, [{
            id: 1,
            status: "Reserved",
            expiry_time: new Date(Date.now() + 100000).toISOString()
        }]));

        const res = await request(app)
            .get("/api/ngo/recommendations/1")
            .set("Authorization", "Bearer fake-token");

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Donation is not available");
    });

    test("returns 400 if donation is expired", async () => {
        mockAuth("ngo");
        db.query.mockImplementation((sql, params, cb) => cb(null, [{
            id: 1,
            status: "Available",
            expiry_time: new Date(Date.now() - 100000).toISOString() // expired
        }]));

        const res = await request(app)
            .get("/api/ngo/recommendations/1")
            .set("Authorization", "Bearer fake-token");

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Donation has expired");
    });

    test("returns 500 if matching service fails", async () => {
        mockAuth("ngo");
        db.query.mockImplementation((sql, params, cb) => cb(null, [{
            id: 1,
            status: "Available",
            expiry_time: new Date(Date.now() + 100000).toISOString()
        }]));

        matchingService.getMatchingNGOsForDonation.mockRejectedValue(new Error("Service error"));

        const res = await request(app)
            .get("/api/ngo/recommendations/1")
            .set("Authorization", "Bearer fake-token");

        expect(res.status).toBe(500);
    });

    test("returns successful recommendations shape", async () => {
        mockAuth("ngo");
        
        const validDonation = {
            id: 1,
            food_name: "Test Food",
            food_type: "Veg",
            quantity: 10,
            expiry_time: new Date(Date.now() + 100000).toISOString(),
            status: "Available"
        };
        
        db.query.mockImplementation((sql, params, cb) => cb(null, [validDonation]));

        const mockRecommendations = [
            { ngo_id: 2, score: 90, reasons: ["Good match"] }
        ];

        matchingService.getMatchingNGOsForDonation.mockResolvedValue({
            recommendations: mockRecommendations
        });

        const res = await request(app)
            .get("/api/ngo/recommendations/1")
            .set("Authorization", "Bearer fake-token");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.id).toBe(1);
        expect(res.body.food_name).toBe("Test Food");
        expect(res.body.food_type).toBe("Veg");
        expect(res.body.quantity).toBe(10);
        expect(res.body.expiry_time).toBe(validDonation.expiry_time);
        expect(res.body.recommendations).toEqual(mockRecommendations);

        expect(matchingService.getMatchingNGOsForDonation).toHaveBeenCalledWith(1);
    });
});
