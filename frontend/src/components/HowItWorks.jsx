import "./HowItWorks.css";
import {
  FaUtensils,
  FaRobot,
  FaTruck,
  FaHandsHelping
} from "react-icons/fa";

const HowItWorks = () => {
  return (
    <section className="how-it-works">

      <div className="container">

        <div className="section-title">

          <h2>How It Works</h2>

          <p>
            A simple four-step process to rescue surplus food
            and deliver it safely to people who need it.
          </p>

        </div>

        <div className="steps">

          <div className="step-card">

            <div className="step-number">
              1
            </div>

            <FaUtensils className="step-icon"/>

            <h3>Restaurant Adds Food</h3>

            <p>
              Restaurants upload surplus food with quantity,
              pickup location and expiry time.
            </p>

          </div>

          <div className="step-arrow">
            →
          </div>

          <div className="step-card">

            <div className="step-number">
              2
            </div>

            <FaRobot className="step-icon"/>

            <h3>AI Finds Best NGO</h3>

            <p>
              AI automatically matches nearby NGOs based on
              urgency, distance and food type.
            </p>

          </div>

          <div className="step-arrow">
            →
          </div>

          <div className="step-card">

            <div className="step-number">
              3
            </div>

            <FaTruck className="step-icon"/>

            <h3>Volunteer Picks Up</h3>

            <p>
              Volunteers receive instant pickup requests and
              collect the food safely.
            </p>

          </div>

          <div className="step-arrow">
            →
          </div>

          <div className="step-card">

            <div className="step-number">
              4
            </div>

            <FaHandsHelping className="step-icon"/>

            <h3>NGO Receives Food</h3>

            <p>
              The donated food reaches NGOs where it is
              distributed to people in need.
            </p>

          </div>

        </div>

      </div>

    </section>
  );
};

export default HowItWorks;<div className=""></div>