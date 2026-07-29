import "./Stats.css";
import {
  FaUtensils,
  FaStore,
  FaHandsHelping,
  FaTruck
} from "react-icons/fa";

const Stats = () => {
  return (
    <section className="stats">

      <div className="container">

        <div className="stats-card">

          <div className="stat">

            <FaUtensils className="stat-icon"/>

            <h2>12,450+</h2>

            <p>Meals Rescued</p>

          </div>

          <div className="stat">

            <FaStore className="stat-icon"/>

            <h2>320+</h2>

            <p>Restaurants</p>

          </div>

          <div className="stat">

            <FaHandsHelping className="stat-icon"/>

            <h2>185+</h2>

            <p>NGOs</p>

          </div>

          <div className="stat">

            <FaTruck className="stat-icon"/>

            <h2>510+</h2>

            <p>Volunteers</p>

          </div>

        </div>

      </div>

    </section>
  );
};

export default Stats;