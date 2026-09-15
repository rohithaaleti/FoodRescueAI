const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// ==========================
// Register User
// ==========================
const registerUser = async (req, res) => {

    try {

        const {
            full_name,
            email,
            password,
            phone,
            role,
            organization_name,
            address
        } = req.body;

        const ALLOWED_ROLES = ["restaurant", "ngo", "volunteer"];

        if (
            typeof full_name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof role !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        const trimmedName = full_name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedRole = role.trim();

        if (!trimmedName || !trimmedEmail || !password || !trimmedRole) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format."
            });
        }

        if (!ALLOWED_ROLES.includes(trimmedRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Allowed roles: restaurant, ngo, volunteer."
            });
        }

        const trimmedPhone = typeof phone === "string" ? phone.trim() : (phone || null);
        const trimmedOrg = typeof organization_name === "string" ? organization_name.trim() : (organization_name || null);
        const trimmedAddress = typeof address === "string" ? address.trim() : (address || null);

        db.query(
            "SELECT * FROM users WHERE email = ?",
            [trimmedEmail],
            async (err, result) => {

                if (err) {
                    console.log("REGISTER SELECT ERROR:", err);

                    return res.status(500).json({
                        success: false,
                        error: "Server Error"
                    });
                }

                if (result.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Email already registered."
                    });
                }

                const hashedPassword =
                    await bcrypt.hash(password, 10);

                db.query(
                    `INSERT INTO users
                    (full_name,email,password,phone,role,organization_name,address)
                    VALUES (?,?,?,?,?,?,?)`,
                    [
                        trimmedName,
                        trimmedEmail,
                        hashedPassword,
                        trimmedPhone,
                        trimmedRole,
                        trimmedOrg,
                        trimmedAddress
                    ],
                    (err, result) => {

                        if (err) {

                            console.log("REGISTER INSERT ERROR:", err);

                            return res.status(500).json({
                                success: false,
                                error: "Server Error"
                            });

                        }

                        res.status(201).json({
                            success: true,
                            message: "User Registered Successfully"
                        });

                    }
                );

            }
        );

    } catch (error) {

        console.log("REGISTER CATCH:", error);

        res.status(500).json({
            success: false,
            error: "Server Error"
        });

    }

};

// ==========================
// Login User
// ==========================
const loginUser = (req, res) => {

    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
    ) {

        return res.status(400).json({
            success: false,
            message: "Email and Password are required"
        });

    }

    const trimmedEmail = email.trim().toLowerCase();

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [trimmedEmail],
        async (err, result) => {

            if (err) {

                console.log("LOGIN SELECT ERROR:", err);

                return res.status(500).json({
                    success: false,
                    error: "Server Error"
                });

            }

            if (result.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });

            }

            const user = result[0];

            try {

                const match = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!match) {

                    return res.status(401).json({
                        success: false,
                        message: "Invalid Password"
                    });

                }

                const token = jwt.sign(
                    {
                        id: user.id,
                        role: user.role
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: "1d"
                    }
                );

                res.json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        role: user.role
                    }
                });

            } catch (error) {

                console.log("LOGIN BCRYPT/JWT ERROR:", error);

                return res.status(500).json({
                    success: false,
                    error: "Server Error"
                });

            }

        }
    );

};

module.exports = {
    registerUser,
    loginUser
};
