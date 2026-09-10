import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatPrice, listMyTours, type Tour } from "../../services/api";

import "./MyTours.css";

export default function MyTours() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    async function load() {
      try {
        const tourList = await listMyTours(token!);
        setTours(tourList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tours.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, navigate]);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="my-tours-page">
      <div className="my-tours-container">
        {/* <button className="my-tours-back" onClick={() => navigate("/")}>
          ← Back to home
        </button> */}

        <div className="my-tours-header">
          <div>
            <h1>My tours</h1>
            <p>Manage the tours you have created so far.</p>
          </div>

          <button className="my-tours-create-button" onClick={() => navigate("/create-tour")}>
            + Create tour
          </button>
        </div>

        {loading && <div className="my-tours-status">Loading tours...</div>}
        {error && <div className="my-tours-status my-tours-error">{error}</div>}

        {!loading && !error && tours.length === 0 && (
          <div className="my-tours-empty">
            <h2>No tours yet</h2>
            <p>Create your first tour to start building your itinerary.</p>
            <button onClick={() => navigate("/create-tour")}>Create your first tour</button>
          </div>
        )}

        {!loading && !error && tours.length > 0 && (
          <div className="my-tours-grid">
            {tours.map((tour) => (
              <article
                className="tour-card"
                key={tour.id}
                onClick={() => navigate(`/tours/${tour.id}`)}
              >
                <div className="tour-card-top">
                  <span className={`tour-status tour-status-${tour.status}`}>{tour.status}</span>
                  <span className="tour-difficulty">{tour.difficulty}</span>
                </div>

                <div className="tour-card-content">
                  <h2>{tour.name}</h2>
                  <p>{tour.description}</p>

                  {tour.tags.length > 0 && (
                    <div className="tour-card-tags">
                      {tour.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="tour-card-meta">
                    <span>Price: {tour.price === 0 ? "Not set" : formatPrice(tour.price)}</span>
                    <span>{formatDate(tour.createdAt)}</span>
                  </div>

                  <div className="tour-card-points">
                    <span className={tour.startPoint ? "point-set" : "point-missing"}>
                      {tour.startPoint ? "✓ Start point set" : "○ No start point"}
                    </span>
                    <span className={tour.endPoint ? "point-set" : "point-missing"}>
                      {tour.endPoint ? "✓ End point set" : "○ No end point"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}