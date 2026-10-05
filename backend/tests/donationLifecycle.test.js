const request = require("supertest");

jest.mock("../config/db", () => ({
    query: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

jest.mock("../services/notificationService", () => ({
    createNotification: jest.fn().mockResolvedValue({ inserted: true, id: 1, affectedRows: 1 })
}));

const db = require("../config/db");
const jwt = require("jsonwebtoken");
const notificationService = require("../services/notificationService");
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
    test("Available donation can be accepted and creates exactly one DONATION_ACCEPTED notification for donor", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Donation accepted successfully.");

        const updateSqlCall = db.query.mock.calls.find(call => typeof call[0] === "string" && call[0].includes("status='Reserved'"));
        expect(updateSqlCall).toBeDefined();
        expect(updateSqlCall[0]).toContain("status='Reserved'");
        expect(updateSqlCall[0]).toContain("status='Available'");
        expect(updateSqlCall[1]).toEqual([5, 1]);

        expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 10,
            type: "DONATION_ACCEPTED",
            title: "Donation Accepted",
            message: "Your donation has been accepted by an NGO.",
            donationId: 1
        });
    });

    test("Already Reserved donation cannot be accepted again and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("Assigned donation cannot be accepted and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("Completed donation cannot be accepted and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("Notification failure does not break successful NGO acceptance", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        notificationService.createNotification.mockRejectedValueOnce(new Error("Notification DB error"));

        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Donation accepted successfully.");
        expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    });
});

describe("Donation Lifecycle Rules - NGO Expiry Rules", () => {
    test("expired Available donation is not returned by getAvailableFood", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, callback) => {
            callback(null, []);
        });

        const response = await request(app)
            .get("/api/ngo/available-food")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.foodItems).toEqual([]);

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("status='Available'");
        expect(sql).toContain("expiry_time > NOW()");
    });

    test("future-expiry Available donation remains eligible in getAvailableFood", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        const mockItem = { id: 1, food_name: "Fresh Rice", status: "Available", expiry_time: "2099-01-01T00:00:00.000Z" };
        db.query.mockImplementation((sql, callback) => {
            callback(null, [mockItem]);
        });

        const response = await request(app)
            .get("/api/ngo/available-food")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.foodItems).toHaveLength(1);
        expect(response.body.foodItems[0]).toEqual(mockItem);
    });

    test("expired Available donation cannot be accepted", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, params, callback) => {
            callback(null, { affectedRows: 0 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Donation already accepted or not found.");
        expect(notificationService.createNotification).not.toHaveBeenCalled();

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("expiry_time > NOW()");
    });

    test("future-expiry Available donation can still be accepted and notifies donor", async () => {
        jwt.verify.mockReturnValue({ id: 5, role: "ngo" });
        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/ngo/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Donation accepted successfully.");

        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain("status='Reserved'");
        expect(sql).toContain("status='Available'");
        expect(sql).toContain("expiry_time > NOW()");
        expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    });
});

describe("Donation Lifecycle Rules - Volunteer Accept", () => {
    test("Reserved donation can be accepted and creates exactly two VOLUNTEER_ASSIGNED notifications", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10, accepted_by: 5 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Delivery accepted successfully.");

        const updateSqlCall = db.query.mock.calls.find(call => typeof call[0] === "string" && call[0].includes("status = 'Assigned'"));
        expect(updateSqlCall).toBeDefined();
        expect(updateSqlCall[0]).toContain("status = 'Assigned'");
        expect(updateSqlCall[0]).toContain("status = 'Reserved'");
        expect(updateSqlCall[0]).toContain("volunteer_id IS NULL");
        expect(updateSqlCall[1]).toEqual([20, 1]);

        expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 10,
            type: "VOLUNTEER_ASSIGNED",
            title: "Volunteer Assigned",
            message: "A volunteer has been assigned to your donation.",
            donationId: 1
        });
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 5,
            type: "VOLUNTEER_ASSIGNED",
            title: "Volunteer Assigned",
            message: "A volunteer has been assigned to the donation.",
            donationId: 1
        });
    });

    test("Available donation cannot be accepted and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("Completed donation cannot be accepted and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("Already Assigned donation cannot be claimed by another volunteer and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("verifies the SQL condition includes status = 'Reserved' AND volunteer_id IS NULL", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10, accepted_by: 5 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        const updateSqlCall = db.query.mock.calls.find(call => typeof call[0] === "string" && call[0].includes("status = 'Assigned'"));
        expect(updateSqlCall[0]).toContain("status = 'Reserved'");
        expect(updateSqlCall[0]).toContain("volunteer_id IS NULL");
    });

    test("Notification failure does not break successful volunteer acceptance", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        notificationService.createNotification.mockRejectedValue(new Error("Notification DB error"));

        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10, accepted_by: 5 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/volunteer/accept/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Delivery accepted successfully.");
        expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    });
});

