const request = require("supertest");

jest.mock("../config/db", () => ({
    query: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

const jwt = require("jsonwebtoken");
const app = require("../server");

const adminRoutes = [
    { method: "get", path: "/api/admin/dashboard" },
    { method: "get", path: "/api/admin/users" },
    { method: "get", path: "/api/admin/donations" },
    { method: "delete", path: "/api/admin/donation/1" }
];

const ngoRoutes = [
    { method: "get", path: "/api/ngo/available-food" },
    { method: "get", path: "/api/ngo/my-donations" },
    { method: "put", path: "/api/ngo/accept/1" }
];

const restaurantRoutes = [
    { method: "post", path: "/api/food" },
    { method: "put", path: "/api/food/1" },
    { method: "get", path: "/api/food/my-donations" },
    { method: "get", path: "/api/food/dashboard-stats" },
    { method: "get", path: "/api/food/1" },
    { method: "delete", path: "/api/food/1" }
];

const volunteerRoutes = [
    { method: "get", path: "/api/volunteer/available-deliveries" },
    { method: "put", path: "/api/volunteer/accept/1" },
    { method: "get", path: "/api/volunteer/my-deliveries" },
    { method: "put", path: "/api/volunteer/complete/1" }
];

beforeEach(() => {
    jwt.verify.mockReset();
});

test("POST /api/auth/register rejects the admin role", async () => {
    const response = await request(app)
        .post("/api/auth/register")
        .send({
            full_name: "Test Admin",
            email: "admin@example.com",
            password: "password123",
            role: "admin"
        });

    expect(response.status).toBe(400);
});

test.each(adminRoutes)(
    "admin route $method $path rejects unauthenticated requests",
    async ({ method, path }) => {
        const response = await request(app)[method](path);

        expect(response.status).toBe(401);
    }
);

test.each(adminRoutes)(
    "admin route $method $path rejects non-admin users",
    async ({ method, path }) => {
        jwt.verify.mockReturnValue({ id: 1, role: "ngo" });

        const response = await request(app)[method](path)
            .set("Authorization", "Bearer test-token");

        expect(response.status).toBe(403);
    }
);

test.each(restaurantRoutes)(
    "restaurant route $method $path rejects unauthenticated requests",
    async ({ method, path }) => {
        const response = await request(app)[method](path);

        expect(response.status).toBe(401);
    }
);

test.each(restaurantRoutes)(
    "restaurant route $method $path rejects non-restaurant users",
    async ({ method, path }) => {
        jwt.verify.mockReturnValue({ id: 1, role: "ngo" });

        const response = await request(app)[method](path)
            .set("Authorization", "Bearer test-token");

        expect(response.status).toBe(403);
    }
);

test.each(ngoRoutes)(
    "NGO route $method $path rejects unauthenticated requests",
    async ({ method, path }) => {
        const response = await request(app)[method](path);

        expect(response.status).toBe(401);
    }
);

test.each(ngoRoutes)(
    "NGO route $method $path rejects non-NGO users",
    async ({ method, path }) => {
        jwt.verify.mockReturnValue({ id: 1, role: "restaurant" });

        const response = await request(app)[method](path)
            .set("Authorization", "Bearer test-token");

        expect(response.status).toBe(403);
    }
);

test.each(volunteerRoutes)(
    "volunteer route $method $path rejects unauthenticated requests",
    async ({ method, path }) => {
        const response = await request(app)[method](path);

        expect(response.status).toBe(401);
    }
);

test.each(volunteerRoutes)(
    "volunteer route $method $path rejects non-volunteer users",
    async ({ method, path }) => {
        jwt.verify.mockReturnValue({ id: 1, role: "restaurant" });

        const response = await request(app)[method](path)
            .set("Authorization", "Bearer test-token");

        expect(response.status).toBe(403);
    }
);