import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
function NGODashboard() {

    const navigate = useNavigate();

    const [foodItems, setFoodItems] = useState([]);

    useEffect(() => {
        fetchAvailableFood();
    }, []);

    const fetchAvailableFood = async () => {
    try {
        const response = await api.get("/api/ngo/available-food");
        const data = response.data;

        if (data.success) {
            setFoodItems(data.foodItems);
        }
    } catch (error) {
        console.log(error);
    }
};

  const acceptDonation = async (id) => {
    try {
        const response = await api.put(`/api/ngo/accept/${id}`);
        const data = response.data;

        alert(data.message);

        if (response.status >= 200 && response.status < 300) {
            fetchAvailableFood();
        }
    } catch (error) {
        console.log(error);
        alert(error.response?.data?.message || "Server Error");
    }
};
    return (

        <div style={{ padding: "30px" }}>

            <h1>NGO Dashboard</h1>

            <button
                onClick={() => navigate("/ngo/my-donations")}
                style={{
                    marginBottom: "20px",
                    padding: "10px 20px",
                    cursor: "pointer"
                }}
            >
                My Accepted Donations
            </button>

            <h3>Available Food Donations</h3>

            <table border="1" cellPadding="10">

                <thead>

                    <tr>
                        <th>ID</th>
                        <th>Food Name</th>
                        <th>Quantity</th>
                        <th>Pickup Address</th>
                        <th>Expiry</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>

                    {foodItems.length === 0 ? (

                        <tr>
                            <td colSpan="7">No Available Donations</td>
                        </tr>

                    ) : (

                        foodItems.map((food) => (

                            <tr key={food.id}>

                                <td>{food.id}</td>
                                <td>{food.food_name}</td>
                                <td>{food.quantity}</td>
                                <td>{food.pickup_address}</td>
                                <td>
                                    {food.expiry_time
                                        ? new Date(food.expiry_time).toLocaleString()
                                        : "N/A"}
                                </td>
                                <td>{food.status}</td>

                                <td>

                                    <button
                                        onClick={() => acceptDonation(food.id)}
                                    >
                                        Accept
                                    </button>

                                </td>

                            </tr>

                        ))

                    )}

                </tbody>

            </table>

        </div>

    );

}

export default NGODashboard;