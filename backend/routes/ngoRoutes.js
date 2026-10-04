const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");

const {
    getAvailableFood,
    acceptDonation,
    getMyAcceptedDonations,
    getRecommendationsForDonation,
    getNGOProfile,
    updateNGOProfile
} = require("../controllers/ngoController");

// Available Donations — NGOs only
router.get("/available-food", verifyToken, requireRole("ngo"), getAvailableFood);

// My Accepted Donations
router.get("/my-donations", verifyToken, requireRole("ngo"), getMyAcceptedDonations);

// Recommendations for a donation
router.get("/recommendations/:foodId", verifyToken, requireRole("ngo"), getRecommendationsForDonation);

// Accept Donation
router.put("/accept/:id", verifyToken, requireRole("ngo"), acceptDonation);

// NGO Matching Profile / Settings
router.get("/profile", verifyToken, requireRole("ngo"), getNGOProfile);
router.put("/profile", verifyToken, requireRole("ngo"), updateNGOProfile);

module.exports = router;

