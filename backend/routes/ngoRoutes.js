const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");

const {
    getAvailableFood,
    acceptDonation,
    getMyAcceptedDonations,
    markAsDelivered
} = require("../controllers/ngoController");

// Available Donations
router.get("/available-food", getAvailableFood);

// My Accepted Donations
router.get("/my-donations", verifyToken, getMyAcceptedDonations);

// Accept Donation
router.put("/accept/:id", verifyToken, acceptDonation);

// Mark Donation as Delivered
router.put("/deliver/:id", verifyToken, markAsDelivered);

module.exports = router;