describe("Donation Lifecycle Rules - Volunteer Complete", () => {
    test("Assigned donation can be completed by its assigned volunteer and creates exactly two DONATION_COMPLETED notifications", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10, accepted_by: 5 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Delivery marked as completed.");

        const updateSqlCall = db.query.mock.calls.find(call => typeof call[0] === "string" && call[0].includes("status = 'Completed'"));
        expect(updateSqlCall).toBeDefined();
        expect(updateSqlCall[0]).toContain("status = 'Completed'");
        expect(updateSqlCall[0]).toContain("volunteer_id = ?");
        expect(updateSqlCall[0]).toContain("status = 'Assigned'");
        expect(updateSqlCall[1]).toEqual([1, 20]);

        expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 10,
            type: "DONATION_COMPLETED",
            title: "Donation Completed",
            message: "Your donation has been successfully delivered.",
            donationId: 1
        });
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 5,
            type: "DONATION_COMPLETED",
            title: "Donation Completed",
            message: "The donation delivery has been completed.",
            donationId: 1
        });
    });

    test("A different volunteer cannot complete it and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("Reserved donation cannot be completed and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("Already Completed donation cannot be completed and creates no notification", async () => {
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
        expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test("verifies the SQL condition protects both volunteer_id and status = 'Assigned'", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10, accepted_by: 5 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        const updateSqlCall = db.query.mock.calls.find(call => typeof call[0] === "string" && call[0].includes("status = 'Completed'"));
        expect(updateSqlCall[0]).toContain("volunteer_id = ?");
        expect(updateSqlCall[0]).toContain("status = 'Assigned'");
        expect(updateSqlCall[1]).toEqual([1, 20]);
    });

    test("Notification failure does not break successful volunteer completion", async () => {
        jwt.verify.mockReturnValue({ id: 20, role: "volunteer" });
        notificationService.createNotification.mockRejectedValue(new Error("Notification DB error"));

        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: 10, accepted_by: 5 }]);
            }
            callback(null, { affectedRows: 1 });
        });

        const response = await request(app)
            .put("/api/volunteer/complete/1")
            .set("Authorization", "Bearer token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Delivery marked as completed.");
        expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    });
});

