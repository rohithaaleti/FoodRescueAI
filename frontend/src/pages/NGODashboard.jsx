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

    // Smart NGO Matching Modal States
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [matchLoading, setMatchLoading] = useState(false);
    const [matchError, setMatchError] = useState(null);

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

    const openMatchModal = async (foodId) => {
        setMatchLoading(true);
        setMatchError(null);
        setSelectedMatch({ foodId, data: null });

        try {
            const response = await api.get(`/api/ngo/recommendations/${foodId}`);
            if (response.data && response.data.success) {
                setSelectedMatch({ foodId, data: response.data });
            } else {
                setMatchError(response.data?.message || "Failed to load match recommendations.");
            }
        } catch (err) {
            console.error("Match recommendation error:", err);
            setMatchError(err.response?.data?.message || "Error fetching recommendations.");
        } finally {
            setMatchLoading(false);
        }
    };

    const closeMatchModal = () => {
        setSelectedMatch(null);
        setMatchError(null);
        setMatchLoading(false);
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
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <button
                                            onClick={() => openMatchModal(food.id)}
                                            style={{
                                                backgroundColor: "#2196f3",
                                                color: "#ffffff",
                                                border: "none",
                                                padding: "6px 12px",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "13px",
                                                fontWeight: "500"
                                            }}
                                        >
                                            Smart Match
                                        </button>

                                        <button
                                            onClick={() => acceptDonation(food.id)}
                                            style={{
                                                backgroundColor: "#4caf50",
                                                color: "#ffffff",
                                                border: "none",
                                                padding: "6px 12px",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "13px"
                                            }}
                                        >
                                            Accept
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Smart NGO Matching Modal */}
            {selectedMatch && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "20px"
                    }}
                    onClick={closeMatchModal}
                >
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "8px",
                            padding: "24px",
                            maxWidth: "700px",
                            width: "100%",
                            maxHeight: "85vh",
                            overflowY: "auto",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                            position: "relative"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                            <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>Smart NGO Match Analysis</h2>
                            <button
                                onClick={closeMatchModal}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "22px",
                                    cursor: "pointer",
                                    color: "#666"
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {matchLoading ? (
                            <div style={{ padding: "40px 0", textAlign: "center", color: "#666" }}>
                                <p style={{ margin: 0, fontSize: "16px" }}>Calculating deterministic scores & AI contextual insights...</p>
                            </div>
                        ) : matchError ? (
                            <div style={{ padding: "16px", backgroundColor: "#ffebee", color: "#c62828", borderRadius: "6px", marginBottom: "16px" }}>
                                <strong>Unable to load match:</strong> {matchError}
                            </div>
                        ) : selectedMatch.data ? (
                            <div>
                                {/* Donation Summary */}
                                <div style={{ backgroundColor: "#f5f5f5", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px", color: "#333" }}>
                                    <div><strong>Donation:</strong> {selectedMatch.data.food_name}</div>
                                    <div><strong>Type:</strong> {selectedMatch.data.food_type} | <strong>Quantity:</strong> {selectedMatch.data.quantity} servings</div>
                                    <div><strong>Expiry:</strong> {selectedMatch.data.expiry_time ? new Date(selectedMatch.data.expiry_time).toLocaleString() : "N/A"}</div>
                                </div>

                                {/* AI Match Summary Banner (if present) */}
                                {selectedMatch.data.ai_summary && (
                                    <div style={{ backgroundColor: "#e8f5e9", borderLeft: "4px solid #2e7d32", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px" }}>
                                        <div style={{ fontWeight: "bold", color: "#1b5e20", marginBottom: "4px" }}>
                                            AI Match Summary
                                        </div>
                                        <div style={{ color: "#2e7d32", fontSize: "14px" }}>
                                            {selectedMatch.data.ai_summary}
                                        </div>
                                    </div>
                                )}

                                {/* Candidates Section Title */}
                                <h3 style={{ fontSize: "16px", margin: "16px 0 12px 0", color: "#333" }}>
                                    Matched Candidate NGOs ({selectedMatch.data.recommendations?.length || 0})
                                </h3>

                                {/* Zero Candidates Empty State */}
                                {(!selectedMatch.data.recommendations || selectedMatch.data.recommendations.length === 0) ? (
                                    <div style={{ padding: "24px", backgroundColor: "#fafafa", border: "1px dashed #ccc", textAlign: "center", borderRadius: "6px", color: "#666" }}>
                                        No eligible candidate NGOs matched for this donation based on capacity, location, or food type rules.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        {selectedMatch.data.recommendations.map((ngo, idx) => (
                                            <div
                                                key={ngo.ngo_id}
                                                style={{
                                                    border: "1px solid #e0e0e0",
                                                    borderRadius: "8px",
                                                    padding: "16px",
                                                    backgroundColor: "#ffffff",
                                                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
                                                }}
                                            >
                                                {/* Top Bar: Org Name, Score Badge, AI Priority Badge */}
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                                                    <div>
                                                        <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1565c0" }}>
                                                            {idx + 1}. {ngo.organization_name}
                                                        </h4>
                                                    </div>

                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        {/* Deterministic Score Badge */}
                                                        <span style={{
                                                            backgroundColor: "#1976d2",
                                                            color: "#ffffff",
                                                            padding: "4px 10px",
                                                            borderRadius: "12px",
                                                            fontSize: "12px",
                                                            fontWeight: "bold"
                                                        }}>
                                                            Score: {ngo.score} / 100
                                                        </span>

                                                        {/* AI Priority Badge */}
                                                        {ngo.ai_priority && (
                                                            <span style={{
                                                                backgroundColor: ngo.ai_priority === "high" ? "#ffe0b2" : (ngo.ai_priority === "medium" ? "#e3f2fd" : "#f5f5f5"),
                                                                color: ngo.ai_priority === "high" ? "#e65100" : (ngo.ai_priority === "medium" ? "#0d47a1" : "#616161"),
                                                                padding: "4px 10px",
                                                                borderRadius: "12px",
                                                                fontSize: "12px",
                                                                fontWeight: "600",
                                                                border: "1px solid rgba(0,0,0,0.1)"
                                                            }}>
                                                                AI Priority: {ngo.ai_priority.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Facts Operational Grid */}
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", color: "#424242", marginBottom: "10px" }}>
                                                    <div><strong>Proximity:</strong> {ngo.distance_km != null ? `${ngo.distance_km} km away` : "Proximity verified"}</div>
                                                    <div><strong>Capacity:</strong> {ngo.remaining_capacity} remaining (Max {ngo.max_capacity})</div>
                                                    <div><strong>Workload:</strong> {ngo.current_active_donations} / {ngo.max_active_donations} active slots</div>
                                                    <div><strong>Urgency:</strong> {ngo.urgency?.label || "Standard"}</div>
                                                </div>

                                                {/* AI Contextual Explanation */}
                                                {ngo.ai_explanation && (
                                                    <div style={{ backgroundColor: "#f1f8e9", borderLeft: "3px solid #689f38", padding: "10px 12px", borderRadius: "4px", fontSize: "13px", color: "#33691e", marginBottom: "10px" }}>
                                                        <strong>Match explanation:</strong> {ngo.ai_explanation}
                                                    </div>
                                                )}

                                                {/* Deterministic Rules & Score Breakdown */}
                                                <details style={{ fontSize: "12px", color: "#616161" }}>
                                                    <summary style={{ cursor: "pointer", color: "#1976d2", fontWeight: "600" }}>
                                                        View Deterministic Score Breakdown ({ngo.reasons?.length || 0} factors)
                                                    </summary>
                                                    <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                                                        {ngo.reasons?.map((reason, rIdx) => (
                                                            <li key={rIdx} style={{ marginBottom: "2px" }}>{reason}</li>
                                                        ))}
                                                    </ul>
                                                </details>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Modal Footer */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #eee" }}>
                            {selectedMatch?.data && (
                                <button
                                    onClick={() => {
                                        const foodId = selectedMatch.data.id;
                                        closeMatchModal();
                                        acceptDonation(foodId);
                                    }}
                                    style={{
                                        backgroundColor: "#4caf50",
                                        color: "#ffffff",
                                        border: "none",
                                        padding: "8px 16px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "500"
                                    }}
                                >
                                    Accept Donation
                                </button>
                            )}
                            <button
                                onClick={closeMatchModal}
                                style={{
                                    backgroundColor: "#9e9e9e",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "14px"
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NGODashboard;