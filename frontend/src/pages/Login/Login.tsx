import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../../services/api";
import { showToast } from "../../utils/toast";

import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    try {
      setLoading(true);

      const result = await login({
        username,
        password,
      });

      localStorage.setItem("token", result.token);
      localStorage.setItem("userId", String(result.id));

      showToast(`Dobrodošao/la nazad, ${username}!`, "success");

      navigate("/");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      <div className="login-container">

        <Link to="/" className="login-logo">
          Ćao Kralju
        </Link>

        <div className="login-heading">
          <p>WELCOME</p>

          <h1>Login to your account</h1>

          <span>
            Continue your journey and discover new adventures.
          </span>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <div className="login-form-group">
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              required
            />
          </div>

          <div className="login-form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="login-register">
          Don't have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>

      </div>

    </div>
  );
}