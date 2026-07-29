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

        if (err)
            return res.status(500).json(err);

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

            if (err)
                return res.status(500).json(err);

            res.json({
                success: true,
                users: result
            });

        }
    );

};

module.exports = {
    getDashboardStats,
    getAllUsers
};