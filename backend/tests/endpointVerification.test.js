process.env.AI_PROVIDER = "mock";
process.env.AI_ENABLED = "true";
process.env.JWT_SECRET = "testsecret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock DB
jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const db = require("../config/db");
const app = require("../server");

describe("E2E Verification: GET /api/ngo/recommendations/:foodId with Mock AI Provider", () => {
    test("captures realistic successful response shape from running backend", async () => {
        const token = jwt.sign({ id: 5, role: "ngo" }, process.env.JWT_SECRET);

        const validDonation = {
            id: 101,
            donor_id: 10,
            food_name: "Fresh Veg Biryani",
            food_type: "Veg",
            quantity: 50,
            expiry_time: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
            pickup_latitude: 12.9716,
            pickup_longitude: 77.5946,
            status: "Available"
        };

        const candidateNGOs = [
            {
                ngo_id: 20,
                user_id: 20,
                full_name: "John Doe",
                organization_name: "Community Care Foundation",
                email: "john@care.org",
                phone: "+1-555-0199",
                ngo_address: "123 Hope St",
                ngo_latitude: 12.9352,
                ngo_longitude: 77.6245,
                max_capacity: 100,
                supported_food_types: "Veg,Non-Veg",
                is_active: 1,
                max_active_donations: 3,
                current_active_donations: 1
            },
            {
                ngo_id: 30,
                user_id: 30,
                full_name: "Jane Smith",
                organization_name: "Hope Food Relief",
                email: "jane@hope.org",
                phone: "+1-555-0288",
                ngo_address: "456 Kindness Ave",
                ngo_latitude: 12.9100,
                ngo_longitude: 77.6000,
                max_capacity: 80,
                supported_food_types: "Veg",
                is_active: 1,
                max_active_donations: 2,
                current_active_donations: 0
            }
        ];

        db.query.mockImplementation((sql, params, cb) => {
            if (typeof params === "function") {
                cb = params;
                params = [];
            }
            if (sql.includes("FROM food_items WHERE id = ?")) {
                return cb(null, [validDonation]);
            }
            if (sql.includes("FROM users u")) {
                return cb(null, candidateNGOs);
            }
            return cb(null, []);
        });

        const res = await request(app)
            .get("/api/ngo/recommendations/101")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.ai_summary).toBeDefined();
        expect(res.body.recommendations.length).toBe(2);

        // Verify AI enhanced fields
        expect(res.body.recommendations[0].ai_explanation).toBeDefined();
        expect(res.body.recommendations[0].ai_priority).toBe("high");

        // Verify PII fields are strictly absent
        expect(res.body.recommendations[0].email).toBeUndefined();
        expect(res.body.recommendations[0].phone).toBeUndefined();
        expect(res.body.recommendations[0].address).toBeUndefined();
        expect(res.body.recommendations[0].ngo_name).toBeUndefined();

        // Verify required fields remain present
        expect(res.body.recommendations[0].ngo_id).toBeDefined();
        expect(res.body.recommendations[0].organization_name).toBeDefined();
        expect(res.body.recommendations[0].score).toBeDefined();
        expect(res.body.recommendations[0].score_breakdown).toBeDefined();
        expect(res.body.recommendations[0].distance_km).toBeDefined();
        expect(res.body.recommendations[0].current_active_donations).toBeDefined();
        expect(res.body.recommendations[0].max_active_donations).toBeDefined();
        expect(res.body.recommendations[0].max_capacity).toBeDefined();
        expect(res.body.recommendations[0].remaining_capacity).toBeDefined();
        expect(res.body.recommendations[0].urgency).toBeDefined();
        expect(res.body.recommendations[0].reasons).toBeDefined();

        // Print response JSON for documentation capture
        console.log("=== REALISTIC SUCCESSFUL ENDPOINT RESPONSE ===");
        console.log(JSON.stringify(res.body, null, 2));
    });
});
