const db = require("../config/db");
const matchingService = require("../services/matchingService");
const aiRecommendationService = require("../services/aiRecommendationService");
const notificationService = require("../services/notificationService");

// ==========================
// Get Available Food
// ==========================
const getAvailableFood = (req, res) => {

    const sql = `
        SELECT *
        FROM food_items
        WHERE status='Available'
            AND expiry_time > NOW()
        ORDER BY id DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.error("GET AVAILABLE FOOD ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Server Error"
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

    const donationId = Number(req.params.id);
    if (!Number.isInteger(donationId) || donationId <= 0 || donationId > 2147483647) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const ngoId = req.user.id;

    const sql = `
        UPDATE food_items
        SET
            status='Reserved',
            accepted_by=?,
            accepted_time=NOW()
        WHERE
            id=?
            AND status='Available'
            AND expiry_time > NOW()
    `;

    db.query(sql, [ngoId, donationId], async (err, result) => {

        if (err) {
            console.error("ACCEPT DONATION ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Server Error"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: "Donation already accepted or not found."
            });
        }

        try {
            const fetchSql = "SELECT donor_id FROM food_items WHERE id = ?";
            const rows = await new Promise((resolve, reject) => {
                db.query(fetchSql, [donationId], (fetchErr, results) => {
                    if (fetchErr) return reject(fetchErr);
                    resolve(results);
                });
            });

            if (Array.isArray(rows) && rows.length > 0 && rows[0].donor_id) {
                await notificationService.createNotification({
                    userId: rows[0].donor_id,
                    type: "DONATION_ACCEPTED",
                    title: "Donation Accepted",
                    message: "Your donation has been accepted by an NGO.",
                    donationId
                });
            }
        } catch (notifErr) {
            console.error("NOTIFICATION DISPATCH ERROR (DONATION_ACCEPTED):", notifErr);
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
            console.error("GET ACCEPTED DONATIONS ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Server Error"
            });
        }

        res.json({
            success: true,
            donations: result
        });

    });

};
// ==========================
// Get Recommendations for Donation
// ==========================
const getRecommendationsForDonation = (req, res) => {
    const foodId = Number(req.params.foodId);
    if (!Number.isInteger(foodId) || foodId <= 0 || foodId > 2147483647) {
        return res.status(400).json({
            success: false,
            message: "Invalid donation ID."
        });
    }

    const sql = "SELECT * FROM food_items WHERE id = ?";
    db.query(sql, [foodId], async (err, result) => {
        if (err) {
            console.error("GET RECOMMENDATIONS ERROR:", err);
            return res.status(500).json({ success: false, message: "Server Error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        const donation = result[0];

        if (donation.status !== "Available") {
            return res.status(400).json({ success: false, message: "Donation is not available" });
        }

        const now = Date.now();
        if (new Date(donation.expiry_time).getTime() <= now) {
            return res.status(400).json({ success: false, message: "Donation has expired" });
        }

        try {
            const matchResult = await matchingService.getMatchingNGOsForDonation(foodId);
            const aiResult = await aiRecommendationService.enhanceRecommendations(donation, matchResult.recommendations);
            
            res.json({
                success: true,
                id: donation.id,
                food_name: donation.food_name,
                food_type: donation.food_type,
                quantity: donation.quantity,
                expiry_time: donation.expiry_time,
                ai_summary: aiResult.summary || null,
                recommendations: aiResult.recommendations
            });
        } catch (matchErr) {
            console.error("MATCHING SERVICE ERROR:", matchErr);
            return res.status(500).json({ success: false, message: "Server Error" });
        }
    });
};

// ==========================
// Get NGO Profile
// ==========================
const getNGOProfile = (req, res) => {
    if (req.user.role !== "ngo") {
        return res.status(403).json({
            success: false,
            message: "Only NGOs can access profile."
        });
    }

    const ngoUserId = req.user.id;

    const sql = `
        SELECT 
            u.id AS user_id,
            u.full_name,
            u.email,
            u.phone,
            u.organization_name,
            u.address,
            np.id AS profile_id,
            np.latitude,
            np.longitude,
            np.max_capacity,
            np.supported_food_types,
            np.is_active,
            np.max_active_donations,
            np.updated_at
        FROM users u
        LEFT JOIN ngo_profiles np ON u.id = np.user_id
        WHERE u.id = ? AND u.role = 'ngo'
    `;

    db.query(sql, [ngoUserId], (err, results) => {
        if (err) {
            console.error("GET NGO PROFILE ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Server Error"
            });
        }

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "NGO user not found."
            });
        }

        const row = results[0];
        const profile = {
            user_id: row.user_id,
            full_name: row.full_name,
            email: row.email,
            phone: row.phone,
            organization_name: row.organization_name,
            address: row.address,
            latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
            longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
            max_capacity: row.max_capacity !== null && row.max_capacity !== undefined ? Number(row.max_capacity) : 100,
            supported_food_types: row.supported_food_types || "Veg,Non-Veg,Vegan,Other",
            is_active: row.is_active !== null && row.is_active !== undefined ? Number(row.is_active) : 1,
            max_active_donations: row.max_active_donations !== null && row.max_active_donations !== undefined ? Number(row.max_active_donations) : 3,
            updated_at: row.updated_at || null
        };

        res.json({
            success: true,
            profile
        });
    });
};

// ==========================
// Update NGO Profile
// ==========================
const updateNGOProfile = (req, res) => {
    if (req.user.role !== "ngo") {
        return res.status(403).json({
            success: false,
            message: "Only NGOs can update profile."
        });
    }

    const ngoUserId = req.user.id;
    const {
        max_capacity,
        supported_food_types,
        max_active_donations,
        is_active,
        latitude,
        longitude
    } = req.body;

    // Validate max_capacity
    const capacityNum = Number(max_capacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0 || capacityNum > 1000000) {
        return res.status(400).json({
            success: false,
            message: "Max capacity must be a positive integer between 1 and 1,000,000."
        });
    }

    // Validate max_active_donations
    const activeDonationsNum = Number(max_active_donations);
    if (!Number.isInteger(activeDonationsNum) || activeDonationsNum <= 0 || activeDonationsNum > 1000) {
        return res.status(400).json({
            success: false,
            message: "Max active donations must be a positive integer between 1 and 1,000."
        });
    }

    // Validate is_active
    const isActiveVal = (is_active === 1 || is_active === true || is_active === "1") ? 1 : 0;

    // Validate latitude
    let latVal = null;
    if (latitude !== null && latitude !== undefined && latitude !== "") {
        const latNum = Number(latitude);
        if (isNaN(latNum) || latNum < -90 || latNum > 90) {
            return res.status(400).json({
                success: false,
                message: "Latitude must be between -90 and 90."
            });
        }
        latVal = latNum;
    }

    // Validate longitude
    let lonVal = null;
    if (longitude !== null && longitude !== undefined && longitude !== "") {
        const lonNum = Number(longitude);
        if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
            return res.status(400).json({
                success: false,
                message: "Longitude must be between -180 and 180."
            });
        }
        lonVal = lonNum;
    }

    // Validate supported_food_types
    if (typeof supported_food_types === "string" && supported_food_types.length > 255) {
        return res.status(400).json({
            success: false,
            message: "Supported food types must not exceed 255 characters."
        });
    }

    if (Array.isArray(supported_food_types) && supported_food_types.length > 10) {
        return res.status(400).json({
            success: false,
            message: "Too many supported food types provided."
        });
    }

    const ALLOWED_FOOD_TYPES = ["Veg", "Non-Veg", "Vegan", "Other"];
    let foodTypesArray = [];
    if (Array.isArray(supported_food_types)) {
        foodTypesArray = supported_food_types.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof supported_food_types === "string") {
        foodTypesArray = supported_food_types.split(",").map(t => t.trim()).filter(Boolean);
    }

    if (foodTypesArray.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one supported food type is required."
        });
    }

    const invalidTypes = foodTypesArray.filter(t => !ALLOWED_FOOD_TYPES.includes(t));
    if (invalidTypes.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Invalid food types: ${invalidTypes.join(", ")}. Allowed values are: ${ALLOWED_FOOD_TYPES.join(", ")}`
        });
    }

    const foodTypesStr = foodTypesArray.join(",");
    if (foodTypesStr.length > 255) {
        return res.status(400).json({
            success: false,
            message: "Supported food types must not exceed 255 characters."
        });
    }

    const upsertSql = `
        INSERT INTO ngo_profiles (
            user_id, latitude, longitude, max_capacity, supported_food_types, is_active, max_active_donations
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            max_capacity = VALUES(max_capacity),
            supported_food_types = VALUES(supported_food_types),
            is_active = VALUES(is_active),
            max_active_donations = VALUES(max_active_donations)
    `;

    db.query(
        upsertSql,
        [ngoUserId, latVal, lonVal, capacityNum, foodTypesStr, isActiveVal, activeDonationsNum],
        (err) => {
            if (err) {
                console.error("UPDATE NGO PROFILE ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server Error"
                });
            }

            res.json({
                success: true,
                message: "Profile updated successfully.",
                profile: {
                    user_id: ngoUserId,
                    latitude: latVal,
                    longitude: lonVal,
                    max_capacity: capacityNum,
                    supported_food_types: foodTypesStr,
                    is_active: isActiveVal,
                    max_active_donations: activeDonationsNum
                }
            });
        }
    );
};

module.exports = {
    getAvailableFood,
    acceptDonation,
    getMyAcceptedDonations,
    getRecommendationsForDonation,
    getNGOProfile,
    updateNGOProfile
};
