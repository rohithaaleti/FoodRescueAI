const express = require("express");

const router = express.Router();

const {
    addFood,
    getMyDonations,
    getDashboardStats,
    deleteDonation,
    getDonationById,
    updateDonation
} = require("../controllers/foodController");

const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

// Add Food — restaurants only
router.post("/", verifyToken, requireRole("restaurant"), addFood);
router.put("/:id", verifyToken, updateDonation);
// Get Logged-in Restaurant Donations
router.get("/my-donations", verifyToken, getMyDonations);
router.get("/dashboard-stats", verifyToken, getDashboardStats);
router.get("/:id", verifyToken, getDonationById);
router.delete("/:id", verifyToken, deleteDonation);
module.exports = router;