describe("Donation Lifecycle Concurrency & Race Conditions", () => {
    test("Two simultaneous NGO acceptance attempts for the same Available donation: exactly one succeeds, one fails, exactly one notification created, and final state is Reserved by winning NGO", async () => {
        jwt.verify.mockImplementation((token) => {
            if (token === "ngo_token_1") return { id: 101, role: "ngo" };
            if (token === "ngo_token_2") return { id: 102, role: "ngo" };
            return { id: 101, role: "ngo" };
        });

        const donationRow = {
            id: 1,
            status: "Available",
            accepted_by: null,
            donor_id: 10,
            expiry_time: "2099-01-01T00:00:00.000Z"
        };

        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: donationRow.donor_id }]);
            }
            if (typeof sql === "string" && sql.includes("status='Reserved'") && sql.includes("status='Available'")) {
                const [ngoId, donationId] = params;
                if (donationRow.id === donationId && donationRow.status === "Available") {
                    donationRow.status = "Reserved";
                    donationRow.accepted_by = ngoId;
                    return callback(null, { affectedRows: 1 });
                } else {
                    return callback(null, { affectedRows: 0 });
                }
            }
            callback(new Error("Unexpected SQL query: " + sql));
        });

        const [res1, res2] = await Promise.all([
            request(app)
                .put("/api/ngo/accept/1")
                .set("Authorization", "Bearer ngo_token_1"),
            request(app)
                .put("/api/ngo/accept/1")
                .set("Authorization", "Bearer ngo_token_2")
        ]);

        const responses = [res1, res2];
        const successful = responses.filter((r) => r.status === 200);
        const failed = responses.filter((r) => r.status === 400);

        expect(successful).toHaveLength(1);
        expect(failed).toHaveLength(1);

        expect(successful[0].body).toEqual({
            success: true,
            message: "Donation accepted successfully."
        });

        expect(failed[0].body).toEqual({
            success: false,
            message: "Donation already accepted or not found."
        });

        expect(donationRow.status).toBe("Reserved");
        expect([101, 102]).toContain(donationRow.accepted_by);

        if (res1.status === 200) {
            expect(donationRow.accepted_by).toBe(101);
        } else {
            expect(donationRow.accepted_by).toBe(102);
        }

        // Only the winning NGO acceptance sends a notification
        expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 10,
            type: "DONATION_ACCEPTED",
            title: "Donation Accepted",
            message: "Your donation has been accepted by an NGO.",
            donationId: 1
        });
    });

    test("Two simultaneous volunteer acceptance attempts for the same Reserved donation: exactly one succeeds, one fails, exactly two notifications created, and final state is Assigned to winning volunteer", async () => {
        jwt.verify.mockImplementation((token) => {
            if (token === "vol_token_1") return { id: 201, role: "volunteer" };
            if (token === "vol_token_2") return { id: 202, role: "volunteer" };
            return { id: 201, role: "volunteer" };
        });

        const donationRow = {
            id: 1,
            status: "Reserved",
            donor_id: 10,
            accepted_by: 101,
            volunteer_id: null
        };

        db.query.mockImplementation((sql, params, callback) => {
            if (typeof sql === "string" && sql.includes("SELECT donor_id")) {
                return callback(null, [{ donor_id: donationRow.donor_id, accepted_by: donationRow.accepted_by }]);
            }
            if (typeof sql === "string" && sql.includes("status = 'Assigned'") && sql.includes("status = 'Reserved'")) {
                const [volunteerId, donationId] = params;
                if (donationRow.id === donationId && donationRow.status === "Reserved" && donationRow.volunteer_id === null) {
                    donationRow.status = "Assigned";
                    donationRow.volunteer_id = volunteerId;
                    return callback(null, { affectedRows: 1 });
                } else {
                    return callback(null, { affectedRows: 0 });
                }
            }
            callback(new Error("Unexpected SQL query: " + sql));
        });

        const [res1, res2] = await Promise.all([
            request(app)
                .put("/api/volunteer/accept/1")
                .set("Authorization", "Bearer vol_token_1"),
            request(app)
                .put("/api/volunteer/accept/1")
                .set("Authorization", "Bearer vol_token_2")
        ]);

        const responses = [res1, res2];
        const successful = responses.filter((r) => r.status === 200);
        const failed = responses.filter((r) => r.status === 400);

        expect(successful).toHaveLength(1);
        expect(failed).toHaveLength(1);

        expect(successful[0].body).toEqual({
            success: true,
            message: "Delivery accepted successfully."
        });

        expect(failed[0].body).toEqual({
            success: false,
            message: "Delivery already assigned or not found."
        });

        expect(donationRow.status).toBe("Assigned");
        expect([201, 202]).toContain(donationRow.volunteer_id);

        if (res1.status === 200) {
            expect(donationRow.volunteer_id).toBe(201);
        } else {
            expect(donationRow.volunteer_id).toBe(202);
        }

        // Only the winning volunteer acceptance sends 2 notifications (donor + NGO)
        expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 10,
            type: "VOLUNTEER_ASSIGNED",
            title: "Volunteer Assigned",
            message: "A volunteer has been assigned to your donation.",
            donationId: 1
        });
        expect(notificationService.createNotification).toHaveBeenCalledWith({
            userId: 101,
            type: "VOLUNTEER_ASSIGNED",
            title: "Volunteer Assigned",
            message: "A volunteer has been assigned to the donation.",
            donationId: 1
        });
    });
});
