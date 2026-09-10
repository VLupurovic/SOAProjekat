import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatPrice, listPublishedTours, type PublicTourSummary } from "../../services/api";

import "./PopularTours.css";

export default function PopularTours() {
  const navigate = useNavigate();

  const [tours, setTours] = useState<PublicTourSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublishedTours()
      .then((result) => setTours(result.slice(0, 3)))
      .catch(() => setTours([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="popular-tours" id="tours">

      <div className="popular-heading">

        <p>EXPLORE</p>

        <h2>
          Popular Tours
        </h2>

      </div>

      {!loading && tours.length === 0 && (
        <p className="popular-tours-empty">No tours have been published yet — check back soon.</p>
      )}

      {tours.length > 0 && (
        <div className="tour-grid">
          {tours.map((tour) => (
            <div
              className="tour-card"
              key={tour.id}
              onClick={() => navigate(`/tours/${tour.id}/view`)}
            >
              {(tour.images ?? []).length > 0 ? (
                <img src={(tour.images ?? [])[0]} alt={tour.name} />
              ) : (
                <div className="tour-card-image-placeholder" />
              )}

              <div>
                <span>{tour.authorName}</span>
                <h3>{tour.name}</h3>
                <p>From {formatPrice(tour.price)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}