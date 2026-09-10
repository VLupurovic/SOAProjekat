import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createTour, type Difficulty } from "../../services/api";

import "./CreateTour.css";

export default function CreateTour() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [tagsInput, setTagsInput] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [imagesInput, setImagesInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const duration = Number(durationInput);
    if (!durationInput || Number.isNaN(duration) || duration <= 0) {
      setError("Duration must be a positive number of minutes.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const images = imagesInput
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      await createTour(token, {
        name,
        description,
        difficulty,
        tags,
        durationMinutes: duration,
        images,
      });

      setSuccess("Tour created successfully.");
      setName("");
      setDescription("");
      setDifficulty("easy");
      setTagsInput("");
      setDurationInput("");
      setImagesInput("");

      setTimeout(() => {
        navigate("/my-tours");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tour.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-tour-page">
      <div className="create-tour-container">
        {/* <button className="create-tour-back" onClick={() => navigate("/my-tours")}>
          ← Back to my tours
        </button> */}

        <div className="create-tour-header">
          <h1>Create a tour</h1>
          <p>
            Set up the basics of your tour. It will be saved as a draft with a price of 0 — you
            can add key points and publish it later.
          </p>
        </div>

        <form className="create-tour-card" onSubmit={handleSubmit}>
          <div className="tour-form-group">
            <label htmlFor="name">Tour name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter the tour name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="tour-form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Describe what tourists will experience..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              required
            />
          </div>

          <div className="tour-form-group">
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="tour-form-group">
            <label htmlFor="tags">
              Tags
              <span className="optional">Optional</span>
            </label>
            <input
              id="tags"
              type="text"
              placeholder="nature, history, hiking"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <small>Separate tags with commas.</small>
          </div>

          <div className="tour-form-group">
            <label htmlFor="duration">Duration (minutes)</label>
            <input
              id="duration"
              type="number"
              min="1"
              placeholder="e.g. 90"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              required
            />
            <small>How long the tour takes to complete. This can't be changed later.</small>
          </div>

          <div className="tour-form-group">
            <label htmlFor="images">
              Images
              <span className="optional">Optional</span>
            </label>
            <input
              id="images"
              type="text"
              placeholder="https://.../photo1.jpg, https://.../photo2.jpg"
              value={imagesInput}
              onChange={(e) => setImagesInput(e.target.value)}
            />
            <small>Separate image URLs with commas. Shown in the tour gallery.</small>
          </div>

          <div className="tour-form-group">
            <label>Status</label>
            <input type="text" value="Draft" disabled />
            <small>New tours always start as a draft with price 0.</small>
          </div>

          {error && <div className="tour-message tour-error">{error}</div>}
          {success && <div className="tour-message tour-success">{success}</div>}

          <button type="submit" className="create-tour-button" disabled={loading}>
            {loading ? "Creating tour..." : "Create tour"}
          </button>
        </form>
      </div>
    </div>
  );
}