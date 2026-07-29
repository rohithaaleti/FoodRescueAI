import "./Hero.css";
import heroImg from "../assets/hero.png";
import { useNavigate } from "react-router-dom";

const Hero = () => {

  const navigate = useNavigate();

  return (
    <section className="hero">

      <div className="hero-bg-circle hero-circle-1"></div>
      <div className="hero-bg-circle hero-circle-2"></div>

      <div className="container hero-container">

        {/* Left Section */}

        <div className="hero-left">

          <span className="hero-badge">
            🌱 AI Powered Food Redistribution
          </span>

          <h1>
            Turn Surplus Food
            <br />
            Into Hope.
          </h1>

          <p>
            FoodRescue AI intelligently connects restaurants,
            NGOs and volunteers to rescue edible surplus food
            before it becomes waste.
          </p>

          <div className="hero-buttons">

            <button
              className="hero-primary-btn"
              onClick={() => navigate("/login")}
            >
              Donate Food
            </button>

            <button
              className="hero-secondary-btn"
              onClick={() => navigate("/register")}
            >
              Learn More
            </button>

          </div>

          <div className="hero-trust">

            <div>
              <h3>2,450+</h3>
              <span>Meals Rescued</span>
            </div>

            <div>
              <h3>120+</h3>
              <span>Restaurants</span>
            </div>

            <div>
              <h3>98%</h3>
              <span>Successful Deliveries</span>
            </div>

          </div>

        </div>

        {/* Right Section */}

        <div className="hero-right">

          <div className="hero-image-wrapper">

            <div className="floating-box top-left">
              <h4>2,450+</h4>
              <p>Meals Rescued</p>
            </div>

            <div className="floating-box top-right">
              <h4>120+</h4>
              <p>Restaurants</p>
            </div>

            <div className="floating-box bottom-left">
              <h4>98%</h4>
              <p>Successful Deliveries</p>
            </div>

            <div className="hero-card">
              <img
                src={heroImg}
                alt="FoodRescue AI"
              />
            </div>

          </div>

        </div>

      </div>

    </section>
  );
};

export default Hero;