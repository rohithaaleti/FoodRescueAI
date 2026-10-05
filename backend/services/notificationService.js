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
