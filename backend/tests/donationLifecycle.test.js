const request = require("supertest");

jest.mock("../config/db", () => ({
    query: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

const db = require("../config/db");
const jwt = require("jsonwebtoken");
const app = require("../server");

beforeEach(() => {
    jest.clearAllMocks();
});

describe("Donation Lifecycle Rules - EDIT", () => {
    test("owner + Available -> allowed", async () => {
        jwt.verify.mockReturnValue({ id: 10, role: "restaurant" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/food/1")
            .set("Authorization", "Bearer token")
            .send({ food_name: "Updated Pizza" });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Donation updated successfully");
        expect(db.query).toHaveBeenCalledTimes(1);
        expect(db.query.mock.calls[0][0]).toContain("status = 'Available'");
    });

    test.each(["Reserved", "Assigned", "Completed"])(
        "owner + %s -> rejected",
        async (status) => {
            jwt.verify.mockReturnValue({ id: 10, role: "restaurant" });
            db.query
                .mockImplementationOnce((sql, params, callback) => {
                    // UPDATE affected 0 rows because status is not Available
                    callback(null, { affectedRows: 0 });
                })
                .mockImplementationOnce((sql, params, callback) => {
                    // SELECT returns status
                    callback(null, [{ status }]);
                });

            const response = await request(app)
                .put("/api/food/1")
                .set("Authorization", "Bearer token")
                .send({ food_name: "Updated Pizza" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Only available donations can be updated.");
        }
    );

    test("non-owner + Available -> rejected", async () => {
        jwt.verify.mockReturnValue({ id: 99, role: "restaurant" });
        db.query
            .mockImplementationOnce((sql, params, callback) => {
                // UPDATE affected 0 rows because donor_id doesn't match
                callback(null, { affectedRows: 0 });
            })
            .mockImplementationOnce((sql, params, callback) => {
                // SELECT returns empty (not found for this donor)
                callback(null, []);
            });

        const response = await request(app)
            .put("/api/food/1")
            .set("Authorization", "Bearer token")
            .send({ food_name: "Updated Pizza" });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Donation not found");
    });
});

describe("Donation Lifecycle Rules - DELETE", () => {
    test("owner + Available -> allowed", async () => {
        jwt.verify.mockReturnValue({ id: 10, role: "restaurant" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .delete("/api/food/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Donation deleted successfully");
        expect(db.query).toHaveBeenCalledTimes(1);
        expect(db.query.mock.calls[0][0]).toContain("status = 'Available'");
    });

    test.each(["Reserved", "Assigned", "Completed"])(
        "owner + %s -> rejected",
        async (status) => {
            jwt.verify.mockReturnValue({ id: 10, role: "restaurant" });
            db.query
                .mockImplementationOnce((sql, params, callback) => {
                    // DELETE affected 0 rows because status is not Available
                    callback(null, { affectedRows: 0 });
                })
                .mockImplementationOnce((sql, params, callback) => {
                    // SELECT returns status
                    callback(null, [{ status }]);
                });

            const response = await request(app)
                .delete("/api/food/1")
                .set("Authorization", "Bearer token");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Only available donations can be deleted.");
        }
    );

    test("non-owner + Available -> rejected", async () => {
        jwt.verify.mockReturnValue({ id: 99, role: "restaurant" });
        db.query
            .mockImplementationOnce((sql, params, callback) => {
                // DELETE affected 0 rows because donor_id doesn't match
                callback(null, { affectedRows: 0 });
            })
            .mockImplementationOnce((sql, params, callback) => {
                // SELECT returns empty (not found for this donor)
                callback(null, []);
            });

        const response = await request(app)
            .delete("/api/food/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Donation not found");
    });
});
