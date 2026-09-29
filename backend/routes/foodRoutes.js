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

const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");

// Restaurant routes
router.post("/", verifyToken, requireRole("restaurant"), addFood);
router.put("/:id", verifyToken, requireRole("restaurant"), updateDonation);
router.get("/my-donations", verifyToken, requireRole("restaurant"), getMyDonations);
router.get("/dashboard-stats", verifyToken, requireRole("restaurant"), getDashboardStats);
router.get("/:id", verifyToken, requireRole("restaurant"), getDonationById);
router.delete("/:id", verifyToken, requireRole("restaurant"), deleteDonation);

module.exports = router;