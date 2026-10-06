require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const ngoRoutes = require("./routes/ngoRoutes");
const adminRoutes = require("./routes/adminRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { globalLimiter } = require("./middleware/rateLimiter");

const app = express();

// Set security headers
app.use(helmet());

// Configure CORS
const allowedOrigins = process.env.FRONTEND_ORIGIN 
    ? process.env.FRONTEND_ORIGIN.split(',') 
    : ["http://localhost:5173"];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = "The CORS policy for this site does not allow access from the specified Origin.";
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(globalLimiter);


// ==========================
// Routes
// ==========================

app.use("/api/auth", authRoutes);

app.use("/api/food", foodRoutes);

app.use("/api/ngo", ngoRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/volunteer", volunteerRoutes);
app.use("/api/notifications", notificationRoutes);


// ==========================
// Test Route
// ==========================

app.get("/", (req, res) => {
    res.send("🚀 FoodRescue AI Backend Running Successfully!");
});


// ==========================
// Start Server
// ==========================

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
