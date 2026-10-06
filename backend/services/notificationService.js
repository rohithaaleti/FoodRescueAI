const db = require("../config/db");

/**
 * Creates an in-app notification for a single recipient user.
 * Uses INSERT IGNORE so duplicate notifications violating the unique constraint
 * (user_id, donation_id, type) are safely ignored.
 *
 * @param {Object} params
 * @param {number} params.userId - Recipient user ID
 * @param {string} params.type - Notification event type (e.g. 'DONATION_ACCEPTED')
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {number|null} [params.donationId=null] - Optional associated donation ID
 * @returns {Promise<{inserted: boolean, id: number|null, affectedRows: number}>}
 */
function createNotification({ userId, type, title, message, donationId = null }) {
    return new Promise((resolve, reject) => {
        if (!userId || !type || !title || !message) {
            const err = new Error("Missing required notification fields: userId, type, title, and message are required.");
            return reject(err);
        }

        if (typeof type !== "string" || type.trim().length > 50) {
            return reject(new Error("Notification type must not exceed 50 characters."));
        }

        if (typeof title !== "string" || title.trim().length > 255) {
            return reject(new Error("Notification title must not exceed 255 characters."));
        }

        if (typeof message !== "string" || message.trim().length > 5000) {
            return reject(new Error("Notification message must not exceed 5000 characters."));
        }

        const validUserId = Number(userId);
        if (!Number.isInteger(validUserId) || validUserId <= 0 || validUserId > 2147483647) {
            return reject(new Error("Invalid recipient user ID."));
        }

        let validDonationId = null;
        if (donationId !== undefined && donationId !== null) {
            validDonationId = Number(donationId);
            if (!Number.isInteger(validDonationId) || validDonationId <= 0 || validDonationId > 2147483647) {
                return reject(new Error("Invalid donation ID."));
            }
        }

        const sql = `
            INSERT IGNORE INTO notifications (user_id, type, title, message, donation_id)
            VALUES (?, ?, ?, ?, ?)
        `;

        const values = [
            userId,
            type,
            title,
            message,
            donationId !== undefined && donationId !== null ? donationId : null
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("CREATE NOTIFICATION ERROR:", err);
                return reject(err);
            }

            const inserted = Boolean(result && result.affectedRows > 0);
            return resolve({
                inserted,
                id: inserted && result.insertId ? result.insertId : null,
                affectedRows: result ? result.affectedRows : 0
            });
        });
    });
}

module.exports = {
    createNotification
};
