import { useEffect, useState } from "react";
import api from "../api/client";
import NotificationBell from "../components/NotificationBell";

const VolunteerDashboard = () => {
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);

  useEffect(() => {
    fetchAvailableDeliveries();
    fetchMyDeliveries();
  }, []);

  // ==========================
  // Get Available Deliveries
  // ==========================

  const fetchAvailableDeliveries = async () => {
    try {
      const res = await api.get(
        "/api/volunteer/available-deliveries"
      );

      setAvailableDeliveries(res.data.deliveries);
    } catch (err) {
      console.log(err);
    }
  };

  // ==========================
  // Get My Deliveries
  // ==========================

  const fetchMyDeliveries = async () => {
    try {
      const res = await api.get(
        "/api/volunteer/my-deliveries"
      );

      setMyDeliveries(res.data.deliveries);
    } catch (err) {
      console.log(err);
    }
  };

  // ==========================
  // Accept Delivery
  // ==========================

  const acceptDelivery = async (id) => {
    try {
      await api.put(
        `/api/volunteer/accept/${id}`,
        {}
      );

      alert("Delivery accepted successfully!");

      fetchAvailableDeliveries();
      fetchMyDeliveries();

    } catch (err) {
      console.log(err);

      alert(
        err.response?.data?.message ||
        "Failed to accept delivery."
      );
    }
  };

  // ==========================
  // Complete Delivery
  // ==========================

  const completeDelivery = async (id) => {
    const confirmComplete = window.confirm(
      "Have you successfully delivered this donation?"
    );

    if (!confirmComplete) return;

    try {
      await api.put(
        `/api/volunteer/complete/${id}`,
        {}
      );

      alert("Delivery completed successfully!");

      fetchAvailableDeliveries();
      fetchMyDeliveries();

    } catch (err) {
      console.log(err);

      alert(
        err.response?.data?.message ||
        "Failed to complete delivery."
      );
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>Volunteer Dashboard</h1>
        <NotificationBell />
      </div>

      {/* ==========================
          Available Deliveries
      =========================== */}

      <h2>Available Deliveries</h2>

      {availableDeliveries.length === 0 ? (
        <p>No deliveries are currently available.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          width="100%"
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Food</th>
              <th>Quantity</th>
              <th>Restaurant</th>
              <th>NGO</th>
              <th>Pickup Address</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {availableDeliveries.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>

                <td>{item.food_name}</td>

                <td>{item.quantity}</td>

                <td>{item.restaurant}</td>

                <td>{item.ngo}</td>

                <td>{item.pickup_address}</td>

                <td>{item.status}</td>

                <td>
                  <button
                    onClick={() => acceptDelivery(item.id)}
                    style={{
                      background: "green",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Accept Delivery
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <br />
      <br />

      {/* ==========================
          My Deliveries
      =========================== */}

      <h2>My Deliveries</h2>

      {myDeliveries.length === 0 ? (
        <p>You have not accepted any deliveries yet.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          width="100%"
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Food</th>
              <th>Quantity</th>
              <th>Restaurant</th>
              <th>NGO</th>
              <th>Pickup Address</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {myDeliveries.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>

                <td>{item.food_name}</td>

                <td>{item.quantity}</td>

                <td>{item.restaurant}</td>

                <td>{item.ngo}</td>

                <td>{item.pickup_address}</td>

                <td>{item.status}</td>

                <td>
                  {item.status === "Assigned" && (
                    <button
                      onClick={() =>
                        completeDelivery(item.id)
                      }
                      style={{
                        background: "blue",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Mark Delivered
                    </button>
                  )}

                  {item.status === "Completed" && (
                    <span>
                      Completed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  );
};

export default VolunteerDashboard;