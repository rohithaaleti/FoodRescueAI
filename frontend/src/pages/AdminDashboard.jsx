import { useEffect, useState } from "react";
import api from "../api/client";
import NotificationBell from "../components/NotificationBell";

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchDonations();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/api/admin/dashboard");

      setStats(res.data.stats);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/admin/users");

      setUsers(res.data.users);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchDonations = async () => {
    try {
      const res = await api.get("/api/admin/donations");

      setDonations(res.data.donations);
    } catch (err) {
      console.log(err);
    }
  };

  const deleteDonation = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this donation?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/api/admin/donation/${id}`);

      alert("Donation Deleted Successfully");

      fetchDonations();
      fetchStats();
    } catch (err) {
      console.log(err);

      alert(
        err.response?.data?.message ||
        "Failed to delete donation"
      );
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <NotificationBell />
      </div>

      <h2>Statistics</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        <div>Total Users : {stats.totalUsers}</div>
        <div>Restaurants : {stats.restaurants}</div>
        <div>NGOs : {stats.ngos}</div>
        <div>Admins : {stats.admins}</div>
        <div>Total Donations : {stats.totalDonations}</div>
        <div>Available : {stats.available}</div>
        <div>Reserved : {stats.reserved}</div>
        <div>Completed : {stats.completed}</div>
      </div>

      <h2>Users</h2>

      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Organization</th>
            <th>Phone</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.organization_name}</td>
              <td>{user.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />
      <br />

      <h2>Donations</h2>

      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Restaurant</th>
            <th>Food</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Pickup Address</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {donations.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.restaurant}</td>
              <td>{item.food_name}</td>
              <td>{item.quantity}</td>
              <td>{item.status}</td>
              <td>{item.pickup_address}</td>

              <td>
                <button
                  onClick={() => deleteDonation(item.id)}
                  style={{
                    background: "red",
                    color: "white",
                    border: "none",
                    padding: "8px 14px",
                    cursor: "pointer",
                    borderRadius: "5px",
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;