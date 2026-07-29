const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");

const {
    getDashboardStats,
    getAllUsers,
    getAllDonations
} = require("../controllers/adminController");

router.get("/dashboard", verifyToken, getDashboardStats);

router.get("/users", verifyToken, getAllUsers);

router.get("/donations", verifyToken, getAllDonations);

module.exports = router;