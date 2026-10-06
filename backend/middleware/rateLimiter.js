const { rateLimit } = require("express-rate-limit");

/**
 * Creates a rate limiter middleware with sensible defaults and consistent 429 error responses.
 *
 * @param {Object} options
 * @param {number} [options.windowMs] - Time window in milliseconds
 * @param {number|Function} [options.max] - Max requests within windowMs (or dynamic limit function)
 * @param {string} [options.message] - Error message to return when rate limit exceeded
 * @param {Function} [options.keyGenerator] - Custom key generator function
 * @param {Function} [options.skip] - Function to determine whether to skip rate limiting
 * @param {Object|boolean} [options.validate] - Validation settings for express-rate-limit
 * @returns {Function} Express rate limit middleware
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000,
        max = 100,
        message = "Too many requests. Please try again later.",
        statusCode = 429,
        keyGenerator,
        skip = () => false,
        validate = false
    } = options;

    return rateLimit({
        windowMs,
        limit: typeof max === "function" ? max : () => (typeof options.max === "number" ? options.max : max),
        statusCode,
        message,
        legacyHeaders: false,
        standardHeaders: "draft-7",
        validate,
        skip: (req, res) => {
            if (process.env.RATE_LIMIT_DISABLED === "true") {
                return true;
            }
            return typeof skip === "function" ? skip(req, res) : false;
        },
        keyGenerator: keyGenerator || ((req) => req.ip || req.socket?.remoteAddress || "unknown"),
        handler: (req, res, next, opts) => {
            res.status(opts.statusCode || statusCode).json({
                success: false,
                message: opts.message || message
            });
        }
    });
};

/**
 * Global API rate limiter.
 * Protects entire backend from excessive flooding.
 * Configurable via RATE_LIMIT_GLOBAL_WINDOW_MS and RATE_LIMIT_GLOBAL_MAX.
 */
const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: () => {
        if (process.env.RATE_LIMIT_GLOBAL_MAX) {
            const parsed = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        // In test environment without explicit RATE_LIMIT_GLOBAL_MAX, allow high headroom to prevent cross-test interference
        if (process.env.NODE_ENV === "test") {
            return 10000;
        }
        return 300;
    },
    message: "Too many requests. Please try again later."
});

/**
 * Authentication Login rate limiter.
 * Protects /api/auth/login against brute-force credential stuffing.
 * Configurable via RATE_LIMIT_AUTH_LOGIN_WINDOW_MS and RATE_LIMIT_AUTH_LOGIN_MAX.
 */
const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: () => {
        if (process.env.RATE_LIMIT_AUTH_LOGIN_MAX) {
            const parsed = parseInt(process.env.RATE_LIMIT_AUTH_LOGIN_MAX, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 10;
    },
    message: "Too many login attempts. Please try again later."
});

/**
 * Registration rate limiter.
 * Protects /api/auth/register against automated account creation spam.
 * Configurable via RATE_LIMIT_AUTH_REGISTER_WINDOW_MS and RATE_LIMIT_AUTH_REGISTER_MAX.
 */
const registerLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: () => {
        if (process.env.RATE_LIMIT_AUTH_REGISTER_MAX) {
            const parsed = parseInt(process.env.RATE_LIMIT_AUTH_REGISTER_MAX, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 10;
    },
    message: "Too many registration attempts. Please try again later."
});

/**
 * AI Recommendation rate limiter.
 * Protects /api/ngo/recommendations/:foodId against repetitive AI quota exhaustion.
 * Throttles per authenticated user ID (or IP as fallback).
 * Configurable via RATE_LIMIT_AI_MAX.
 */
const aiRecommendationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: () => {
        if (process.env.RATE_LIMIT_AI_MAX) {
            const parsed = parseInt(process.env.RATE_LIMIT_AI_MAX, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 30;
    },
    keyGenerator: (req) => {
        if (req.user && req.user.id) {
            return `ngo_user_${req.user.id}`;
        }
        return req.ip || req.socket?.remoteAddress || "unknown";
    },
    message: "Too many recommendation requests. Please try again later."
});

module.exports = {
    createRateLimiter,
    globalLimiter,
    loginLimiter,
    registerLimiter,
    aiRecommendationLimiter
};
