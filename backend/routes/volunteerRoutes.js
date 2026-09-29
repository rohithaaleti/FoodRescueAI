const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");

const {
    getAvailableDeliveries,
    acceptDelivery,
    getMyDeliveries,
    markDeliveryCompleted
} = require("../controllers/volunteerController");


// Available deliveries
router.get(
    "/available-deliveries",
    verifyToken,
    requireRole("volunteer"),
    getAvailableDeliveries
);


// Accept delivery
router.put(
    "/accept/:id",
    verifyToken,
    requireRole("volunteer"),
    acceptDelivery
);


// My deliveries
router.get(
    "/my-deliveries",
    verifyToken,
    requireRole("volunteer"),
    getMyDeliveries
);


// Complete delivery
router.put(
    "/complete/:id",
    verifyToken,
    requireRole("volunteer"),
    markDeliveryCompleted
);


module.exports = router;