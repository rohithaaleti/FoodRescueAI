const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");

const {
    getAvailableFood,
    acceptDonation,
    getMyAcceptedDonations,
    markAsDelivered
} = require("../controllers/ngoController");

// Available Donations — NGOs only
router.get("/available-food", verifyToken, requireRole("ngo"), getAvailableFood);

// My Accepted Donations
router.get("/my-donations", verifyToken, requireRole("ngo"), getMyAcceptedDonations);

// Accept Donation
router.put("/accept/:id", verifyToken, requireRole("ngo"), acceptDonation);

// Mark Donation as Delivered
router.put("/deliver/:id", verifyToken, requireRole("ngo"), markAsDelivered);

module.exports = router;