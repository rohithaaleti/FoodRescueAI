process.env.JWT_SECRET = "testsecret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const db = require("../config/db");
const app = require("../server");

describe("NGO Profile API", () => {
    const ngoToken = jwt.sign({ id: 5, role: "ngo" }, process.env.JWT_SECRET);
    const nonNgoToken = jwt.sign({ id: 6, role: "restaurant" }, process.env.JWT_SECRET);

    beforeEach(() => {
        db.query.mockReset();
    });

    describe("GET /api/ngo/profile", () => {
        test("returns existing profile data for authenticated NGO", async () => {
            const mockDbRow = {
                user_id: 5,
                full_name: "Community Food Bank",
                email: "info@cfb.org",
                phone: "+1-555-1234",
                organization_name: "Community Food Bank Org",
                address: "100 Kindness Way",
                profile_id: 1,
                latitude: 12.9716,
                longitude: 77.5946,
                max_capacity: 250,
                supported_food_types: "Veg,Non-Veg",
                is_active: 1,
                max_active_donations: 5,
                updated_at: "2026-10-01T12:00:00.000Z"
            };

            db.query.mockImplementation((sql, params, cb) => {
                cb(null, [mockDbRow]);
            });

            const res = await request(app)
                .get("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.profile).toEqual({
                user_id: 5,
                full_name: "Community Food Bank",
                email: "info@cfb.org",
                phone: "+1-555-1234",
                organization_name: "Community Food Bank Org",
                address: "100 Kindness Way",
                latitude: 12.9716,
                longitude: 77.5946,
                max_capacity: 250,
                supported_food_types: "Veg,Non-Veg",
                is_active: 1,
                max_active_donations: 5,
                updated_at: "2026-10-01T12:00:00.000Z"
            });
        });

        test("returns default profile values if no profile record exists yet", async () => {
            const mockDbRow = {
                user_id: 5,
                full_name: "New NGO",
                email: "new@ngo.org",
                phone: null,
                organization_name: "New NGO Org",
                address: null,
                profile_id: null,
                latitude: null,
                longitude: null,
                max_capacity: null,
                supported_food_types: null,
                is_active: null,
                max_active_donations: null,
                updated_at: null
            };

            db.query.mockImplementation((sql, params, cb) => {
                cb(null, [mockDbRow]);
            });

            const res = await request(app)
                .get("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.profile.max_capacity).toBe(100);
            expect(res.body.profile.max_active_donations).toBe(3);
            expect(res.body.profile.is_active).toBe(1);
            expect(res.body.profile.supported_food_types).toBe("Veg,Non-Veg,Vegan,Other");
            expect(res.body.profile.latitude).toBeNull();
            expect(res.body.profile.longitude).toBeNull();
        });

        test("returns 403 for non-NGO users", async () => {
            const res = await request(app)
                .get("/api/ngo/profile")
                .set("Authorization", `Bearer ${nonNgoToken}`);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        test("returns 401 for unauthenticated requests", async () => {
            const res = await request(app).get("/api/ngo/profile");
            expect(res.status).toBe(401);
        });
    });

    describe("PUT /api/ngo/profile", () => {
        test("successfully updates profile with valid data", async () => {
            db.query.mockImplementation((sql, params, cb) => {
                cb(null, { affectedRows: 1 });
            });

            const payload = {
                max_capacity: 150,
                supported_food_types: ["Veg", "Vegan"],
                max_active_donations: 4,
                is_active: 1,
                latitude: 12.92,
                longitude: 77.61
            };

            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`)
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.profile).toEqual({
                user_id: 5,
                latitude: 12.92,
                longitude: 77.61,
                max_capacity: 150,
                supported_food_types: "Veg,Vegan",
                is_active: 1,
                max_active_donations: 4
            });
        });

        test("rejects invalid max_capacity <= 0", async () => {
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`)
                .send({
                    max_capacity: 0,
                    supported_food_types: "Veg",
                    max_active_donations: 3,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/max capacity/i);
        });

        test("rejects invalid max_active_donations <= 0", async () => {
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`)
                .send({
                    max_capacity: 100,
                    supported_food_types: "Veg",
                    max_active_donations: -1,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/max active donations/i);
        });

        test("rejects invalid latitude outside [-90, 90]", async () => {
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`)
                .send({
                    max_capacity: 100,
                    supported_food_types: "Veg",
                    max_active_donations: 3,
                    is_active: 1,
                    latitude: 95.5
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/latitude/i);
        });

        test("rejects invalid longitude outside [-180, 180]", async () => {
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`)
                .send({
                    max_capacity: 100,
                    supported_food_types: "Veg",
                    max_active_donations: 3,
                    is_active: 1,
                    longitude: -195.0
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/longitude/i);
        });

        test("rejects invalid supported_food_types", async () => {
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`)
                .send({
                    max_capacity: 100,
                    supported_food_types: "FastFood,Junk",
                    max_active_donations: 3,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid food types/i);
        });

        test("rejects empty supported_food_types", async () => {
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", `Bearer ${ngoToken}`)
                .send({
                    max_capacity: 100,
                    supported_food_types: [],
                    max_active_donations: 3,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/at least one supported food type/i);
        });
    });
});
