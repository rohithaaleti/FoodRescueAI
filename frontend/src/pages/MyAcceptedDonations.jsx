import { useEffect, useState } from "react";

function MyAcceptedDonations() {

    const [donations, setDonations] = useState([]);

    useEffect(() => {
        fetchMyDonations();
    }, []);

    const fetchMyDonations = async () => {

        try {

            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/ngo/my-donations",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                setDonations(data.donations);
            }

        } catch (error) {
            console.log(error);
        }

    };

    const markDelivered = async (id) => {

        try {

            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:5000/api/ngo/deliver/${id}`,
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
                fetchMyDonations();
            }

        } catch (error) {

            console.log(error);
            alert("Server Error");

        }

    };

    return (

        <div style={{ padding: "30px" }}>

            <h1>My Accepted Donations</h1>

            <table border="1" cellPadding="10">

                <thead>

                    <tr>
                        <th>ID</th>
                        <th>Food Name</th>
                        <th>Quantity</th>
                        <th>Pickup Address</th>
                        <th>Status</th>
                        <th>Accepted Time</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>

                    {donations.length === 0 ? (

                        <tr>
                            <td colSpan="7">No Accepted Donations</td>
                        </tr>

                    ) : (

                        donations.map((food) => (

                            <tr key={food.id}>

                                <td>{food.id}</td>
                                <td>{food.food_name}</td>
                                <td>{food.quantity}</td>
                                <td>{food.pickup_address}</td>
                                <td>{food.status}</td>
                                <td>{food.accepted_time}</td>

                                <td>

                                    {food.status === "Reserved" ? (

                                        <button
                                            onClick={() => markDelivered(food.id)}
                                        >
                                            Mark Delivered
                                        </button>

                                    ) : (

                                        "Completed"

                                    )}

                                </td>

                            </tr>

                        ))

                    )}

                </tbody>

            </table>

        </div>

    );

}

export default MyAcceptedDonations;