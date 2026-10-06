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
        pickup_latitude,
        pickup_longitude,
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

    const trimmedFoodName = food_name.trim();
    if (trimmedFoodName.length > 200) {
        return res.status(400).json({
            success: false,
            message: "Food name must not exceed 200 characters."
        });
    }

    const trimmedFoodType = food_type.trim();
    if (trimmedFoodType.length > 50) {
        return res.status(400).json({
            success: false,
            message: "Food type must not exceed 50 characters."
        });
    }

    const trimmedPickupAddress = pickup_address.trim();
    if (trimmedPickupAddress.length > 500) {
        return res.status(400).json({
            success: false,
            message: "Pickup address must not exceed 500 characters."
        });
    }

    if (typeof quantity === "string" && quantity.trim().length > 20) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive number not exceeding 1,000,000."
        });
    }

    const parsedQuantity = Number(quantity);
    if (quantity === undefined || quantity === null || (typeof quantity === "string" && quantity.trim() === "") || isNaN(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > 1000000) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive number not exceeding 1,000,000."
        });
    }

    if (typeof expiry_time === "string" && expiry_time.trim().length > 50) {
        return res.status(400).json({
            success: false,
            message: "Expiry time string exceeds maximum length."
        });
    }

    const expiryDate = new Date(expiry_time);
    if (!expiry_time || isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({
            success: false,
            message: "Expiry time must be a valid future date."
        });
    }

    if (image_url !== undefined && image_url !== null && typeof image_url === "string" && image_url.trim().length > 2048) {
        return res.status(400).json({
            success: false,
            message: "Image URL must not exceed 2048 characters."
        });
    }

    let latVal = null;
    if (pickup_latitude !== null && pickup_latitude !== undefined && pickup_latitude !== "") {
        const latNum = Number(pickup_latitude);
        if (isNaN(latNum) || latNum < -90 || latNum > 90) {
            return res.status(400).json({
                success: false,
                message: "Pickup latitude must be a valid number between -90 and 90."
            });
        }
        latVal = latNum;
    }

    let lonVal = null;
    if (pickup_longitude !== null && pickup_longitude !== undefined && pickup_longitude !== "") {
        const lonNum = Number(pickup_longitude);
        if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
            return res.status(400).json({
                success: false,
                message: "Pickup longitude must be a valid number between -180 and 180."
            });
        }
        lonVal = lonNum;
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
            pickup_latitude,
            pickup_longitude,
            status,
            image_url
        )
        VALUES (?,?,?,?,?,?,?,?,?,?)
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
            latVal,
            lonVal,
            "Available",
            (typeof image_url === "string" && image_url.trim()) ? image_url.trim() : null
        ],
        (err) => {

            if (err) {

                console.error("ADD FOOD ERROR:", err);

                return res.status(500).json({
                    success: false,
                    message: "Server Error"
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
                    message: "Server Error"
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
                message: "Server Error"
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
    if (!Number.isInteger(donationId) || donationId <= 0 || donationId > 2147483647) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const donorId = req.user.id;

    db.query(
        "DELETE FROM food_items WHERE id = ? AND donor_id = ? AND status = 'Available'",
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

                db.query(
                    "SELECT status FROM food_items WHERE id = ? AND donor_id = ?",
                    [donationId, donorId],
                    (checkErr, checkResult) => {
                        if (checkErr) {
                            console.error("DELETE DONATION CHECK ERROR:", checkErr);
                            return res.status(500).json({
                                success: false,
                                message: "Server Error"
                            });
                        }

                        if (checkResult.length > 0) {
                            return res.status(400).json({
                                success: false,
                                message: "Only available donations can be deleted."
                            });
                        }

                        return res.status(404).json({
                            success: false,
                            message: "Donation not found"
                        });
                    }
                );

                return;

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
    if (!Number.isInteger(donationId) || donationId <= 0 || donationId > 2147483647) {
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
                    message: "Server Error"
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
    if (!Number.isInteger(donationId) || donationId <= 0 || donationId > 2147483647) {
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
        const trimmed = food_name.trim();
        if (trimmed.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Food name must not exceed 200 characters."
            });
        }
        fields.push("food_name = ?");
        values.push(trimmed);
    }

    if (quantity !== undefined) {
        if (typeof quantity === "string" && quantity.trim().length > 20) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive number not exceeding 1,000,000."
            });
        }
        const parsedQuantity = Number(quantity);
        if (quantity === null || (typeof quantity === "string" && quantity.trim() === "") || isNaN(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > 1000000) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive number not exceeding 1,000,000."
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
        const trimmed = food_type.trim();
        if (trimmed.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Food type must not exceed 50 characters."
            });
        }
        fields.push("food_type = ?");
        values.push(trimmed);
    }

    if (expiry_time !== undefined) {
        if (typeof expiry_time === "string" && expiry_time.trim().length > 50) {
            return res.status(400).json({
                success: false,
                message: "Expiry time string exceeds maximum length."
            });
        }
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
        const trimmed = pickup_address.trim();
        if (trimmed.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Pickup address must not exceed 500 characters."
            });
        }
        fields.push("pickup_address = ?");
        values.push(trimmed);
    }

    if (image_url !== undefined && image_url !== null) {
        if (typeof image_url === "string") {
            const trimmed = image_url.trim();
            if (trimmed.length > 2048) {
                return res.status(400).json({
                    success: false,
                    message: "Image URL must not exceed 2048 characters."
                });
            }
            if (trimmed !== "") {
                fields.push("image_url = ?");
                values.push(trimmed);
            }
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
        WHERE id = ? AND donor_id = ? AND status = 'Available'
    `;

    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {
                console.error("UPDATE DONATION ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server Error"
                });
            }

            if (result.affectedRows === 0) {
                db.query(
                    "SELECT status FROM food_items WHERE id = ? AND donor_id = ?",
                    [donationId, donorId],
                    (checkErr, checkResult) => {
                        if (checkErr) {
                            console.error("UPDATE DONATION CHECK ERROR:", checkErr);
                            return res.status(500).json({
                                success: false,
                                message: "Server Error"
                            });
                        }

                        if (checkResult.length > 0) {
                            return res.status(400).json({
                                success: false,
                                message: "Only available donations can be updated."
                            });
                        }

                        return res.status(404).json({
                            success: false,
                            message: "Donation not found"
                        });
                    }
                );

                return;

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
