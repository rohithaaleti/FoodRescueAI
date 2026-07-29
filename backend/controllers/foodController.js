const db = require("../config/db");

// ======================
// Add Food
// ======================
const addFood = (req, res) => {

    const donor_id = req.user.id;

    const {
        food_name,
        quantity,
        food_type,
        expiry_time,
        pickup_address,
        image_url
    } = req.body;

    if (
        !food_name ||
        !quantity ||
        !food_type ||
        !expiry_time ||
        !pickup_address
    ) {
        return res.status(400).json({
            success: false,
            message: "Please fill all required fields."
        });
    }

    const sql = `
        INSERT INTO food_items
        (
            donor_id,
            food_name,
            quantity,
            food_type,
            expiry_time,
            pickup_address,
            status,
            image_url
        )
        VALUES (?,?,?,?,?,?,?,?)
    `;

    db.query(
        sql,
        [
            donor_id,
            food_name,
            quantity,
            food_type,
            expiry_time,
            pickup_address,
            "Available",
            image_url || null
        ],
        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    success: false,
                    error: err.message
                });

            }

            res.status(201).json({
                success: true,
                message: "Food Added Successfully"
            });

        }
    );
};

// ======================
// My Donations
// ======================

const getMyDonations = (req, res) => {

    const donor_id = req.user.id;

    db.query(
        "SELECT * FROM food_items WHERE donor_id=? ORDER BY id DESC",
        [donor_id],
        (err, result) => {

            if (err) {

                return res.status(500).json({
                    success: false,
                    error: err.message
                });

            }

            res.json({
                success: true,
                foodItems: result
            });

        }
    );

};

// ======================
// Dashboard Statistics
// ======================

const getDashboardStats = (req, res) => {

    const donor_id = req.user.id;

    const sql = `
        SELECT
            COUNT(*) AS totalDonations,
            SUM(status='Available') AS availableDonations,
            SUM(status='Delivered') AS completedDonations
        FROM food_items
        WHERE donor_id = ?
    `;

    db.query(sql, [donor_id], (err, result) => {

        if (err) {

            return res.status(500).json({
                success: false,
                error: err.message
            });

        }

        res.json({
            success: true,
            stats: result[0]
        });

    });

};

// ======================
// Delete Donation
// ======================

const deleteDonation = (req, res) => {

    const donationId = req.params.id;
    const donorId = req.user.id;

    db.query(
        "DELETE FROM food_items WHERE id = ? AND donor_id = ?",
        [donationId, donorId],
        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Server Error"
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Donation not found"
                });

            }

            res.json({
                success: true,
                message: "Donation deleted successfully"
            });

        }
    );

};
const getDonationById = (req, res) => {

    const donationId = req.params.id;
    const donorId = req.user.id;

    db.query(
        "SELECT * FROM food_items WHERE id = ? AND donor_id = ?",
        [donationId, donorId],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Donation not found"
                });
            }

            res.json({
                success: true,
                donation: result[0]
            });

        }
    );

};
const updateDonation = (req, res) => {

    const donationId = req.params.id;
    const donorId = req.user.id;

    const {
        food_name,
        quantity,
        food_type,
        expiry_time,
        pickup_address,
        image_url
    } = req.body;

    const sql = `
        UPDATE food_items
        SET
            food_name = ?,
            quantity = ?,
            food_type = ?,
            expiry_time = ?,
            pickup_address = ?,
            image_url = ?
        WHERE id = ? AND donor_id = ?
    `;

    db.query(
        sql,
        [
            food_name,
            quantity,
            food_type,
            expiry_time,
            pickup_address,
            image_url || null,
            donationId,
            donorId
        ],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Donation not found"
                });
            }

            res.json({
                success: true,
                message: "Donation updated successfully"
            });

        }
    );

};
module.exports = {
    addFood,
    getMyDonations,
    getDashboardStats,
    deleteDonation,
    getDonationById,
    updateDonation
};