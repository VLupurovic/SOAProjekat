import { useNavigate } from "react-router-dom";

import "./Hero.css";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero" id="home">

      <div className="hero-overlay" />

      <div className="hero-content">

        <p className="hero-label">
          YOUR GUIDE TO ADVENTURE
        </p>

        <h1>
          Discover Your
          <br />
          Next Adventure.
        </h1>

        <p className="hero-description">
          Explore beautiful destinations and discover
          unforgettable experiences around the world.
        </p>

        <button className="hero-button" onClick={() => navigate("/tours")}>
          Explore Tours →
        </button>

      </div>

    </section>
  );
}