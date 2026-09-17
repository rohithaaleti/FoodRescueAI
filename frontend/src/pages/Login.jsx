import "./Login.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

function Login() {

    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const response = await api.post(
                "/api/auth/login",
                formData
            );

            const data = response.data;

            if (data.token && data.user) {

                login({
    token: data.token,
    user: data.user
});

                alert("Login Successful");

                if (data.user.role === "restaurant") {
                    navigate("/restaurant");
                } else if (data.user.role === "ngo") {
                    navigate("/ngo");
                } else if (data.user.role === "volunteer") {
                    navigate("/volunteer");
                } else if (data.user.role === "admin") {
                    navigate("/admin");
                } else {
                    alert("Unknown User Role");
                }

            } else {

                alert(data.message || "Login failed");

            }

        } catch (error) {

            console.error(error);

            alert(
                error.response?.data?.message ||
                "Server Error"
            );

        }

    };

    return (
        <div className="login-page">

            <form
                className="login-card"
                onSubmit={handleSubmit}
            >

                <h1>Welcome Back 👋</h1>

                <p>Login to FoodRescue AI</p>

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <button type="submit">
                    Login
                </button>

                <span>
                    Don't have an account?
                    <Link to="/register">
                        Register
                    </Link>
                </span>

            </form>

        </div>
    );
}

export default Login;