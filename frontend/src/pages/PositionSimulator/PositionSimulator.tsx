import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { getCurrentPosition, setCurrentPosition, type TouristPosition } from "../../services/api";

import "leaflet/dist/leaflet.css";
import "./PositionSimulator.css";

const markerIconInstance = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [44.8125, 20.4612];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PositionSimulator() {
  const navigate = useNavigate();

  const [position, setPosition] = useState<TouristPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    getCurrentPosition(token)
      .then((result) => setPosition(result))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load your current position.")
      )
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handlePick(lat: number, lng: number) {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const next: TouristPosition = { latitude: lat, longitude: lng };

    setPosition(next);
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await setCurrentPosition(token, next);
      setSuccess("Your current location has been updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update your position.");
    } finally {
      setSaving(false);
    }
  }

  const mapCenter: [number, number] = position
    ? [position.latitude, position.longitude]
    : DEFAULT_CENTER;

  if (loading) {
    return (
      <div className="position-simulator-page">
        <div className="position-simulator-container">
          <div className="position-simulator-status">Loading simulator...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="position-simulator-page">
      <div className="position-simulator-container">
        {/* <button className="position-simulator-back" onClick={() => navigate("/")}>
          ← Back to home
        </button> */}

        <div className="position-simulator-header">
          <h1>Position simulator</h1>
          <p>
            Click anywhere on the map to set your current location — tours in progress will use it to track where you are.
          </p>
        </div>

        <div className="position-simulator-card">
          <div className="position-simulator-map">
            <MapContainer center={mapCenter} zoom={13} style={{ height: "440px", width: "100%" }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <ClickHandler onPick={handlePick} />
              {position && (
                <Marker
                  position={[position.latitude, position.longitude]}
                  icon={markerIconInstance}
                />
              )}
            </MapContainer>
          </div>

          <div className="position-simulator-footer">
            {position ? (
              <div className="position-simulator-coords">
                Lat: {position.latitude.toFixed(5)}, Lng: {position.longitude.toFixed(5)}
              </div>
            ) : (
              <div className="position-simulator-coords position-simulator-coords-empty">
                Click the map to set your current location.
              </div>
            )}

            {saving && <div className="position-simulator-message">Saving...</div>}
            {!saving && error && (
              <div className="position-simulator-message position-simulator-error">{error}</div>
            )}
            {!saving && success && (
              <div className="position-simulator-message position-simulator-success">
                {success}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}