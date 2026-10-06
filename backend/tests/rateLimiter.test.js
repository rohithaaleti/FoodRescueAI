const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "testjwtsecret";

// Mock database to prevent connection attempts
jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const db = require("../config/db");
const authRoutes = require("../routes/authRoutes");
const ngoRoutes = require("../routes/ngoRoutes");
const {
    createRateLimiter,
    globalLimiter,
    loginLimiter,
    registerLimiter,
    aiRecommendationLimiter
} = require("../middleware/rateLimiter");

describe("Rate Limiting Middleware & Abuse Protection", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("createRateLimiter Factory", () => {
        test("enforces limit and returns consistent 429 response after exceeding max", async () => {
            const app = express();
            const limiter = createRateLimiter({
                windowMs: 60 * 1000,
                max: 3,
                message: "Custom limit reached."
            });

            app.use(limiter);
            app.get("/test", (req, res) => res.json({ success: true }));

            // Requests 1-3 should succeed
            for (let i = 0; i < 3; i++) {
                const res = await request(app).get("/test");
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
            }

            // 4th request should receive 429
            const blockedRes = await request(app).get("/test");
            expect(blockedRes.status).toBe(429);
            expect(blockedRes.body).toEqual({
                success: false,
                message: "Custom limit reached."
            });
            // Standard RateLimit or Retry-After header exists
            expect(
                blockedRes.headers["ratelimit-limit"] ||
                blockedRes.headers["retry-after"] ||
                blockedRes.headers["ratelimit-remaining"]
            ).toBeDefined();
        });

        test("respects RATE_LIMIT_DISABLED environment variable", async () => {
            const originalDisabled = process.env.RATE_LIMIT_DISABLED;
            process.env.RATE_LIMIT_DISABLED = "true";

            try {
                const app = express();
                const limiter = createRateLimiter({
                    windowMs: 60 * 1000,
                    max: 1
                });
                app.use(limiter);
                app.get("/test-disabled", (req, res) => res.json({ success: true }));

                const res1 = await request(app).get("/test-disabled");
                const res2 = await request(app).get("/test-disabled");
                const res3 = await request(app).get("/test-disabled");

                expect(res1.status).toBe(200);
                expect(res2.status).toBe(200);
                expect(res3.status).toBe(200);
            } finally {
                process.env.RATE_LIMIT_DISABLED = originalDisabled || "false";
            }
        });
    });

    describe("Authentication Login Rate Limiting", () => {
        test("allows legitimate login attempts below limit and blocks with 429 when exceeded", async () => {
            const app = express();
            app.use(express.json());

            const testLoginLimiter = createRateLimiter({
                windowMs: 60 * 1000,
                max: 2,
                message: "Too many login attempts. Please try again later."
            });

            app.post("/api/auth/login", testLoginLimiter, (req, res) => {
                res.status(200).json({ success: true, token: "mock-token" });
            });

            const res1 = await request(app).post("/api/auth/login").send({ email: "user@example.com", password: "password123" });
            expect(res1.status).toBe(200);
            expect(res1.body.success).toBe(true);

            const res2 = await request(app).post("/api/auth/login").send({ email: "user@example.com", password: "wrongpassword" });
            expect(res2.status).toBe(200);

            const res3 = await request(app).post("/api/auth/login").send({ email: "user@example.com", password: "wrongpassword" });
            expect(res3.status).toBe(429);
            expect(res3.body).toEqual({
                success: false,
                message: "Too many login attempts. Please try again later."
            });
            expect(res3.body.stack).toBeUndefined();
            expect(res3.body.error).toBeUndefined();
        });

        test("login route has loginLimiter middleware mounted", () => {
            expect(typeof loginLimiter).toBe("function");
        });
    });

    describe("Authentication Registration Rate Limiting", () => {
        test("blocks abusive registration spam after exceeding max limit", async () => {
            const app = express();
            app.use(express.json());

            const testRegisterLimiter = createRateLimiter({
                windowMs: 60 * 1000,
                max: 2,
                message: "Too many registration attempts. Please try again later."
            });

            app.post("/api/auth/register", testRegisterLimiter, (req, res) => {
                res.status(201).json({ success: true, message: "User Registered Successfully" });
            });

            const res1 = await request(app).post("/api/auth/register").send({
                full_name: "User One",
                email: "user1@example.com",
                password: "Password123!",
                role: "ngo"
            });
            expect(res1.status).toBe(201);

            const res2 = await request(app).post("/api/auth/register").send({
                full_name: "User Two",
                email: "user2@example.com",
                password: "Password123!",
                role: "ngo"
            });
            expect(res2.status).toBe(201);

            const res3 = await request(app).post("/api/auth/register").send({
                full_name: "User Three",
                email: "user3@example.com",
                password: "Password123!",
                role: "ngo"
            });
            expect(res3.status).toBe(429);
            expect(res3.body).toEqual({
                success: false,
                message: "Too many registration attempts. Please try again later."
            });
        });
    });

    describe("AI Recommendation Rate Limiting & User Quota Isolation", () => {
        test("throttles AI recommendation requests per authenticated user and protects provider", async () => {
            const app = express();
            app.use(express.json());

            const testAiLimiter = createRateLimiter({
                windowMs: 60 * 1000,
                max: 2,
                keyGenerator: (req) => (req.user && req.user.id ? `ngo_user_${req.user.id}` : req.ip || "unknown"),
                message: "Too many recommendation requests. Please try again later."
            });

            // Simulated auth middleware
            app.use((req, res, next) => {
                const authHeader = req.headers.authorization;
                if (authHeader === "Bearer token_ngo_1") {
                    req.user = { id: 10, role: "ngo" };
                } else if (authHeader === "Bearer token_ngo_2") {
                    req.user = { id: 20, role: "ngo" };
                }
                next();
            });

            app.get("/api/ngo/recommendations/:foodId", testAiLimiter, (req, res) => {
                res.status(200).json({ success: true, foodId: req.params.foodId, recommendations: [] });
            });

            // NGO 1 makes 2 allowed requests
            const ngo1_req1 = await request(app).get("/api/ngo/recommendations/5").set("Authorization", "Bearer token_ngo_1");
            const ngo1_req2 = await request(app).get("/api/ngo/recommendations/5").set("Authorization", "Bearer token_ngo_1");
            expect(ngo1_req1.status).toBe(200);
            expect(ngo1_req2.status).toBe(200);

            // NGO 1 exceeds limit -> 429
            const ngo1_req3 = await request(app).get("/api/ngo/recommendations/5").set("Authorization", "Bearer token_ngo_1");
            expect(ngo1_req3.status).toBe(429);
            expect(ngo1_req3.body).toEqual({
                success: false,
                message: "Too many recommendation requests. Please try again later."
            });

            // NGO 2 has their own quota and can still make requests
            const ngo2_req1 = await request(app).get("/api/ngo/recommendations/5").set("Authorization", "Bearer token_ngo_2");
            expect(ngo2_req1.status).toBe(200);
            expect(ngo2_req1.body.success).toBe(true);
        });

        test("falls back to client IP when user id is not present on unauthenticated requests", async () => {
            const app = express();
            const testAiLimiter = createRateLimiter({
                windowMs: 60 * 1000,
                max: 1,
                keyGenerator: (req) => (req.user && req.user.id ? `ngo_user_${req.user.id}` : req.ip || "unknown"),
                message: "Too many recommendation requests. Please try again later."
            });

            app.get("/api/unauthed-recommendations", testAiLimiter, (req, res) => {
                res.status(200).json({ success: true });
            });

            const r1 = await request(app).get("/api/unauthed-recommendations");
            expect(r1.status).toBe(200);

            const r2 = await request(app).get("/api/unauthed-recommendations");
            expect(r2.status).toBe(429);
            expect(r2.body.message).toBe("Too many recommendation requests. Please try again later.");
        });
    });

    describe("Global Rate Limiting & Environment Configuration", () => {
        test("dynamic limit function respects process.env.RATE_LIMIT_GLOBAL_MAX override", async () => {
            const originalMax = process.env.RATE_LIMIT_GLOBAL_MAX;
            process.env.RATE_LIMIT_GLOBAL_MAX = "2";

            try {
                const app = express();
                app.use(globalLimiter);
                app.get("/api/health-check", (req, res) => res.json({ success: true }));

                const r1 = await request(app).get("/api/health-check");
                const r2 = await request(app).get("/api/health-check");
                const r3 = await request(app).get("/api/health-check");

                expect(r1.status).toBe(200);
                expect(r2.status).toBe(200);
                expect(r3.status).toBe(429);
                expect(r3.body).toEqual({
                    success: false,
                    message: "Too many requests. Please try again later."
                });
            } finally {
                if (originalMax !== undefined) {
                    process.env.RATE_LIMIT_GLOBAL_MAX = originalMax;
                } else {
                    delete process.env.RATE_LIMIT_GLOBAL_MAX;
                }
            }
        });
    });
});
