const db = require("../config/db");

// Dashboard Statistics
const getDashboardStats = (req, res) => {

    const sql = `
        SELECT
            (SELECT COUNT(*) FROM users) totalUsers,
            (SELECT COUNT(*) FROM users WHERE role='restaurant') restaurants,
            (SELECT COUNT(*) FROM users WHERE role='ngo') ngos,
            (SELECT COUNT(*) FROM users WHERE role='volunteer') volunteers,
            (SELECT COUNT(*) FROM users WHERE role='admin') admins,

            (SELECT COUNT(*) FROM food_items) totalDonations,
            (SELECT COUNT(*) FROM food_items WHERE status='Available') available,
            (SELECT COUNT(*) FROM food_items WHERE status='Reserved') reserved,
            (SELECT COUNT(*) FROM food_items WHERE status='Completed') completed
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.error("ADMIN DASHBOARD STATS ERROR:", err);
            return res.status(500).json({ success: false, message: "Server Error" });
        }

        res.json({
            success: true,
            stats: result[0]
        });

    });

};

// Get All Users
const getAllUsers = (req, res) => {

    db.query(
        `SELECT
            id,
            full_name,
            email,
            role,
            organization_name,
            phone
         FROM users
         ORDER BY id DESC`,
        (err, result) => {

            if (err) {
                console.error("ADMIN GET USERS ERROR:", err);
                return res.status(500).json({ success: false, message: "Server Error" });
            }

            res.json({
                success: true,
                users: result
            });

        }
    );

};
const getAllDonations = (req, res) => {

    const sql = `
        SELECT
            food_items.id,
            food_items.food_name,
            food_items.quantity,
            food_items.status,
            food_items.pickup_address,
            users.full_name AS restaurant
        FROM food_items
        JOIN users
        ON food_items.donor_id = users.id
        ORDER BY food_items.id DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.error("ADMIN GET DONATIONS ERROR:", err);
            return res.status(500).json({ success: false, message: "Server Error" });
        }

        res.json({
            success: true,
            donations: result
        });

    });

};
// ================= Delete Donation =================

const deleteDonation = (req, res) => {

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    db.query(
        "DELETE FROM food_items WHERE id = ?",
        [id],
        (err, result) => {

            if (err) {
                console.error("ADMIN DELETE DONATION ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server Error"
                });
            }

            res.json({
                success: true,
                message: "Donation deleted successfully"
            });

        }
    );

};
module.exports = {
    getDashboardStats,
    getAllUsers,
    getAllDonations,
    deleteDonation
};
