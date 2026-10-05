const request = require("supertest");
const app = require("../server");
const db = require("../config/db");

// Mock the db query
jest.mock("../config/db", () => ({
    query: jest.fn()
}));

// Mock authentication middleware
jest.mock("../middleware/verifyToken", () => {
    return (req, res, next) => {
        // By default, mock an authenticated user with ID 5
        req.user = { id: 5, role: 'ngo' };
        next();
    };
});

describe("Notification API endpoints", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/notifications", () => {
        it("should return notifications and unread count for the user", async () => {
            const mockNotifications = [
                { id: 1, user_id: 5, message: "A", is_read: false },
                { id: 2, user_id: 5, message: "B", is_read: true }
            ];

            db.query.mockImplementation((sql, values, callback) => {
                if (sql.includes("COUNT(*)")) {
                    callback(null, [{ unreadCount: 1 }]);
                } else {
                    callback(null, mockNotifications);
                }
            });

            const res = await request(app).get("/api/notifications?limit=10&offset=5");

            expect(res.status).toBe(200);
            expect(res.body.notifications).toEqual(mockNotifications);
            expect(res.body.unreadCount).toBe(1);
            expect(res.body.limit).toBe(10);
            expect(res.body.offset).toBe(5);

            expect(db.query).toHaveBeenCalledTimes(2);
            // Verify limit and offset were passed correctly
            const dataQueryCall = db.query.mock.calls.find(call => call[0].includes("LIMIT ? OFFSET ?"));
            expect(dataQueryCall[1]).toEqual([5, 10, 5]);
        });

        it("should filter by unreadOnly and apply default limits", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                if (sql.includes("COUNT(*)")) {
                    callback(null, [{ unreadCount: 1 }]);
                } else {
                    callback(null, []);
                }
            });

            const res = await request(app).get("/api/notifications?unreadOnly=true");

            expect(res.status).toBe(200);
            expect(res.body.limit).toBe(20); // Default limit
            expect(res.body.offset).toBe(0); // Default offset

            const dataQueryCall = db.query.mock.calls.find(call => call[0].includes("LIMIT ? OFFSET ?"));
            expect(dataQueryCall[0]).toContain("is_read = false");
        });

        it("should enforce a maximum limit of 100", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                if (sql.includes("COUNT(*)")) {
                    callback(null, [{ unreadCount: 0 }]);
                } else {
                    callback(null, []);
                }
            });

            const res = await request(app).get("/api/notifications?limit=5000");

            expect(res.status).toBe(200);
            expect(res.body.limit).toBe(100);
        });

        it("should return 500 on db error", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                callback(new Error("DB Error"));
            });

            const res = await request(app).get("/api/notifications");
            expect(res.status).toBe(500);
            expect(res.body.error).toBe("Failed to fetch notifications.");
        });
    });

    describe("PUT /api/notifications/:id/read", () => {
        it("should mark notification as read if it belongs to user", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                if (sql.includes("SELECT id, is_read")) {
                    callback(null, [{ id: 1, is_read: false }]); // Exists and not read
                } else {
                    callback(null, { affectedRows: 1 }); // Update success
                }
            });

            const res = await request(app).put("/api/notifications/1/read");
            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Notification marked as read.");
            expect(db.query).toHaveBeenCalledTimes(2); // Select + Update
        });

        it("should return 200 idempotently if already read", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                if (sql.includes("SELECT id, is_read")) {
                    callback(null, [{ id: 2, is_read: true }]); // Exists but already read
                }
            });

            const res = await request(app).put("/api/notifications/2/read");
            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Notification marked as read.");
            expect(db.query).toHaveBeenCalledTimes(1); // Only select, no update
        });

        it("should return 404 if notification not found or belongs to someone else", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                if (sql.includes("SELECT id, is_read")) {
                    callback(null, []); // Not found for this user
                }
            });

            const res = await request(app).put("/api/notifications/3/read");
            expect(res.status).toBe(404);
            expect(res.body.error).toBe("Notification not found.");
        });

        it("should return 400 for invalid notification ID", async () => {
            const res = await request(app).put("/api/notifications/invalid/read");
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Invalid notification ID.");
        });
    });

    describe("PUT /api/notifications/read-all", () => {
        it("should mark all unread notifications as read for the user", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                callback(null, { affectedRows: 3 });
            });

            const res = await request(app).put("/api/notifications/read-all");
            expect(res.status).toBe(200);
            expect(res.body.message).toBe("All notifications marked as read.");
            expect(res.body.updatedCount).toBe(3);
            
            const updateCall = db.query.mock.calls[0];
            expect(updateCall[0]).toContain("UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false");
            expect(updateCall[1]).toEqual([5]); // user.id = 5
        });

        it("should return 500 on db error", async () => {
            db.query.mockImplementation((sql, values, callback) => {
                callback(new Error("DB Error"));
            });

            const res = await request(app).put("/api/notifications/read-all");
            expect(res.status).toBe(500);
            expect(res.body.error).toBe("Failed to mark all as read.");
        });
    });
});
