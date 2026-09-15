const db = require("../config/db");

// ==========================
// Get Available Deliveries
// ==========================

const getAvailableDeliveries = (req, res) => {

    if (req.user.role !== "volunteer") {
        return res.status(403).json({
            success: false,
            message: "Only volunteers can access deliveries."
        });
    }

    const sql = `
        SELECT
            food_items.id,
            food_items.food_name,
            food_items.quantity,
            food_items.pickup_address,
            food_items.status,
            food_items.accepted_time,
            restaurant.full_name AS restaurant,
            ngo.full_name AS ngo
        FROM food_items
        JOIN users AS restaurant
            ON food_items.donor_id = restaurant.id
        JOIN users AS ngo
            ON food_items.accepted_by = ngo.id
        WHERE food_items.status = 'Reserved'
        ORDER BY food_items.accepted_time DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.error("GET AVAILABLE DELIVERIES ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Server Error"
            });
        }

        res.json({
            success: true,
            deliveries: result
        });

    });

};


// ==========================
// Accept Delivery
// ==========================

const acceptDelivery = (req, res) => {

    if (req.user.role !== "volunteer") {
        return res.status(403).json({
            success: false,
            message: "Only volunteers can accept deliveries."
        });
    }

    const volunteerId = req.user.id;
    const donationId = Number(req.params.id);
    if (!Number.isInteger(donationId) || donationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const sql = `
        UPDATE food_items
        SET
            status = 'Assigned',
            volunteer_id = ?,
            volunteer_assigned_time = NOW()
        WHERE
            id = ?
            AND status = 'Reserved'
            AND volunteer_id IS NULL
    `;

    db.query(
        sql,
        [volunteerId, donationId],
        (err, result) => {

            if (err) {
                console.error("ACCEPT DELIVERY ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server Error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Delivery already assigned or not found."
                });
            }

            res.json({
                success: true,
                message: "Delivery accepted successfully."
            });

        }
    );

};


// ==========================
// My Deliveries
// ==========================

const getMyDeliveries = (req, res) => {

    if (req.user.role !== "volunteer") {
        return res.status(403).json({
            success: false,
            message: "Only volunteers can access their deliveries."
        });
    }

    const volunteerId = req.user.id;

    const sql = `
        SELECT
            food_items.id,
            food_items.food_name,
            food_items.quantity,
            food_items.pickup_address,
            food_items.status,
            food_items.accepted_time,
            food_items.volunteer_assigned_time,
            restaurant.full_name AS restaurant,
            ngo.full_name AS ngo
        FROM food_items
        JOIN users AS restaurant
            ON food_items.donor_id = restaurant.id
        JOIN users AS ngo
            ON food_items.accepted_by = ngo.id
        WHERE food_items.volunteer_id = ?
        ORDER BY food_items.volunteer_assigned_time DESC
    `;

    db.query(
        sql,
        [volunteerId],
        (err, result) => {

            if (err) {
                console.error("GET MY DELIVERIES ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server Error"
                });
            }

            res.json({
                success: true,
                deliveries: result
            });

        }
    );

};


// ==========================
// Mark Delivery Completed
// ==========================

const markDeliveryCompleted = (req, res) => {

    if (req.user.role !== "volunteer") {
        return res.status(403).json({
            success: false,
            message: "Only volunteers can complete deliveries."
        });
    }

    const volunteerId = req.user.id;
    const donationId = Number(req.params.id);
    if (!Number.isInteger(donationId) || donationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const sql = `
        UPDATE food_items
        SET status = 'Completed'
        WHERE
            id = ?
            AND volunteer_id = ?
            AND status = 'Assigned'
    `;

    db.query(
        sql,
        [donationId, volunteerId],
        (err, result) => {

            if (err) {
                console.error("MARK DELIVERY COMPLETED ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server Error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Delivery not found or already completed."
                });
            }

            res.json({
                success: true,
                message: "Delivery marked as completed."
            });

        }
    );

};


module.exports = {
    getAvailableDeliveries,
    acceptDelivery,
    getMyDeliveries,
    markDeliveryCompleted
};
