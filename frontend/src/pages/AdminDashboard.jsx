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
        ON food_items.restaurant_id = users.id
        ORDER BY food_items.id DESC
    `;

    db.query(sql, (err, result) => {

        if (err)
            return res.status(500).json(err);

        res.json({
            success: true,
            donations: result
        });

    });

};
module.exports = {
    getDashboardStats,
    getAllUsers,
    getAllDonations
};