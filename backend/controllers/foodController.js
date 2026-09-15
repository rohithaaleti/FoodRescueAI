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
        !food_name || typeof food_name !== "string" || !food_name.trim() ||
        !food_type || typeof food_type !== "string" || !food_type.trim() ||
        !pickup_address || typeof pickup_address !== "string" || !pickup_address.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: "Food name, food type, and pickup address are required and cannot be empty."
        });
    }

    const parsedQuantity = Number(quantity);
    if (quantity === undefined || quantity === null || (typeof quantity === "string" && quantity.trim() === "") || isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive number."
        });
    }

    const expiryDate = new Date(expiry_time);
    if (!expiry_time || isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({
            success: false,
            message: "Expiry time must be a valid future date."
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
            food_name.trim(),
            parsedQuantity,
            food_type.trim(),
            expiry_time,
            pickup_address.trim(),
            "Available",
            (typeof image_url === "string" && image_url.trim()) ? image_url.trim() : null
        ],
        (err) => {

            if (err) {

                console.error("ADD FOOD ERROR:", err);

                return res.status(500).json({
                    success: false,
                    error: "Server Error"
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

                console.error("GET MY DONATIONS ERROR:", err);

                return res.status(500).json({
                    success: false,
                    error: "Server Error"
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
            SUM(status='Completed') AS completedDonations
        FROM food_items
        WHERE donor_id = ?
    `;

    db.query(sql, [donor_id], (err, result) => {

        if (err) {

            console.error("GET DASHBOARD STATS ERROR:", err);

            return res.status(500).json({
                success: false,
                error: "Server Error"
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

    const donationId = Number(req.params.id);
    if (!Number.isInteger(donationId) || donationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const donorId = req.user.id;

    db.query(
        "DELETE FROM food_items WHERE id = ? AND donor_id = ?",
        [donationId, donorId],
        (err, result) => {

            if (err) {

                console.error("DELETE DONATION ERROR:", err);

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

// ======================
// Get Donation By ID
// ======================

const getDonationById = (req, res) => {

    const donationId = Number(req.params.id);
    if (!Number.isInteger(donationId) || donationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const donorId = req.user.id;

    db.query(
        "SELECT * FROM food_items WHERE id = ? AND donor_id = ?",
        [donationId, donorId],
        (err, result) => {

            if (err) {
                console.error("GET DONATION ERROR:", err);
                return res.status(500).json({
                    success: false,
                    error: "Server Error"
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

// ======================
// Update Donation
// ======================

const updateDonation = (req, res) => {

    const donationId = Number(req.params.id);
    if (!Number.isInteger(donationId) || donationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const donorId = req.user.id;

    const {
        food_name,
        quantity,
        food_type,
        expiry_time,
        pickup_address,
        image_url
    } = req.body;

    const fields = [];
    const values = [];

    if (food_name !== undefined) {
        if (typeof food_name !== "string" || !food_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Food name cannot be empty."
            });
        }
        fields.push("food_name = ?");
        values.push(food_name.trim());
    }

    if (quantity !== undefined) {
        const parsedQuantity = Number(quantity);
        if (quantity === null || (typeof quantity === "string" && quantity.trim() === "") || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive number."
            });
        }
        fields.push("quantity = ?");
        values.push(parsedQuantity);
    }

    if (food_type !== undefined) {
        if (typeof food_type !== "string" || !food_type.trim()) {
            return res.status(400).json({
                success: false,
                message: "Food type cannot be empty."
            });
        }
        fields.push("food_type = ?");
        values.push(food_type.trim());
    }

    if (expiry_time !== undefined) {
        const expiryDate = new Date(expiry_time);
        if (!expiry_time || isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Expiry time must be a valid future date."
            });
        }
        fields.push("expiry_time = ?");
        values.push(expiry_time);
    }

    if (pickup_address !== undefined) {
        if (typeof pickup_address !== "string" || !pickup_address.trim()) {
            return res.status(400).json({
                success: false,
                message: "Pickup address cannot be empty."
            });
        }
        fields.push("pickup_address = ?");
        values.push(pickup_address.trim());
    }

    if (image_url !== undefined && image_url !== null) {
        if (typeof image_url === "string" && image_url.trim() !== "") {
            fields.push("image_url = ?");
            values.push(image_url.trim());
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No valid fields provided for update."
        });
    }

    values.push(donationId, donorId);

    const sql = `
        UPDATE food_items
        SET ${fields.join(", ")}
        WHERE id = ? AND donor_id = ?
    `;

    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {
                console.error("UPDATE DONATION ERROR:", err);
                return res.status(500).json({
                    success: false,
                    error: "Server Error"
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
