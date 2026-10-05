const db = require("../config/db");

exports.getNotifications = (req, res) => {
    const userId = req.user.id;
    const { unreadOnly, limit, offset } = req.query;

    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
        parsedLimit = 20;
    } else if (parsedLimit > 100) {
        parsedLimit = 100;
    }

    let parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
        parsedOffset = 0;
    }

    const isUnreadOnly = unreadOnly === "true";

    let dataQuery = `SELECT * FROM notifications WHERE user_id = ?`;
    let countQuery = `SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = false`;
    const dataValues = [userId];

    if (isUnreadOnly) {
        dataQuery += ` AND is_read = false`;
    }

    dataQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    dataValues.push(parsedLimit, parsedOffset);

    // Execute queries in parallel
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(dataQuery, dataValues, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(countQuery, [userId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0].unreadCount);
            });
        })
    ])
    .then(([notifications, unreadCount]) => {
        res.json({
            notifications,
            unreadCount,
            limit: parsedLimit,
            offset: parsedOffset
        });
    })
    .catch(err => {
        console.error("GET NOTIFICATIONS ERROR:", err);
        res.status(500).json({ error: "Failed to fetch notifications." });
    });
};

exports.markAsRead = (req, res) => {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id, 10);

    if (isNaN(notificationId) || notificationId <= 0) {
        return res.status(400).json({ error: "Invalid notification ID." });
    }

    const checkQuery = `SELECT id, is_read FROM notifications WHERE id = ? AND user_id = ?`;
    db.query(checkQuery, [notificationId, userId], (err, results) => {
        if (err) {
            console.error("CHECK NOTIFICATION ERROR:", err);
            return res.status(500).json({ error: "Internal server error." });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Notification not found." });
        }

        if (results[0].is_read) {
            return res.json({ message: "Notification marked as read." });
        }

        const updateQuery = `UPDATE notifications SET is_read = true WHERE id = ?`;
        db.query(updateQuery, [notificationId], (err) => {
            if (err) {
                console.error("UPDATE NOTIFICATION ERROR:", err);
                return res.status(500).json({ error: "Failed to mark as read." });
            }
            res.json({ message: "Notification marked as read." });
        });
    });
};

exports.markAllAsRead = (req, res) => {
    const userId = req.user.id;

    const updateQuery = `UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false`;
    db.query(updateQuery, [userId], (err, result) => {
        if (err) {
            console.error("MARK ALL AS READ ERROR:", err);
            return res.status(500).json({ error: "Failed to mark all as read." });
        }
        res.json({ message: "All notifications marked as read.", updatedCount: result.affectedRows });
    });
};
