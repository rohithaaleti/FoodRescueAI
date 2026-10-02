const db = require("../config/db");
const matchingService = require("../services/matchingService");
const aiRecommendationService = require("../services/aiRecommendationService");

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
    if (!Number.isInteger(donationId) || donationId <= 0) {
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

    db.query(sql, [ngoId, donationId], (err, result) => {

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
    if (!Number.isInteger(foodId) || foodId <= 0) {
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

module.exports = {
    getAvailableFood,
    acceptDonation,
    getMyAcceptedDonations,
    getRecommendationsForDonation
};
