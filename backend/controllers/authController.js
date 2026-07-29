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

        if (
            !full_name ||
            !email ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        db.query(
            "SELECT * FROM users WHERE email = ?",
            [email],
            async (err, result) => {

                if (err) {
                    console.log("REGISTER SELECT ERROR:", err);

                    return res.status(500).json({
                        success: false,
                        error: err.message
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
                        full_name,
                        email,
                        hashedPassword,
                        phone,
                        role,
                        organization_name,
                        address
                    ],
                    (err, result) => {

                        if (err) {

                            console.log("REGISTER INSERT ERROR:", err);

                            return res.status(500).json({
                                success: false,
                                error: err.message
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
            error: error.message
        });

    }

};

// ==========================
// Login User
// ==========================
const loginUser = (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            success: false,
            message: "Email and Password are required"
        });

    }

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, result) => {

            if (err) {

                console.log("LOGIN SELECT ERROR:", err);

                return res.status(500).json({
                    success: false,
                    error: err.message
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
                    error: error.message
                });

            }

        }
    );

};

module.exports = {
    registerUser,
    loginUser
};