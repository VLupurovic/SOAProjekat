import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getPublicTour,
  addToCart,
  getProfile,
  checkPurchased,
  getActiveExecution,
  getCart,
  type PublicTour as PublicTourData,
  formatPrice,
} from "../../services/api";

import "./PublicTour.css";

export default function PublicTour() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [tour, setTour] = useState<PublicTourData | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [hasActiveExecution, setHasActiveExecution] = useState(false);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    if (!id) return;
    load();
    
  }, [id]);

  async function load() {
  if (!id) return;

  setLoading(true);
  setError("");

  try {
    const result = await getPublicTour(id, token);

    setTour({
      ...result,
      images: result.images ?? [],
      tags: result.tags ?? [],
    });

        if (token) {
      try {
        const me = await getProfile(token);
        setOwnUserId(me.id);
      } catch {}

            try {
        const cart = await getCart(token);
        setInCart(cart.items.some((item) => item.tourId === id));
      } catch {}

      try {
        const status = await checkPurchased(token, id);
        setPurchased(status.purchased);

        if (status.purchased) {
          try {
            const activeExecution = await getActiveExecution(token, id);
            setHasActiveExecution(!!activeExecution);
          } catch {}
        }
      } catch {}
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to load tour.");
  } finally {
    setLoading(false);
  }
}

  async function handleAddToCart() {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!id) return;

    setError("");
    setSuccess("");
    setAdding(true);

    try {
      await addToCart(token, id);
      setSuccess("Added to your cart.");
      setInCart(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tour to cart.");
    } finally {
      setAdding(false);
    }
  }

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest} min`;
    if (rest === 0) return `${hours} h`;
    return `${hours} h ${rest} min`;
  }

  if (loading) {
    return (
      <div className="public-tour-page">
        <div className="public-tour-container">
          <div className="public-tour-status">Loading tour...</div>
        </div>
      </div>
    );
  }

  if (error && !tour) {
    return (
      <div className="public-tour-page">
        <div className="public-tour-container">
          <div className="public-tour-status public-tour-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return null;
  }

  const isArchived = tour.status === "archived";

  return (
    <div className="public-tour-page">
      <div className="public-tour-container">
        {/* <button className="public-tour-back" onClick={() => navigate("/tours")}>
          ← Back to all tours
        </button> */}

        {tour.images.length > 0 && (
          <div className="public-tour-gallery">
            {tour.images.map((image, index) => (
              <img key={index} src={image} alt={`${tour.name} ${index + 1}`} />
            ))}
          </div>
        )}

        <div className="public-tour-header">
          <div className="public-tour-badges">
            <span className={`tour-status tour-status-${tour.status}`}>{tour.status}</span>
            <span className="tour-difficulty">{tour.difficulty}</span>
            {purchased && <span className="public-tour-purchased-badge">✓ Purchased</span>}
          </div>

          <h1>{tour.name}</h1>
          <p className="public-tour-description">{tour.description}</p>

          {tour.tags.length > 0 && (
            <div className="public-tour-tags">
              {tour.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="public-tour-meta-grid">
          <div className="public-tour-meta-card">
            <span>Duration</span>
            <strong>{formatDuration(tour.durationMinutes)}</strong>
          </div>

          <div className="public-tour-meta-card">
            <span>Price</span>
            {formatPrice(tour.price)}
          </div>
        </div>

        <div className="public-tour-points">
          <div className="public-tour-point-card">
            <h3>Start point</h3>
            {tour.startPoint ? (
              <>
                <p className="public-tour-point-name">{tour.startPoint.name}</p>
                <p className="public-tour-point-description">{tour.startPoint.description}</p>
                <p className="public-tour-point-coords">
                  Lat: {tour.startPoint.latitude.toFixed(5)}, Lng:{" "}
                  {tour.startPoint.longitude.toFixed(5)}
                </p>
              </>
            ) : (
              <p className="public-tour-point-empty">Not set by the guide yet.</p>
            )}
          </div>

          <div className="public-tour-point-card">
            <h3>End point</h3>
            {tour.endPoint ? (
              <>
                <p className="public-tour-point-name">{tour.endPoint.name}</p>
                <p className="public-tour-point-description">{tour.endPoint.description}</p>
                <p className="public-tour-point-coords">
                  Lat: {tour.endPoint.latitude.toFixed(5)}, Lng:{" "}
                  {tour.endPoint.longitude.toFixed(5)}
                </p>
              </>
            ) : (
              <div className="public-tour-point-locked">
                <p>🔒 Unlocks once you purchase this tour.</p>
              </div>
            )}
          </div>
        </div>

        {error && <div className="public-tour-message public-tour-message-error">{error}</div>}
        {success && (
          <div className="public-tour-message public-tour-message-success">{success}</div>
        )}

                {isArchived && !purchased && (
          <div className="public-tour-archived-notice">
            This tour has been archived and is no longer available for purchase.
          </div>
        )}

                {ownUserId === tour.authorId ? (
          <button className="public-tour-cta" onClick={() => navigate(`/tours/${id}`)}>
            Manage this tour →
          </button>
        ) : purchased ? (
          <button className="public-tour-cta" onClick={() => navigate(`/tours/${id}/execution`)}>
            {hasActiveExecution ? "Resume tour →" : "Start tour →"}
          </button>
                ) : !isArchived ? (
          <button
            className="public-tour-cta"
            onClick={handleAddToCart}
            disabled={adding || inCart}
          >
            {inCart ? "Already in cart" : adding ? "Adding..." : `Add to cart · ${formatPrice(tour.price)}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}