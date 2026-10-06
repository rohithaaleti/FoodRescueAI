const db = require("../config/db");
const notificationService = require("../services/notificationService");

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
    if (!Number.isInteger(donationId) || donationId <= 0 || donationId > 2147483647) {
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
        async (err, result) => {

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

            try {
                const fetchSql = "SELECT donor_id, accepted_by FROM food_items WHERE id = ?";
                const rows = await new Promise((resolve, reject) => {
                    db.query(fetchSql, [donationId], (fetchErr, results) => {
                        if (fetchErr) return reject(fetchErr);
                        resolve(results);
                    });
                });

                if (Array.isArray(rows) && rows.length > 0) {
                    const donation = rows[0];
                    const promises = [];

                    if (donation.donor_id) {
                        promises.push(
                            notificationService.createNotification({
                                userId: donation.donor_id,
                                type: "VOLUNTEER_ASSIGNED",
                                title: "Volunteer Assigned",
                                message: "A volunteer has been assigned to your donation.",
                                donationId
                            })
                        );
                    }

                    if (donation.accepted_by) {
                        promises.push(
                            notificationService.createNotification({
                                userId: donation.accepted_by,
                                type: "VOLUNTEER_ASSIGNED",
                                title: "Volunteer Assigned",
                                message: "A volunteer has been assigned to the donation.",
                                donationId
                            })
                        );
                    }

                    const results = await Promise.allSettled(promises);
                    results.forEach((r) => {
                        if (r.status === "rejected") {
                            console.error("NOTIFICATION DISPATCH ERROR (VOLUNTEER_ASSIGNED):", r.reason);
                        }
                    });
                }
            } catch (notifErr) {
                console.error("NOTIFICATION DISPATCH ERROR (VOLUNTEER_ASSIGNED):", notifErr);
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
    if (!Number.isInteger(donationId) || donationId <= 0 || donationId > 2147483647) {
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
        async (err, result) => {

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

            try {
                const fetchSql = "SELECT donor_id, accepted_by FROM food_items WHERE id = ?";
                const rows = await new Promise((resolve, reject) => {
                    db.query(fetchSql, [donationId], (fetchErr, results) => {
                        if (fetchErr) return reject(fetchErr);
                        resolve(results);
                    });
                });

                if (Array.isArray(rows) && rows.length > 0) {
                    const donation = rows[0];
                    const promises = [];

                    if (donation.donor_id) {
                        promises.push(
                            notificationService.createNotification({
                                userId: donation.donor_id,
                                type: "DONATION_COMPLETED",
                                title: "Donation Completed",
                                message: "Your donation has been successfully delivered.",
                                donationId
                            })
                        );
                    }

                    if (donation.accepted_by) {
                        promises.push(
                            notificationService.createNotification({
                                userId: donation.accepted_by,
                                type: "DONATION_COMPLETED",
                                title: "Donation Completed",
                                message: "The donation delivery has been completed.",
                                donationId
                            })
                        );
                    }

                    const results = await Promise.allSettled(promises);
                    results.forEach((r) => {
                        if (r.status === "rejected") {
                            console.error("NOTIFICATION DISPATCH ERROR (DONATION_COMPLETED):", r.reason);
                        }
                    });
                }
            } catch (notifErr) {
                console.error("NOTIFICATION DISPATCH ERROR (DONATION_COMPLETED):", notifErr);
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
