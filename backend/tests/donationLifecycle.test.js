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

describe("Donation Lifecycle Rules - NGO Accept", () => {
    test("Available donation can be accepted", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Donation accepted successfully.");
        expect(db.query).toHaveBeenCalledTimes(1);

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("status='Reserved'");
        expect(sql).toContain("status='Available'");
        expect(db.query.mock.calls[0][1]).toEqual([5, 1]);
    });

    test("Already Reserved donation cannot be accepted again", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, params, callback) => {
            // affectedRows is 0 because status is already 'Reserved'
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Donation already accepted or not found.");
    });

    test("Assigned donation cannot be accepted", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, params, callback) => {
            // affectedRows is 0 because status is 'Assigned'
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Donation already accepted or not found.");
    });

    test("Completed donation cannot be accepted", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, params, callback) => {
            // affectedRows is 0 because status is 'Completed'
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Donation already accepted or not found.");
    });
});

describe("Donation Lifecycle Rules - Volunteer Accept", () => {
    test("Reserved donation can be accepted", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Delivery accepted successfully.");
        expect(db.query).toHaveBeenCalledTimes(1);

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("status = 'Assigned'");
        expect(sql).toContain("status = 'Reserved'");
        expect(sql).toContain("volunteer_id IS NULL");
        expect(db.query.mock.calls[0][1]).toEqual([20, 1]);
    });

    test("Available donation cannot be accepted", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Delivery already assigned or not found.");
    });

    test("Completed donation cannot be accepted", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Delivery already assigned or not found.");
    });

    test("Already Assigned donation cannot be claimed by another volunteer", async () => {
        jwt.verify.mockReturnValue({ id: 21, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            // affectedRows is 0 because volunteer_id is not NULL or status != Reserved
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Delivery already assigned or not found.");
    });

    test("verifies the SQL condition includes status = 'Reserved' AND volunteer_id IS NULL", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 1 });
        });

        await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("status = 'Reserved'");
        expect(sql).toContain("volunteer_id IS NULL");
    });
});

describe("Donation Lifecycle Rules - Volunteer Complete", () => {
    test("Assigned donation can be completed by its assigned volunteer", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Delivery marked as completed.");
        expect(db.query).toHaveBeenCalledTimes(1);

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("status = 'Completed'");
        expect(sql).toContain("volunteer_id = ?");
        expect(sql).toContain("status = 'Assigned'");
        expect(db.query.mock.calls[0][1]).toEqual([1, 20]);
    });

    test("A different volunteer cannot complete it", async () => {
        jwt.verify.mockReturnValue({ id: 99, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            // affectedRows is 0 because volunteer_id != 99
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Delivery not found or already completed.");
    });

    test("Reserved donation cannot be completed", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            // affectedRows is 0 because status != Assigned
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Delivery not found or already completed.");
    });

    test("Already Completed donation cannot be completed", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            // affectedRows is 0 because status != Assigned
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Delivery not found or already completed.");
    });

    test("verifies the SQL condition protects both volunteer_id and status = 'Assigned'", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 1 });
        });

        await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("volunteer_id = ?");
        expect(sql).toContain("status = 'Assigned'");
        expect(db.query.mock.calls[0][1]).toEqual([1, 20]);
    });
});
