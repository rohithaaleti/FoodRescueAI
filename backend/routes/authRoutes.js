const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser
} = require("../controllers/authController");
const {
    loginLimiter,
    registerLimiter
} = require("../middleware/rateLimiter");

// Register
router.post(
    "/register",
    registerLimiter,
    registerUser
);

// Login
router.post(
    "/login",
    loginLimiter,
    loginUser
);

module.exports = router;