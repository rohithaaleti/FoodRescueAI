const request = require("supertest");

jest.mock("../config/db", () => ({
    query: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn(),
    sign: jest.fn().mockReturnValue("mocked-jwt-token")
}));

jest.mock("bcrypt", () => ({
    hash: jest.fn().mockResolvedValue("mocked_hashed_password"),
    compare: jest.fn().mockResolvedValue(true)
}));

const db = require("../config/db");
const jwt = require("jsonwebtoken");
const app = require("../server");
const { createNotification } = require("../services/notificationService");
const {
    buildSanitizedAIPayload,
    validateAndFilterAIResponse,
    enhanceRecommendations
} = require("../services/aiRecommendationService");

beforeEach(() => {
    jest.clearAllMocks();
});

describe("Security Audit: Input Length and Bounds Validation", () => {

    // ==========================================
    // 1. Auth Registration Input Length Bounds
    // ==========================================
    describe("POST /api/auth/register", () => {
        test("rejects oversized full_name (> 100 chars) with HTTP 400 and no DB mutation", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "A".repeat(101),
                    email: "valid@example.com",
                    password: "password123",
                    role: "restaurant"
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/full name must not exceed 100 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized email (> 255 chars) with HTTP 400 and no DB mutation", async () => {
            const longLocal = "a".repeat(250);
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Valid User",
                    email: `${longLocal}@example.com`,
                    password: "password123",
                    role: "restaurant"
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/email must not exceed 255 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized password (> 128 chars) with HTTP 400 and no DB mutation", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Valid User",
                    email: "valid@example.com",
                    password: "P".repeat(129),
                    role: "restaurant"
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/password must not exceed 128 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized phone (> 20 chars) with HTTP 400 and no DB mutation", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Valid User",
                    email: "valid@example.com",
                    password: "password123",
                    role: "restaurant",
                    phone: "+123456789012345678901" // 21 chars
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/phone number must not exceed 20 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized organization_name (> 255 chars) with HTTP 400 and no DB mutation", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Valid User",
                    email: "valid@example.com",
                    password: "password123",
                    role: "restaurant",
                    organization_name: "O".repeat(256)
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/organization name must not exceed 255 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized address (> 500 chars) with HTTP 400 and no DB mutation", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "Valid User",
                    email: "valid@example.com",
                    password: "password123",
                    role: "restaurant",
                    address: "A".repeat(501)
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/address must not exceed 500 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("accepts valid registration at exact boundary limits", async () => {
            db.query
                .mockImplementationOnce((sql, params, callback) => callback(null, [])) // email check
                .mockImplementationOnce((sql, params, callback) => callback(null, { insertId: 1 })); // insert

            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    full_name: "B".repeat(100),
                    email: "b".repeat(60) + "@example.com",
                    password: "P".repeat(128),
                    role: "restaurant",
                    phone: "+1234567890123456789", // 20 chars
                    organization_name: "O".repeat(255),
                    address: "A".repeat(500)
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(db.query).toHaveBeenCalledTimes(2);
        });
    });

    // ==========================================
    // 2. Food Donation Input Length Bounds
    // ==========================================
    describe("POST /api/food and PUT /api/food/:id", () => {
        const mockAuth = (role = "restaurant") => {
            jwt.verify.mockReturnValue({ id: 10, role });
        };

        test("POST /api/food rejects oversized food_name (> 200 chars) with HTTP 400", async () => {
            mockAuth();
            const res = await request(app)
                .post("/api/food")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "F".repeat(201),
                    quantity: "50",
                    food_type: "Veg",
                    expiry_time: new Date(Date.now() + 3600000).toISOString(),
                    pickup_address: "123 Main St"
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/food name must not exceed 200 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("POST /api/food rejects oversized food_type (> 50 chars) with HTTP 400", async () => {
            mockAuth();
            const res = await request(app)
                .post("/api/food")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "Fresh Bread",
                    quantity: "50",
                    food_type: "T".repeat(51),
                    expiry_time: new Date(Date.now() + 3600000).toISOString(),
                    pickup_address: "123 Main St"
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/food type must not exceed 50 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("POST /api/food rejects oversized pickup_address (> 500 chars) with HTTP 400", async () => {
            mockAuth();
            const res = await request(app)
                .post("/api/food")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "Fresh Bread",
                    quantity: "50",
                    food_type: "Veg",
                    expiry_time: new Date(Date.now() + 3600000).toISOString(),
                    pickup_address: "P".repeat(501)
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/pickup address must not exceed 500 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("POST /api/food rejects oversized quantity string (> 20 chars or > 1,000,000)", async () => {
            mockAuth();
            const res1 = await request(app)
                .post("/api/food")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "Fresh Bread",
                    quantity: "9".repeat(25),
                    food_type: "Veg",
                    expiry_time: new Date(Date.now() + 3600000).toISOString(),
                    pickup_address: "123 Main St"
                });

            expect(res1.status).toBe(400);
            expect(res1.body.success).toBe(false);
            expect(res1.body.message).toMatch(/quantity/i);

            const res2 = await request(app)
                .post("/api/food")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "Fresh Bread",
                    quantity: 2000000,
                    food_type: "Veg",
                    expiry_time: new Date(Date.now() + 3600000).toISOString(),
                    pickup_address: "123 Main St"
                });

            expect(res2.status).toBe(400);
            expect(res2.body.success).toBe(false);
            expect(res2.body.message).toMatch(/quantity/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("POST /api/food rejects oversized image_url (> 2048 chars)", async () => {
            mockAuth();
            const res = await request(app)
                .post("/api/food")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "Fresh Bread",
                    quantity: "50",
                    food_type: "Veg",
                    expiry_time: new Date(Date.now() + 3600000).toISOString(),
                    pickup_address: "123 Main St",
                    image_url: "https://example.com/" + "i".repeat(2040)
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/image url must not exceed 2048 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("POST /api/food accepts valid boundary values", async () => {
            mockAuth();
            db.query.mockImplementation((sql, params, callback) => callback(null, { insertId: 10 }));

            const res = await request(app)
                .post("/api/food")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "F".repeat(200),
                    quantity: 1000000,
                    food_type: "Veg",
                    expiry_time: new Date(Date.now() + 3600000).toISOString(),
                    pickup_address: "P".repeat(500),
                    image_url: "https://example.com/" + "i".repeat(2000)
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(db.query).toHaveBeenCalledTimes(1);
        });

        test("PUT /api/food/:id rejects oversized update fields with HTTP 400", async () => {
            mockAuth();
            const res = await request(app)
                .put("/api/food/1")
                .set("Authorization", "Bearer valid-token")
                .send({
                    food_name: "U".repeat(201)
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/food name must not exceed 200 characters/i);
            expect(db.query).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 3. NGO Profile Input Length Bounds
    // ==========================================
    describe("PUT /api/ngo/profile", () => {
        const mockAuth = () => {
            jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        };

        test("rejects oversized supported_food_types string (> 255 chars) with HTTP 400 and no DB mutation", async () => {
            mockAuth();
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", "Bearer token")
                .send({
                    max_capacity: 100,
                    supported_food_types: "Veg," + "Other,".repeat(50), // 304 chars
                    max_active_donations: 3,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/supported food types/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized supported_food_types array (> 10 items) with HTTP 400 and no DB mutation", async () => {
            mockAuth();
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", "Bearer token")
                .send({
                    max_capacity: 100,
                    supported_food_types: Array(12).fill("Veg"),
                    max_active_donations: 3,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/supported food types/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized max_capacity (> 1,000,000) with HTTP 400 and no DB mutation", async () => {
            mockAuth();
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", "Bearer token")
                .send({
                    max_capacity: 2000000,
                    supported_food_types: "Veg,Non-Veg",
                    max_active_donations: 3,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/max capacity/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("rejects oversized max_active_donations (> 1,000) with HTTP 400 and no DB mutation", async () => {
            mockAuth();
            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", "Bearer token")
                .send({
                    max_capacity: 100,
                    supported_food_types: "Veg,Non-Veg",
                    max_active_donations: 5000,
                    is_active: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/max active donations/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("accepts valid NGO profile at boundary limits", async () => {
            mockAuth();
            db.query.mockImplementation((sql, params, callback) => callback(null, { affectedRows: 1 }));

            const res = await request(app)
                .put("/api/ngo/profile")
                .set("Authorization", "Bearer token")
                .send({
                    max_capacity: 1000000,
                    supported_food_types: "Veg,Non-Veg,Vegan,Other",
                    max_active_donations: 1000,
                    is_active: 1,
                    latitude: 90.0,
                    longitude: 180.0
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(db.query).toHaveBeenCalledTimes(1);
        });
    });

    // ==========================================
    // 4. Notifications & Pagination Query Bounds
    // ==========================================
    describe("Notifications & Query Parameter Bounds", () => {
        const mockAuth = () => {
            jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        };

        test("GET /api/notifications rejects oversized query parameters with HTTP 400", async () => {
            mockAuth();
            const res1 = await request(app)
                .get("/api/notifications?limit=123456789012345")
                .set("Authorization", "Bearer token");

            expect(res1.status).toBe(400);
            expect(res1.body.error).toMatch(/limit/i);

            const res2 = await request(app)
                .get("/api/notifications?offset=123456789012345")
                .set("Authorization", "Bearer token");

            expect(res2.status).toBe(400);
            expect(res2.body.error).toMatch(/offset/i);

            const res3 = await request(app)
                .get("/api/notifications?offset=2000000")
                .set("Authorization", "Bearer token");

            expect(res3.status).toBe(400);
            expect(res3.body.error).toMatch(/offset/i);

            expect(db.query).not.toHaveBeenCalled();
        });

        test("PUT /api/notifications/:id/read rejects oversized ID with HTTP 400", async () => {
            mockAuth();
            const res = await request(app)
                .put("/api/notifications/9999999999999/read")
                .set("Authorization", "Bearer token");

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/invalid notification id/i);
            expect(db.query).not.toHaveBeenCalled();
        });

        test("createNotification rejects oversized type, title, and message parameters", async () => {
            await expect(createNotification({
                userId: 1,
                type: "T".repeat(51),
                title: "Title",
                message: "Message"
            })).rejects.toThrow(/notification type must not exceed 50 characters/i);

            await expect(createNotification({
                userId: 1,
                type: "ALERT",
                title: "T".repeat(256),
                message: "Message"
            })).rejects.toThrow(/notification title must not exceed 255 characters/i);

            await expect(createNotification({
                userId: 1,
                type: "ALERT",
                title: "Title",
                message: "M".repeat(5001)
            })).rejects.toThrow(/notification message must not exceed 5000 characters/i);

            await expect(createNotification({
                userId: -1,
                type: "ALERT",
                title: "Title",
                message: "Message"
            })).rejects.toThrow(/invalid recipient user id/i);

            expect(db.query).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 5. AI Recommendation Layer Bounds
    // ==========================================
    describe("AI Recommendation Layer Input Bounds", () => {
        test("buildSanitizedAIPayload throws when donation food_type > 100 chars", () => {
            expect(() => {
                buildSanitizedAIPayload({
                    food_type: "X".repeat(101),
                    quantity: 50,
                    expiry_time: new Date().toISOString()
                }, []);
            }).toThrow(/donation food_type exceeds maximum length/i);
        });

        test("buildSanitizedAIPayload clamps candidate NGOs to max 50 items", () => {
            const candidates = Array.from({ length: 80 }, (_, i) => ({
                ngo_id: i + 1,
                organization_name: `NGO #${i + 1}`,
                score: 80,
                distance_km: 5,
                remaining_capacity: 50,
                max_capacity: 100,
                current_active_donations: 1,
                max_active_donations: 3,
                reasons: ["Reason 1"]
            }));

            const payload = buildSanitizedAIPayload({
                food_type: "Veg",
                quantity: 50,
                expiry_time: new Date().toISOString()
            }, candidates);

            expect(payload.candidate_ngos.length).toBe(50);
        });

        test("enhanceRecommendations falls back to deterministic matching when oversized food_type reaches AI layer", async () => {
            const deterministicCandidates = [{
                ngo_id: 10,
                score: 85,
                organization_name: "Helping Hands",
                distance_km: 3.2
            }];

            const maliciousDonation = {
                food_type: "A".repeat(150),
                quantity: 50,
                expiry_time: new Date(Date.now() + 3600000).toISOString()
            };

            const result = await enhanceRecommendations(maliciousDonation, deterministicCandidates, {
                enabled: true,
                apiKey: "mock-key",
                provider: {
                    generateRecommendationExplanation: jest.fn()
                }
            });

            expect(result.enhanced).toBe(false);
            expect(result.summary).toBeNull();
            expect(result.recommendations).toEqual(deterministicCandidates);
        });

        test("validateAndFilterAIResponse rejects oversized AI output summary and reason (> 1000 chars)", () => {
            const candidates = [{ ngo_id: 10 }];

            const oversizedSummaryRes = validateAndFilterAIResponse({
                summary: "S".repeat(1001),
                recommendations: [{ ngo_id: 10, reason: "Good fit", priority: "high" }]
            }, candidates);

            expect(oversizedSummaryRes.valid).toBe(false);
            expect(oversizedSummaryRes.error).toMatch(/summary exceeds maximum allowed length/i);

            const oversizedReasonRes = validateAndFilterAIResponse({
                summary: "Valid summary",
                recommendations: [{ ngo_id: 10, reason: "R".repeat(1001), priority: "high" }]
            }, candidates);

            expect(oversizedReasonRes.valid).toBe(false);
            expect(oversizedReasonRes.error).toMatch(/reason for ngo id 10 exceeds maximum allowed length/i);
        });
    });
});
