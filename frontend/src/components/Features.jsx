import "./Features.css";
import { FaRobot, FaMapMarkedAlt, FaBell, FaShieldAlt } from "react-icons/fa";

const Features = () => {
  return (
    <section className="features container">
      <h2>Why FoodRescue AI?</h2>

      <p className="subtitle">
        Smart technology that connects donors, NGOs and volunteers in real time.
      </p>

      <div className="feature-grid">
        <div className="feature-card">
          <FaRobot className="icon" />
          <h3>AI Matching</h3>
          <p>
            Automatically finds the best NGO based on food type, distance and
            urgency.
          </p>
        </div>

        <div className="feature-card">
          <FaMapMarkedAlt className="icon" />
          <h3>Live Tracking</h3>
          <p>Track every donation from restaurant to delivery.</p>
        </div>

        <div className="feature-card">
          <FaBell className="icon" />
          <h3>Instant Alerts</h3>
          <p>Volunteers receive pickup requests immediately.</p>
        </div>

        <div className="feature-card">
          <FaShieldAlt className="icon" />
          <h3>Secure Platform</h3>
          <p>JWT authentication keeps every account protected.</p>
        </div>
      </div>
    </section>
  );
};

export default Features;