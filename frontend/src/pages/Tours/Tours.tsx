import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatPrice, listPublishedTours, type PublicTourSummary } from "../../services/api";

import "./Tours.css";

export default function Tours() {
  const navigate = useNavigate();

  const [tours, setTours] = useState<PublicTourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  listPublishedTours()
    .then((result) =>
      setTours(
        result.map((tour) => ({
          ...tour,
          images: tour.images ?? [],
        }))
      )
    )
    .catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load tours.")
    )
    .finally(() => setLoading(false));
}, []);

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest} min`;
    if (rest === 0) return `${hours} h`;
    return `${hours} h ${rest} min`;
  }

  return (
    <div className="tours-page">
      <div className="tours-container">
        {/* <button className="tours-back" onClick={() => navigate("/")}>
          ← Back to home
        </button> */}

        <div className="tours-header">
          <h1>All tours</h1>
          <p>Browse every tour currently published by our guides.</p>
        </div>

        {loading && <div className="tours-status">Loading tours...</div>}
        {error && <div className="tours-status tours-error">{error}</div>}

        {!loading && !error && tours.length === 0 && (
          <div className="tours-empty">
            <h2>No tours published yet</h2>
            
          </div>
        )}

        {!loading && !error && tours.length > 0 && (
          <div className="tours-grid">
            {tours.map((tour) => (
              <article
                className="tours-card"
                key={tour.id}
                onClick={() => navigate(`/tours/${tour.id}/view`)}
              >
                <div className="tours-card-image">
                  {tour.images.length > 0 ? (
                    <img src={tour.images[0]} alt={tour.name} />
                  ) : (
                    <div className="tours-card-image-placeholder" />
                  )}
                  <span className="tours-card-difficulty">{tour.difficulty}</span>
                </div>

                <div className="tours-card-content">
                  <span className="tours-card-author">by {tour.authorName}</span>
                  <h2>{tour.name}</h2>
                  <p>{tour.description}</p>

                  <div className="tours-card-meta">
                    <span>{formatDuration(tour.durationMinutes)}</span>
                    {formatPrice(tour.price)}
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