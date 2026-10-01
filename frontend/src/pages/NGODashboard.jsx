import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
function getUrgencyLabel(expiryTime) {
    if (!expiryTime) return "";
    const hoursLeft = (new Date(expiryTime).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft <= 6) return " (Urgent)";
    if (hoursLeft <= 24) return " (Soon)";
    return "";
}

function NGODashboard() {

    const navigate = useNavigate();

    const [foodItems, setFoodItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("All");
    const [sortBy, setSortBy] = useState("Newest");

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

    const filteredFoodItems = foodItems.filter((food) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !query ||
            (food.food_name && food.food_name.toLowerCase().includes(query)) ||
            (food.food_type && food.food_type.toLowerCase().includes(query)) ||
            (food.pickup_address && food.pickup_address.toLowerCase().includes(query));

        const matchesType =
            selectedType === "All" ||
            (food.food_type && food.food_type.toLowerCase() === selectedType.toLowerCase());

        return matchesSearch && matchesType;
    });

    const sortedFoodItems = [...filteredFoodItems].sort((a, b) => {
        if (sortBy === "Newest") {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : a.id;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : b.id;
            return timeB - timeA;
        }

        if (sortBy === "Expiry Soonest") {
            if (!a.expiry_time && !b.expiry_time) return 0;
            if (!a.expiry_time) return 1;
            if (!b.expiry_time) return -1;
            return new Date(a.expiry_time).getTime() - new Date(b.expiry_time).getTime();
        }

        if (sortBy === "Food Name A-Z") {
            const nameA = (a.food_name || "").toLowerCase();
            const nameB = (b.food_name || "").toLowerCase();
            return nameA.localeCompare(nameB);
        }

        return 0;
    });

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

            <div style={{ marginBottom: "20px", display: "flex", gap: "15px" }}>
                <input
                    type="text"
                    placeholder="Search by name, type, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: "8px 12px", width: "300px" }}
                />

                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={{ padding: "8px 12px" }}
                >
                    <option value="All">All Food Types</option>
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Other">Other</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ padding: "8px 12px" }}
                >
                    <option value="Newest">Newest</option>
                    <option value="Expiry Soonest">Expiry Soonest</option>
                    <option value="Food Name A-Z">Food Name A-Z</option>
                </select>
            </div>

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

                    ) : sortedFoodItems.length === 0 ? (

                        <tr>
                            <td colSpan="7">No donations match your search or filter</td>
                        </tr>

                    ) : (

                        sortedFoodItems.map((food) => (

                            <tr key={food.id}>

                                <td>{food.id}</td>
                                <td>{food.food_name}</td>
                                <td>{food.quantity}</td>
                                <td>{food.pickup_address}</td>
                                <td>
                                    {food.expiry_time
                                        ? `${new Date(food.expiry_time).toLocaleString()}${getUrgencyLabel(food.expiry_time)}`
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