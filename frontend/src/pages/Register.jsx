import "./Register.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

            const response = await fetch(
                "http://localhost:5000/api/auth/register",
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

                alert("Registration Successful");
                navigate("/login");

            } else {

                alert(data.message);

            }

        } catch (err) {

            console.log(err);
            alert("Server Error");

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

                    <option value="admin">
                        Admin
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