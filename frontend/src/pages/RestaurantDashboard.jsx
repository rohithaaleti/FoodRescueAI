import "./RestaurantDashboard.css";
import {
  FaUtensils,
  FaPlusCircle,
  FaClipboardList,
  FaSignOutAlt,
  FaChartLine,
  FaUserCircle,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const RestaurantDashboard = () => {

  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalDonations: 0,
    availableDonations: 0,
    completedDonations: 0,
  });

  const [recentDonations, setRecentDonations] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentDonations();
  }, []);

  const fetchDashboardStats = async () => {

    try {

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/food/dashboard-stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }

    } catch (err) {
      console.log(err);
    }

  };

  const fetchRecentDonations = async () => {

    try {

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/food/my-donations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setRecentDonations(data.foodItems);
      }

    } catch (err) {
      console.log(err);
    }

  };

  return (

    <div className="dashboard">

      {/* Sidebar */}

      <aside className="sidebar">

        <div className="logo">
          <h2>🍃 FoodRescue AI</h2>
        </div>

        <ul>

          <li className="active">
            <FaChartLine />
            Dashboard
          </li>

          <li onClick={() => navigate("/add-food")}>
            <FaPlusCircle />
            Add Food
          </li>

          <li onClick={() => navigate("/my-donations")}>
            <FaClipboardList />
            My Donations
          </li>

          <li
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}
          >
            <FaSignOutAlt />
            Logout
          </li>

        </ul>

      </aside>

      {/* Main Content */}

      <main className="main-content">

        {/* Top Bar */}

        <div className="topbar">

          <div>
            <h1>Restaurant Dashboard</h1>
            <p>Welcome back 👋</p>
          </div>

          <FaUserCircle className="profile-icon" />

        </div>

        {/* Dashboard Cards */}

        <div className="cards">

          <div className="card">

            <FaUtensils className="card-icon" />

            <h2>{stats.totalDonations}</h2>

            <p>Total Donations</p>

          </div>

          <div className="card">

            <FaClipboardList className="card-icon" />

            <h2>{stats.availableDonations}</h2>

            <p>Available Donations</p>

          </div>

          <div className="card">

            <FaChartLine className="card-icon" />

            <h2>{stats.completedDonations}</h2>

            <p>Completed Donations</p>

          </div>

        </div>

        {/* Quick Actions */}

        <div className="quick-actions">

          <h2>Quick Actions</h2>

          <div className="actions">

            <button onClick={() => navigate("/add-food")}>
              + Add Food Donation
            </button>

            <button onClick={() => navigate("/my-donations")}>
              View Donations
            </button>

          </div>

        </div>

        {/* Recent Donations */}

        <div className="recent">

          <h2>Recent Donations</h2>

          <table>

            <thead>

              <tr>
                <th>Food</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>

            </thead>

            <tbody>

              {recentDonations.length === 0 ? (

                <tr>
                  <td colSpan="3">No Donations Yet</td>
                </tr>

              ) : (

                recentDonations.slice(0, 5).map((item) => (

                  <tr key={item.id}>

                    <td>{item.food_name}</td>

                    <td>{item.quantity}</td>

                    <td>{item.status}</td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </main>

    </div>

  );

};

export default RestaurantDashboard;