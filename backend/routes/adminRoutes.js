const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");

const {
    getDashboardStats,
    getAllUsers,
    getAllDonations,
    deleteDonation
} = require("../controllers/adminController");

// Dashboard
router.get("/dashboard", verifyToken, requireRole("admin"), getDashboardStats);

// Users
router.get("/users", verifyToken, requireRole("admin"), getAllUsers);

// Donations
router.get("/donations", verifyToken, requireRole("admin"), getAllDonations);

// Delete Donation
router.delete("/donation/:id", verifyToken, requireRole("admin"), deleteDonation);

module.exports = router;