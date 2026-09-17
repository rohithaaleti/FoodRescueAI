import "./MyDonations.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
const MyDonations = () => {

    const [foodItems, setFoodItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDonations();
    }, []);

    // Fetch Donations
   const fetchDonations = async () => {

    try {

        const response = await api.get("/api/food/my-donations");

        const data = response.data;

        if (data.success) {
            setFoodItems(data.foodItems);
        }

    } catch (err) {

        console.error(err);

    }

};

    // Delete Donation
    const deleteDonation = async (id) => {

    const confirmDelete = window.confirm(
        "Are you sure you want to delete this donation?"
    );

    if (!confirmDelete) return;

    try {

        const response = await api.delete(`/api/food/${id}`);

        const data = response.data;

        if (data.success) {

            alert("Donation Deleted Successfully!");
            fetchDonations();

        } else {

            alert(data.message || "Failed to delete donation");

        }

    } catch (err) {

        console.error(err);

        alert(
            err.response?.data?.message ||
            "Something went wrong."
        );

    }

};

    return (

        <div className="my-donations">

            <h1>My Donations</h1>

            <table>

                <thead>

                    <tr>
                        <th>Food</th>
                        <th>Quantity</th>
                        <th>Type</th>
                        <th>Expiry</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>

                </thead>

                <tbody>

                    {foodItems.length === 0 ? (

                        <tr>
                            <td colSpan="6">
                                No Donations Yet
                            </td>
                        </tr>

                    ) : (

                        foodItems.map((item) => (

                            <tr key={item.id}>

                                <td>{item.food_name}</td>

                                <td>{item.quantity}</td>

                                <td>{item.food_type}</td>

                                <td>
                                    {new Date(item.expiry_time).toLocaleString()}
                                </td>

                                <td>{item.status}</td>

                                <td>

                                    <button
                                        onClick={() => navigate(`/edit/${item.id}`)}
                                        style={{ marginRight: "10px" }}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        onClick={() => deleteDonation(item.id)}
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>

                        ))

                    )}

                </tbody>

            </table>

        </div>

    );

};

export default MyDonations;