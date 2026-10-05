jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const db = require("../config/db");
const { createNotification } = require("../services/notificationService");

beforeEach(() => {
    jest.clearAllMocks();
});

describe("Notification Service - createNotification", () => {
    test("successfully creates notification with donationId", async () => {
        db.query.mockImplementation((sql, values, callback) => {
            callback(null, { affectedRows: 1, insertId: 42 });
        });

        const result = await createNotification({
            userId: 5,
            type: "DONATION_ACCEPTED",
            title: "Donation Accepted",
            message: "Your donation has been accepted.",
            donationId: 10
        });

        expect(result).toEqual({
            inserted: true,
            id: 42,
            affectedRows: 1
        });

        expect(db.query).toHaveBeenCalledTimes(1);
        const [sql, values] = db.query.mock.calls[0];
        expect(sql).toContain("INSERT IGNORE INTO notifications");
        expect(values).toEqual([5, "DONATION_ACCEPTED", "Donation Accepted", "Your donation has been accepted.", 10]);
    });

    test("successfully creates notification without donationId (defaults to null)", async () => {
        db.query.mockImplementation((sql, values, callback) => {
            callback(null, { affectedRows: 1, insertId: 43 });
        });

        const result = await createNotification({
            userId: 7,
            type: "SYSTEM_ALERT",
            title: "Welcome",
            message: "Welcome to FoodRescueAI!"
        });

        expect(result).toEqual({
            inserted: true,
            id: 43,
            affectedRows: 1
        });

        expect(db.query).toHaveBeenCalledTimes(1);
        const [sql, values] = db.query.mock.calls[0];
        expect(sql).toContain("INSERT IGNORE INTO notifications");
        expect(values).toEqual([7, "SYSTEM_ALERT", "Welcome", "Welcome to FoodRescueAI!", null]);
    });

    test("handles duplicate / idempotent insertion (affectedRows === 0)", async () => {
        db.query.mockImplementation((sql, values, callback) => {
            callback(null, { affectedRows: 0, insertId: 0 });
        });

        const result = await createNotification({
            userId: 5,
            type: "DONATION_ACCEPTED",
            title: "Donation Accepted",
            message: "Your donation has been accepted.",
            donationId: 10
        });

        expect(result).toEqual({
            inserted: false,
            id: null,
            affectedRows: 0
        });
    });

    test("propagates database errors properly without swallowing", async () => {
        const dbError = new Error("Database connection lost");
        db.query.mockImplementation((sql, values, callback) => {
            callback(dbError);
        });

        await expect(
            createNotification({
                userId: 5,
                type: "DONATION_ACCEPTED",
                title: "Donation Accepted",
                message: "Your donation has been accepted.",
                donationId: 10
            })
        ).rejects.toThrow("Database connection lost");
    });

    test("rejects when required fields are missing", async () => {
        await expect(
            createNotification({
                userId: 5,
                title: "Missing type & message"
            })
        ).rejects.toThrow("Missing required notification fields");
    });
});
