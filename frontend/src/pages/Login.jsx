import "./Login.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {

    const navigate = useNavigate();

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

            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(formData)
                }
            );

            const data = await response.json();

            if (response.ok) {

                // Save JWT Token
                localStorage.setItem("token", data.token);

                // Save Logged-in User Details
                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

                alert("Login Successful");

                // Redirect based on role
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

                alert(data.message);

            }

        } catch (error) {

            console.log(error);

            alert("Server Error");

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