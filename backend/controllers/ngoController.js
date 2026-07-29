const db = require("../config/db");

// ==========================
// Get Available Food
// ==========================
const getAvailableFood = (req, res) => {

    const sql = `
        SELECT *
        FROM food_items
        WHERE status='Available'
        ORDER BY id DESC
    `;

    db.query(sql, (err, result) => {

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

    });

};

// ==========================
// Accept Donation
// ==========================
const acceptDonation = (req, res) => {

    if (req.user.role !== "ngo") {
        return res.status(403).json({
            success: false,
            message: "Only NGOs can accept donations."
        });
    }

    const ngoId = req.user.id;
    const donationId = req.params.id;

    const sql = `
        UPDATE food_items
        SET
            status='Reserved',
            accepted_by=?,
            accepted_time=NOW()
        WHERE
            id=?
            AND status='Available'
    `;

    db.query(sql, [ngoId, donationId], (err, result) => {

        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: "Donation already accepted or not found."
            });
        }

        res.json({
            success: true,
            message: "Donation accepted successfully."
        });

    });

};

// ==========================
// My Accepted Donations
// ==========================
const getMyAcceptedDonations = (req, res) => {

    const ngoId = req.user.id;

    const sql = `
        SELECT *
        FROM food_items
        WHERE accepted_by=?
        ORDER BY accepted_time DESC
    `;

    db.query(sql, [ngoId], (err, result) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: "Database Error"
            });
        }

        res.json({
            success: true,
            donations: result
        });

    });

};

// ==========================
// Mark Donation Delivered
// ==========================
const markAsDelivered = (req, res) => {

    const donationId = req.params.id;
    const ngoId = req.user.id;

    const sql = `
        UPDATE food_items
        SET status='Completed'
        WHERE id=?
        AND accepted_by=?
        AND status='Reserved'
    `;

    db.query(sql, [donationId, ngoId], (err, result) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: "Donation not found or already completed."
            });
        }

        res.json({
            success: true,
            message: "Donation marked as completed."
        });

    });

};

module.exports = {
    getAvailableFood,
    acceptDonation,
    getMyAcceptedDonations,
    markAsDelivered
};