import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getTour,
  setStartPoint,
  setEndPoint,
  setTourPrice,
  publishTour,
  archiveTour,
  type Tour,
  type KeyPointFormData,
} from "../../services/api";
import LocationPicker from "../../components/LocationPicker/LocationPicker";

import "./TourDetail.css";

export default function TourDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [priceInput, setPriceInput] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceError, setPriceError] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!id) return;

    loadTour();
  }, [token, id]);

  async function loadTour() {
    if (!token || !id) return;

    setLoading(true);
    setError("");

    try {
      const result = await getTour(token, id);
      setTour(result);
      setPriceInput(result.price > 0 ? String(result.price) : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tour.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveStart(data: KeyPointFormData) {
    if (!token || !id) return;
    await setStartPoint(token, id, data);
    await loadTour();
  }

  async function handleSaveEnd(data: KeyPointFormData) {
    if (!token || !id) return;
    await setEndPoint(token, id, data);
    await loadTour();
  }

  async function handleSavePrice() {
    if (!token || !id) return;

    const parsed = Number(priceInput);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setPriceError("Price must be a positive number.");
      return;
    }

    setPriceSaving(true);
    setPriceError("");

    try {
      await setTourPrice(token, id, parsed);
      await loadTour();
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : "Failed to update price.");
    } finally {
      setPriceSaving(false);
    }
  }

  async function handlePublish() {
    if (!token || !id) return;

    setPublishing(true);
    setPublishError("");

    try {
      await publishTour(token, id);
      await loadTour();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish tour.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleArchive() {
    if (!token || !id) return;

    setArchiving(true);
    setArchiveError("");

    try {
      await archiveTour(token, id);
      await loadTour();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive tour.");
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="tour-detail-page">
        <div className="tour-detail-container">
          <div className="tour-detail-status">Loading tour...</div>
        </div>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="tour-detail-page">
        <div className="tour-detail-container">
          <div className="tour-detail-status tour-detail-error">
            {error || "Tour not found."}
          </div>
        </div>
      </div>
    );
  }

  const canPublish =
    tour.status === "draft" &&
    tour.price > 0 &&
    tour.startPoint !== null &&
    tour.endPoint !== null;

  return (
    <div className="tour-detail-page">
      <div className="tour-detail-container">
        {/* <button className="tour-detail-back" onClick={() => navigate("/my-tours")}>
          ← Back to my tours
        </button> */}

        <div className="tour-detail-header">
          <div className="tour-detail-badges">
            <span className={`tour-status tour-status-${tour.status}`}>{tour.status}</span>
            <span className="tour-difficulty">{tour.difficulty}</span>
          </div>

          <h1>{tour.name}</h1>
          <p>{tour.description}</p>

          {tour.tags.length > 0 && (
            <div className="tour-detail-tags">
              {tour.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="tour-detail-points">
          <LocationPicker
            title="Start point"
            hint="Click on the map to set where the tour begins."
            keyPoint={tour.startPoint}
            onSave={handleSaveStart}
          />

          <LocationPicker
            title="End point"
            hint="Click on the map to set where the tour ends."
            keyPoint={tour.endPoint}
            onSave={handleSaveEnd}
          />
        </div>

        {tour.status === "draft" && (
          <div className="tour-detail-publish">
            <h2>Price &amp; publish</h2>

            <div className="tour-detail-price-row">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
              />
              <button onClick={handleSavePrice} disabled={priceSaving}>
                {priceSaving ? "Saving..." : "Save price"}
              </button>
            </div>
            {priceError && <div className="tour-detail-status tour-detail-error">{priceError}</div>}

            <button
              className="tour-detail-publish-button"
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              title={
                !canPublish
                  ? "Set a price and both start/end points before publishing"
                  : undefined
              }
            >
              {publishing ? "Publishing..." : "Publish tour"}
            </button>
            {publishError && (
              <div className="tour-detail-status tour-detail-error">{publishError}</div>
            )}
            {!canPublish && (
              <p className="tour-detail-publish-hint">
                Set a price and both the start and end point before publishing.
              </p>
            )}
          </div>
        )}

        {tour.status === "published" && (
          <div className="tour-detail-publish">
            <h2>Archive</h2>
            <p className="tour-detail-publish-hint">
              Archiving removes this tour from the public browse page. Tourists who already
              purchased it keep access; it can no longer be bought after archiving.
            </p>
            <button
              className="tour-detail-archive-button"
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving..." : "Archive tour"}
            </button>
            {archiveError && (
              <div className="tour-detail-status tour-detail-error">{archiveError}</div>
            )}
          </div>
        )}

        {tour.status === "archived" && (
          <div className="tour-detail-publish">
            <h2>Archived</h2>
            <p className="tour-detail-publish-hint">
              This tour is archived and no longer available for new purchases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}