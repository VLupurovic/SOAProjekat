import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  listMyPurchases,
  getPublicTour,
  type TourPurchaseToken,
  type PublicTour,
  formatPrice,
} from "../../services/api";

import "../Tours/Tours.css";

interface PurchasedTourCard {
  purchase: TourPurchaseToken;
  tour: PublicTour | null;
}

export default function MyPurchases() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [cards, setCards] = useState<PurchasedTourCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    async function load() {
      try {
        const purchases = await listMyPurchases(token!);

        const results = await Promise.all(
          purchases.map(async (purchase) => {
            try {
              const tour = await getPublicTour(purchase.tourId, token!);
              return { purchase, tour };
            } catch {
              return { purchase, tour: null };
            }
          })
        );

        setCards(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load your purchases.");
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
    <div className="tours-page">
      <div className="tours-container">
        <div className="tours-header">
          <span>YOUR TOURS</span>
          <h1>My purchases</h1>
          <p>Tours you've bought, including ones the guide has since archived.</p>
        </div>

        {loading && <div className="tours-status">Loading purchases...</div>}
        {error && <div className="tours-status tours-error">{error}</div>}

        {!loading && !error && cards.length === 0 && (
          <div className="tours-empty">
            <h2>No purchases yet</h2>
            <p>Browse tours and add one to your cart to get started.</p>
          </div>
        )}

        {!loading && !error && cards.length > 0 && (
          <div className="tours-grid">
            {cards.map(({ purchase, tour }) => (
              <article
                className="tours-card"
                key={purchase.id}
                onClick={() => navigate(`/tours/${purchase.tourId}/view`)}
              >
                <div className="tours-card-image">
                  {tour && tour.images.length > 0 ? (
                    <img src={tour.images[0]} alt={purchase.tourName} />
                  ) : (
                    <div className="tours-card-image-placeholder" />
                  )}
                  {tour && <span className="tours-card-difficulty">{tour.difficulty}</span>}
                </div>

                <div className="tours-card-content">
                  <h2>{purchase.tourName}</h2>
                  {tour && <p>{tour.description}</p>}

                  <div className="tours-card-meta">
                    <span>{formatDate(purchase.createdAt)}</span>
                    {formatPrice(purchase.price)}
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