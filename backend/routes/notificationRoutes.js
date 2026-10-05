const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const { getNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");

// All notification routes require authentication
router.use(verifyToken);

// Get notifications
router.get("/", getNotifications);

// Mark all as read
router.put("/read-all", markAllAsRead);

// Mark one as read
router.put("/:id/read", markAsRead);

module.exports = router;
