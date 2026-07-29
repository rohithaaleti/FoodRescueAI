import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function NGODashboard() {

    const navigate = useNavigate();

    const [foodItems, setFoodItems] = useState([]);

    useEffect(() => {
        fetchAvailableFood();
    }, []);

    const fetchAvailableFood = async () => {

        try {

            const response = await fetch(
                "http://localhost:5000/api/ngo/available-food"
            );

            const data = await response.json();

            if (data.success) {
                setFoodItems(data.foodItems);
            }

        } catch (error) {
            console.log(error);
        }

    };

    const acceptDonation = async (id) => {

        try {

            const token = localStorage.getItem("token");

            const response = await fetch(

                `http://localhost:5000/api/ngo/accept/${id}`,

                {

                    method: "PUT",

                    headers: {
                        Authorization: `Bearer ${token}`
                    }

                }

            );

            const data = await response.json();

            alert(data.message);

            if (response.ok) {
                fetchAvailableFood();
            }

        } catch (error) {

            console.log(error);
            alert("Server Error");

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
                        <th>Status</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>

                    {foodItems.length === 0 ? (

                        <tr>
                            <td colSpan="6">No Available Donations</td>
                        </tr>

                    ) : (

                        foodItems.map((food) => (

                            <tr key={food.id}>

                                <td>{food.id}</td>
                                <td>{food.food_name}</td>
                                <td>{food.quantity}</td>
                                <td>{food.pickup_address}</td>
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