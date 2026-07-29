import "./Navbar.css";
import { Link } from "react-router-dom";
const Navbar = () => {
  return (
    <header className="navbar">

      <div className="container navbar-container">

        {/* Logo */}

        <div className="logo">

          <div className="logo-icon">
            🌿
          </div>

          <div className="logo-text">
            <h2>FoodRescue AI</h2>
            <span>Save Food • Save Lives</span>
          </div>

        </div>

        {/* Navigation */}

        <nav>

          <ul className="nav-menu">

        <li><Link to="/">Home</Link></li>
<li><a href="#about">About</a></li>
<li><a href="#features">Features</a></li>
<li><a href="#impact">Impact</a></li>
<li><a href="#contact">Contact</a></li>
          </ul>

        </nav>

        {/* Buttons */}

        <div className="nav-actions">

          <Link to="/login">
    <button className="btn-login">
        Login
    </button>
</Link>

<Link to="/register">
    <button className="btn-register">
        Get Started
    </button>
</Link>

        </div>

      </div>

    </header>
  );
};

export default Navbar;