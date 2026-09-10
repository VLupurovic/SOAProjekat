import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createBlog } from "../../services/api";

import "./CreateBlog.css";

export default function CreateBlog() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrlsInput, setImageUrlsInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const images = imageUrlsInput
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      await createBlog(token, title, description, images);

      setSuccess("Blog created successfully.");
      setTitle("");
      setDescription("");
      setImageUrlsInput("");

      setTimeout(() => {
        navigate("/blogs");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create blog.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-blog-page">
      <div className="create-blog-container">
        {/* <button className="create-blog-back" onClick={() => navigate("/")}>
          ← Back to home
        </button> */}

        <div className="create-blog-header">
          <h1>Create a blog</h1>
          <p>Share your experience, story or adventure with other travelers.</p>
        </div>

        <form className="create-blog-card" onSubmit={handleSubmit}>
          <div className="blog-form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              placeholder="Enter your blog title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="blog-form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Tell your story..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              required
            />
          </div>

          <div className="blog-form-group">
            <label htmlFor="createdAt">Creation date</label>
            <input id="createdAt" type="date" value={today} disabled />
            <small>The creation date is automatically set.</small>
          </div>

          <div className="blog-form-group">
            <label htmlFor="images">
              Image URLs
              <span className="optional">Optional</span>
            </label>
            <input
              id="images"
              type="text"
              placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
              value={imageUrlsInput}
              onChange={(e) => setImageUrlsInput(e.target.value)}
            />
            <small>Paste one or more image links, separated by commas.</small>
          </div>

          {error && <div className="blog-message blog-error">{error}</div>}
          {success && <div className="blog-message blog-success">{success}</div>}

          <button type="submit" className="create-blog-button" disabled={loading}>
            {loading ? "Creating blog..." : "Create blog"}
          </button>
        </form>
      </div>
    </div>
  );
}