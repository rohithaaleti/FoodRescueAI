process.env.JWT_SECRET = "testsecret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const db = require("../config/db");
const app = require("../server");

describe("POST /api/food Pickup Coordinates Handling", () => {
    const restaurantToken = jwt.sign({ id: 10, role: "restaurant" }, process.env.JWT_SECRET);
    const futureExpiry = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    beforeEach(() => {
        db.query.mockReset();
    });

    test("accepts valid coordinates and stores them in food_items", async () => {
        db.query.mockImplementation((sql, params, cb) => {
            cb(null, { insertId: 101, affectedRows: 1 });
        });

        const payload = {
            food_name: "Fresh Bread",
            quantity: "20",
            food_type: "Veg",
            expiry_time: futureExpiry,
            pickup_address: "123 Baker Street",
            pickup_latitude: 12.9715987,
            pickup_longitude: 77.5945627
        };

        const res = await request(app)
            .post("/api/food")
            .set("Authorization", `Bearer ${restaurantToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Food Added Successfully");

        expect(db.query).toHaveBeenCalledTimes(1);
        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toContain("pickup_latitude");
        expect(sql).toContain("pickup_longitude");
        expect(params[0]).toBe(10); // donor_id
        expect(params[1]).toBe("Fresh Bread");
        expect(params[2]).toBe(20);
        expect(params[3]).toBe("Veg");
        expect(params[4]).toBe(futureExpiry);
        expect(params[5]).toBe("123 Baker Street");
        expect(params[6]).toBe(12.9715987); // latVal
        expect(params[7]).toBe(77.5945627); // lonVal
        expect(params[8]).toBe("Available");
    });

    test("accepts omitted coordinates and stores null", async () => {
        db.query.mockImplementation((sql, params, cb) => {
            cb(null, { insertId: 102, affectedRows: 1 });
        });

        const payload = {
            food_name: "Fresh Soup",
            quantity: "15",
            food_type: "Veg",
            expiry_time: futureExpiry,
            pickup_address: "456 Main Street"
        };

        const res = await request(app)
            .post("/api/food")
            .set("Authorization", `Bearer ${restaurantToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const params = db.query.mock.calls[0][1];
        expect(params[6]).toBeNull(); // latVal
        expect(params[7]).toBeNull(); // lonVal
    });

    test("accepts empty string coordinates and stores null", async () => {
        db.query.mockImplementation((sql, params, cb) => {
            cb(null, { insertId: 103, affectedRows: 1 });
        });

        const payload = {
            food_name: "Rice Bowl",
            quantity: "10",
            food_type: "Vegan",
            expiry_time: futureExpiry,
            pickup_address: "789 Elm Street",
            pickup_latitude: "",
            pickup_longitude: ""
        };

        const res = await request(app)
            .post("/api/food")
            .set("Authorization", `Bearer ${restaurantToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const params = db.query.mock.calls[0][1];
        expect(params[6]).toBeNull();
        expect(params[7]).toBeNull();
    });

    test("rejects invalid latitude > 90", async () => {
        const payload = {
            food_name: "Fresh Salad",
            quantity: "10",
            food_type: "Veg",
            expiry_time: futureExpiry,
            pickup_address: "123 Salad Lane",
            pickup_latitude: 95.0,
            pickup_longitude: 77.0
        };

        const res = await request(app)
            .post("/api/food")
            .set("Authorization", `Bearer ${restaurantToken}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/pickup latitude/i);
        expect(db.query).not.toHaveBeenCalled();
    });

    test("rejects invalid latitude < -90", async () => {
        const payload = {
            food_name: "Fresh Salad",
            quantity: "10",
            food_type: "Veg",
            expiry_time: futureExpiry,
            pickup_address: "123 Salad Lane",
            pickup_latitude: -90.5,
            pickup_longitude: 77.0
        };

        const res = await request(app)
            .post("/api/food")
            .set("Authorization", `Bearer ${restaurantToken}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/pickup latitude/i);
        expect(db.query).not.toHaveBeenCalled();
    });

    test("rejects invalid longitude > 180", async () => {
        const payload = {
            food_name: "Fresh Salad",
            quantity: "10",
            food_type: "Veg",
            expiry_time: futureExpiry,
            pickup_address: "123 Salad Lane",
            pickup_latitude: 12.0,
            pickup_longitude: 185.0
        };

        const res = await request(app)
            .post("/api/food")
            .set("Authorization", `Bearer ${restaurantToken}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/pickup longitude/i);
        expect(db.query).not.toHaveBeenCalled();
    });

    test("rejects invalid longitude < -180", async () => {
        const payload = {
            food_name: "Fresh Salad",
            quantity: "10",
            food_type: "Veg",
            expiry_time: futureExpiry,
            pickup_address: "123 Salad Lane",
            pickup_latitude: 12.0,
            pickup_longitude: -185.0
        };

        const res = await request(app)
            .post("/api/food")
            .set("Authorization", `Bearer ${restaurantToken}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/pickup longitude/i);
        expect(db.query).not.toHaveBeenCalled();
    });
});
