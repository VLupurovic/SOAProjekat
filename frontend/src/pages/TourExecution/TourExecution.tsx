import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import {
  getPublicTour,
  getCurrentPosition,
  setCurrentPosition as setCurrentPositionApi,
  startExecution,
  getActiveExecution,
  checkProximity,
  completeExecution,
  abandonExecution,
  type PublicTour,
  type TourExecution as TourExecutionData,
} from "../../services/api";

import "leaflet/dist/leaflet.css";
import "./TourExecution.css";

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
const POLL_INTERVAL_MS = 10000;

function ClickToMove({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function TourExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [tour, setTour] = useState<PublicTour | null>(null);
  const [execution, setExecution] = useState<TourExecutionData | null>(null);
  const [currentPosition, setCurrentPosition] = useState<
      { latitude: number; longitude: number } | null
    >(null);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [endedStatus, setEndedStatus] = useState<"completed" | "abandoned" | null>(null);
  const [finishedDurationMs, setFinishedDurationMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());


  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (execution?.status !== "active") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [execution?.status]);

  function formatDuration(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  const loadAll = useCallback(async () => {
    if (!token || !id) return;

    try {
      const [tourResult, executionResult, positionResult] = await Promise.all([
        getPublicTour(id, token),
        getActiveExecution(token, id),
        getCurrentPosition(token),
      ]);

      setTour(tourResult);
      setExecution(executionResult);
      setCurrentPosition(positionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tour execution.");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!id) return;

    loadAll();
  }, [token, id, navigate, loadAll]);

  useEffect(() => {
    if (!execution || execution.status !== "active" || !token || !id) {
      return;
    }

    async function tick() {
      try {
        const position = await getCurrentPosition(token!);
        setCurrentPosition(position);
        if (!position) return;

        const result = await checkProximity(token!, id!, position);

        setExecution((prev) =>
          prev
            ? {
                ...prev,
                completedPoints: result.completedPoints,
                lastActivity: result.lastActivity,
              }
            : prev
        );

        if (result.newlyCompleted.length > 0) {
          setNotice(
            `Reached: ${result.newlyCompleted
              .map((p) => (p === "startPoint" ? "start point" : "end point"))
              .join(", ")}`
          );
        }
      } catch {}
    }

    pollRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [execution?.status, token, id]);

  async function handleStart() {
    if (!token || !id) return;

    if (!currentPosition) {
      setError("Set your current location in the Position simulator first.");
      return;
    }

    setError("");
    setStarting(true);

    try {
      await startExecution(token, id, currentPosition);
      const fresh = await getActiveExecution(token, id);
      setExecution(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start the tour.");
    } finally {
      setStarting(false);
    }
  }

  async function handleMoveOnMap(lat: number, lng: number) {
  if (!token || !id) return;

  const next = { latitude: lat, longitude: lng };
  setCurrentPosition(next);

  try {
    await setCurrentPositionApi(token, next);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to update position.");
  }
}

    async function handleFinish(kind: "completed" | "abandoned") {
    if (!token || !id || !execution) return;

    setFinishing(true);
    setError("");

    try {
      if (kind === "completed") {
        await completeExecution(token, id);
      } else {
        await abandonExecution(token, id);
      }
      const elapsed = Date.now() - new Date(execution.startedAt).getTime();
      setFinishedDurationMs(elapsed);
      setEndedStatus(kind);
      setExecution(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end the session.");
    } finally {
      setFinishing(false);
    }
  }

  function isPointDone(pointType: "startPoint" | "endPoint") {
    return execution?.completedPoints.some((p) => p.pointType === pointType) ?? false;
  }

  if (loading) {
    return (
      <div className="tour-execution-page">
        <div className="tour-execution-container">
          <div className="tour-execution-status">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !tour) {
    return (
      <div className="tour-execution-page">
        <div className="tour-execution-container">
          <div className="tour-execution-status tour-execution-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!tour) return null;

  const markers: { key: string; lat: number; lng: number; label: string }[] = [];
  if (tour.startPoint) {
    markers.push({
      key: "start",
      lat: tour.startPoint.latitude,
      lng: tour.startPoint.longitude,
      label: `Start · ${tour.startPoint.name}`,
    });
  }
  if (tour.endPoint) {
    markers.push({
      key: "end",
      lat: tour.endPoint.latitude,
      lng: tour.endPoint.longitude,
      label: `End · ${tour.endPoint.name}`,
    });
  }
  if (currentPosition) {
    markers.push({
      key: "current",
      lat: currentPosition.latitude,
      lng: currentPosition.longitude,
      label: "You are here",
    });
  }

  const mapCenter: [number, number] = currentPosition
    ? [currentPosition.latitude, currentPosition.longitude]
    : markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : DEFAULT_CENTER;

  return (
    <div className="tour-execution-page">
      <div className="tour-execution-container">
        {/* <button className="tour-execution-back" onClick={() => navigate(`/tours/${id}/view`)}>
          ← Back to tour
        </button> */}

        <div className="tour-execution-header">
          <h1>{tour.name}</h1>
          <p>Track your progress as you make your way through the tour.</p>
        </div>

        {error && <div className="tour-execution-message tour-execution-error">{error}</div>}
        {notice && !error && (
          <div className="tour-execution-message tour-execution-notice">{notice}</div>
        )}

                {endedStatus && (
          <div className="tour-execution-ended">
            <h2>{endedStatus === "completed" ? "✓ Tour completed" : "Tour abandoned"}</h2>
            <p>
              {endedStatus === "completed"
                ? "Great work — this session has been recorded as completed."
                : "This session has been recorded as abandoned. You can start again any time."}
            </p>
            {finishedDurationMs !== null && (
              <p className="tour-execution-final-duration">
                Duration: {formatDuration(finishedDurationMs)}
              </p>
            )}
            <div className="tour-execution-actions">
              <button
                className="tour-execution-start-button"
                onClick={() => setEndedStatus(null)}
              >
                Start again
              </button>
              <Link className="tour-execution-continue" to="/tours">
                Browse more tours
              </Link>
            </div>
          </div>
        )}

        {!endedStatus && (
          <>
            <p className="tour-execution-map-hint">
              Click anywhere on the map to simulate moving to that location.
            </p>

            <div className="tour-execution-map">
              <MapContainer center={mapCenter} zoom={13} style={{ height: "420px", width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <ClickToMove onPick={handleMoveOnMap} />
                {markers.map((m) => (
                  <Marker key={m.key} position={[m.lat, m.lng]} icon={markerIconInstance}>
                    <Popup>{m.label}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {!currentPosition && (
              <div className="tour-execution-position-warning">
                You haven't set a current location yet.{" "}
                <Link to="/position-simulator">Open the position simulator</Link> to set one.
              </div>
            )}

            {!execution ? (
              <div className="tour-execution-start-card">
                <h2>Ready to start?</h2>
                <p>
                  Starting the tour records your current simulated location as your starting
                  point. Every 10 seconds we'll check the position simulator to see if you've
                  reached a key point.
                </p>
                <button
                  className="tour-execution-start-button"
                  onClick={handleStart}
                  disabled={starting || !currentPosition}
                >
                  {starting ? "Starting..." : "Start tour"}
                </button>
              </div>
            ) : (
              <div className="tour-execution-progress-card">
                <h2>Session in progress</h2>

                <ul className="tour-execution-checklist">
                  <li className={isPointDone("startPoint") ? "done" : ""}>
                    {isPointDone("startPoint") ? "✓" : "○"} Start point
                    {tour.startPoint ? ` · ${tour.startPoint.name}` : ""}
                  </li>
                  <li className={isPointDone("endPoint") ? "done" : ""}>
                    {isPointDone("endPoint") ? "✓" : "○"} End point
                    {tour.endPoint ? ` · ${tour.endPoint.name}` : ""}
                  </li>
                </ul>

                <p className="tour-execution-duration">
                  Duration: {formatDuration(now - new Date(execution.startedAt).getTime())}
                </p>
                <p className="tour-execution-last-activity">
                  Last activity: {new Date(execution.lastActivity).toLocaleTimeString()}
                </p>

                <div className="tour-execution-actions">
                  <button
                    className="tour-execution-complete-button"
                    onClick={() => handleFinish("completed")}
                    disabled={finishing}
                  >
                    {finishing ? "Saving..." : "Complete tour"}
                  </button>
                  <button
                    className="tour-execution-abandon-button"
                    onClick={() => handleFinish("abandoned")}
                    disabled={finishing}
                  >
                    Abandon tour
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}