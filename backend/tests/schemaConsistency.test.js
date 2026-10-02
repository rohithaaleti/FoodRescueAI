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

test("migration 001_add_ngo_matching_foundation.sql defines correct schema, foreign keys, and constraints", () => {
    const fs = require("fs");
    const path = require("path");

    const migrationPath = path.join(__dirname, "../../docs/migrations/001_add_ngo_matching_foundation.sql");
    expect(fs.existsSync(migrationPath)).toBe(true);

    const migrationSql = fs.readFileSync(migrationPath, "utf8");

    // Table creation checks
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS ngo_profiles");
    expect(migrationSql).toContain("user_id INT NOT NULL UNIQUE");
    expect(migrationSql).toContain("latitude DECIMAL(10, 7) NULL");
    expect(migrationSql).toContain("longitude DECIMAL(10, 7) NULL");
    expect(migrationSql).toContain("max_capacity INT NOT NULL DEFAULT 100");
    expect(migrationSql).toContain("supported_food_types VARCHAR(255) NOT NULL DEFAULT 'Veg,Non-Veg,Vegan,Other'");
    expect(migrationSql).toContain("is_active TINYINT(1) NOT NULL DEFAULT 1");
    expect(migrationSql).toContain("max_active_donations INT NOT NULL DEFAULT 3");
    expect(migrationSql).toContain("created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    expect(migrationSql).toContain("updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

    // Foreign key check
    expect(migrationSql).toContain("FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");

    // food_items extensions
    expect(migrationSql).toContain("ALTER TABLE food_items");
    expect(migrationSql).toContain("ADD COLUMN pickup_latitude DECIMAL(10, 7) NULL");
    expect(migrationSql).toContain("ADD COLUMN pickup_longitude DECIMAL(10, 7) NULL");

    // CHECK constraints
    expect(migrationSql).toContain("chk_ngo_latitude");
    expect(migrationSql).toContain("chk_ngo_longitude");
    expect(migrationSql).toContain("chk_ngo_max_capacity");
    expect(migrationSql).toContain("chk_ngo_max_active_donations");
    expect(migrationSql).toContain("chk_food_pickup_latitude");
    expect(migrationSql).toContain("chk_food_pickup_longitude");
});

