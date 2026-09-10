import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";

import "./Navbar.css";

function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json);
    return claims.role ?? null;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [isGuide, setIsGuide] = useState(false);
  const [isTourist, setIsTourist] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, [location.pathname]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsGuide(false);
      setIsTourist(false);
      return;
    }

    const role = decodeRole(token);

    setIsGuide(role === "guide");
    setIsTourist(role === "tourist");
  }, [isLoggedIn]);

  const hiddenOnRoutes = ["/login", "/register"];

  if (hiddenOnRoutes.includes(location.pathname)) {
    return null;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");

    setIsLoggedIn(false);

    showToast("Uspešno si se izlogovao/la.", "success");

    navigate("/");
  }

  return (
    <nav className="navbar">

      <Link to="/" className="navbar-logo">
        Ćao Kralju
      </Link>

      <div className="navbar-links">

        <Link to="/">
          Home
        </Link>

        <Link to="/blogs">
          Blogs
        </Link>

        <Link to="/tours">
          Tours
        </Link>

        {isLoggedIn && isGuide && (
          <Link to="/my-tours">
            My Tours
          </Link>
        )}

        {isLoggedIn && isTourist && (
          <Link to="/position-simulator">
            Position Simulator
          </Link>
        )}

        {isLoggedIn && isTourist && (
          <Link to="/cart">
            Cart
          </Link>
        )}

        {isLoggedIn && isTourist && (
          <Link to="/my-purchases">
            My Purchases
          </Link>
        )}



        {isLoggedIn && (
          <Link to="/create-blog">
            Create Blog
          </Link>
        )}

      </div>

      <div className="navbar-auth">

        {isLoggedIn ? (
          <>
            <Link
              to="/profile"
              className="profile-button"
            >
              Profile
            </Link>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="login-button"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="register-button"
            >
              Register
            </Link>
          </>
        )}

      </div>

    </nav>
  );
}