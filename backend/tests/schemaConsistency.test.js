jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const db = require("../config/db");
const { getAllDonations } = require("../controllers/adminController");
const {
    getAvailableDeliveries,
    getMyDeliveries
} = require("../controllers/volunteerController");
const { getDashboardStats } = require("../controllers/foodController");

const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

const respondWith = (result) => {
    db.query.mockImplementation((sql, valuesOrCallback, callback) => {
        const complete = typeof valuesOrCallback === "function"
            ? valuesOrCallback
            : callback;

        complete(null, result);
    });
};

beforeEach(() => {
    db.query.mockReset();
});

test("admin donations query joins donors through food_items.donor_id", () => {
    respondWith([]);

    getAllDonations({}, createResponse());

    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain("food_items.donor_id = users.id");
    expect(sql).not.toContain("restaurant_id");
});

test("volunteer delivery queries join donors through food_items.donor_id", () => {
    respondWith([]);

    getAvailableDeliveries({ user: { role: "volunteer" } }, createResponse());
    expect(db.query.mock.calls[0][0]).toContain("food_items.donor_id = restaurant.id");

    getMyDeliveries({ user: { id: 1, role: "volunteer" } }, createResponse());
    expect(db.query.mock.calls[1][0]).toContain("food_items.donor_id = restaurant.id");
});

test("restaurant dashboard counts Completed donations", () => {
    respondWith([{}]);

    getDashboardStats({ user: { id: 1 } }, createResponse());

    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain("SUM(status='Completed') AS completedDonations");
    expect(sql).not.toContain("Delivered");
});
