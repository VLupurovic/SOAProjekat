import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../../services/api";

import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"tourist" | "guide">("tourist");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const result = await register({
        username,
        email,
        password,
        role,
      });

      localStorage.setItem("token", result.token);
      localStorage.setItem("userId", String(result.id));
      localStorage.setItem("role", role);

      navigate("/login");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">

      <div className="register-container">

        <Link to="/" className="register-logo">
          Ćao Kralju
        </Link>

        <div className="register-heading">
          <p>START YOUR JOURNEY</p>

          <h1>Create an account</h1>

          <span>
            Join us and discover your next adventure.
          </span>
        </div>

        <form
          className="register-form"
          onSubmit={handleSubmit}
        >

          <div className="form-group">
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

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
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

          <div className="form-group">
            <label>Confirm password</label>

            <input
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label>I want to register as</label>

            <div className="role-selection">

              <button
                type="button"
                className={
                  role === "tourist"
                    ? "role-option active"
                    : "role-option"
                }
                onClick={() => setRole("tourist")}
              >
                <strong>Tourist</strong>
                <span>
                  Discover and book tours
                </span>
              </button>

              <button
                type="button"
                className={
                  role === "guide"
                    ? "role-option active"
                    : "role-option"
                }
                onClick={() => setRole("guide")}
              >
                <strong>Guide</strong>
                <span>
                  Create and manage tours
                </span>
              </button>

            </div>
          </div>

          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="register-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

        </form>

        <p className="register-login">
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>

      </div>

    </div>
  );
}