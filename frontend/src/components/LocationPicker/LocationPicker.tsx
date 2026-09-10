import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import type { KeyPoint, KeyPointFormData } from "../../services/api";

import "leaflet/dist/leaflet.css";
import "./LocationPicker.css";

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

interface LocationPickerProps {
  title: string;
  hint: string;
  keyPoint: KeyPoint | null;
  onSave: (data: KeyPointFormData) => Promise<void>;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ title, hint, keyPoint, onSave }: LocationPickerProps) {
  const [name, setName] = useState(keyPoint?.name ?? "");
  const [description, setDescription] = useState(keyPoint?.description ?? "");
  const [image, setImage] = useState(keyPoint?.image ?? "");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    keyPoint ? { lat: keyPoint.latitude, lng: keyPoint.longitude } : null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mapCenter: [number, number] = position
    ? [position.lat, position.lng]
    : DEFAULT_CENTER;

  async function handleSave() {
    if (!position || !name.trim()) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        image: image.trim(),
        latitude: position.lat,
        longitude: position.lng,
      });
      setSuccess("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="location-picker">
      <h3>{title}</h3>
      <p className="location-picker-hint">{hint}</p>

      <div className="location-picker-map">
        <MapContainer center={mapCenter} zoom={13} style={{ height: "280px", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ClickHandler onPick={(lat, lng) => setPosition({ lat, lng })} />
          {position && <Marker position={[position.lat, position.lng]} icon={markerIconInstance} />}
        </MapContainer>
      </div>

      <div className="location-picker-form">
        <input
          type="text"
          placeholder="Name (e.g. Kalemegdan fortress)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <input
          type="text"
          placeholder="Image URL (optional)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        {position ? (
          <div className="location-picker-coords">
            Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
          </div>
        ) : (
          <div className="location-picker-coords location-picker-coords-empty">
            Click the map to place the marker.
          </div>
        )}

        {error && <div className="location-picker-message location-picker-error">{error}</div>}
        {success && (
          <div className="location-picker-message location-picker-success">{success}</div>
        )}

        <button
          type="button"
          className="location-picker-save"
          disabled={!position || !name.trim() || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : keyPoint ? "Update point" : "Save point"}
        </button>
      </div>
    </div>
  );
}