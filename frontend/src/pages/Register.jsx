import "./Register.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
function Register() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        phone: "",
        role: "",
        organization_name: "",
        address: ""
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
            "/api/auth/register",
            formData
        );

        const data = response.data;

        if (response.status >= 200 && response.status < 300) {

            alert("Registration Successful");
            navigate("/login");

        } else {

            alert(data.message || "Registration failed");

        }

    } catch (err) {

        console.error(err);

        alert(
            err.response?.data?.message ||
            "Server Error"
        );

    }
};

    return (

        <div className="register-page">

            <form
                className="register-card"
                onSubmit={handleSubmit}
            >

                <h1>Create Account</h1>

                <p>Join FoodRescue AI</p>

                <input
                    type="text"
                    name="full_name"
                    placeholder="Full Name"
                    onChange={handleChange}
                    required
                />

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleChange}
                    required
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    onChange={handleChange}
                    required
                />

                <input
                    type="text"
                    name="phone"
                    placeholder="Phone"
                    onChange={handleChange}
                />

                <select
                    name="role"
                    onChange={handleChange}
                    required
                >

                    <option value="">
                        Select Role
                    </option>

                    <option value="restaurant">
                        Restaurant
                    </option>

                    <option value="ngo">
                        NGO
                    </option>

                    <option value="volunteer">
                        Volunteer
                    </option>

                </select>

                <input
                    type="text"
                    name="organization_name"
                    placeholder="Organization Name"
                    onChange={handleChange}
                />

                <textarea
                    name="address"
                    placeholder="Address"
                    rows="3"
                    onChange={handleChange}
                />

                <button type="submit">
                    Register
                </button>

                <span>
                    Already have an account?
                    <Link to="/login"> Login</Link>
                </span>

            </form>

        </div>

    );

}

export default Register;