import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Profile.css";

interface ProfileData {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
  bio: string;
  motto: string;
  isBlocked: boolean;
  createdAt: string;
}

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [bio, setBio] = useState("");
  const [motto, setMotto] = useState("");

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

    async function fetchProfile() {
      try {
        const response = await fetch(
          "http://localhost:8081/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to load profile"
          );
        }

        setProfile(result);

        setFirstName(result.firstName || "");
        setLastName(result.lastName || "");
        setProfilePicture(result.profilePicture || "");
        setBio(result.bio || "");
        setMotto(result.motto || "");
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [navigate]);

  async function handleSave() {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(
        "http://localhost:8081/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName,
            lastName,
            profilePicture,
            bio,
            motto,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to save changes"
        );
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              firstName,
              lastName,
              profilePicture,
              bio,
              motto,
            }
          : current
      );

      setSuccess("Changes saved successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          Loading profile...
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const displayName =
    `${firstName} ${lastName}`.trim() ||
    profile.username;

  return (
    <div className="profile-page">

      <div className="profile-container">

        {/* <button
          className="profile-back"
          onClick={() => navigate("/")}
        >
          ← Back to home
        </button> */}

        <div className="profile-header">
          <div>
            

            <h1>Profile settings</h1>

            <p>
              Manage your personal information and profile.
            </p>
          </div>

          <div className="profile-role-badge">
            {profile.role}
          </div>
        </div>

        <div className="profile-layout">

       

          <div className="profile-preview">

            <div className="profile-avatar">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={displayName}
                />
              ) : (
                displayName
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <h2>{displayName}</h2>

            <p className="profile-preview-username">
              @{profile.username}
            </p>

            {motto && (
              <p className="profile-preview-motto">
                "{motto}"
              </p>
            )}

            <div className="profile-preview-line" />

            <div className="profile-preview-item">
              <span>Account</span>
              <strong>{profile.username}</strong>
            </div>

            <div className="profile-preview-item">
              <span>Email</span>
              <strong>{profile.email}</strong>
            </div>

            <div className="profile-preview-item">
              <span>Role</span>
              <strong>{profile.role}</strong>
            </div>

            <div className="profile-preview-item">
              <span>Status</span>
              <strong>
                {profile.isBlocked
                  ? "Blocked"
                  : "Active"}
              </strong>
            </div>

          </div>

          

          <div className="profile-form-card">

            <div className="profile-form-header">
              <div>
                <span>PERSONAL INFORMATION</span>
                <h2>Edit your profile</h2>
              </div>
            </div>

            <div className="profile-form">

              <div className="profile-form-row">

                <div className="profile-form-group">
                  <label>First name</label>

                  <input
                    type="text"
                    value={firstName}
                    placeholder="Enter your first name"
                    onChange={(e) =>
                      setFirstName(e.target.value)
                    }
                  />
                </div>

                <div className="profile-form-group">
                  <label>Last name</label>

                  <input
                    type="text"
                    value={lastName}
                    placeholder="Enter your last name"
                    onChange={(e) =>
                      setLastName(e.target.value)
                    }
                  />
                </div>

              </div>

              <div className="profile-form-group">
                <label>Username</label>

                <input
                  type="text"
                  value={profile.username}
                  disabled
                />

                <small>
                  Username cannot be changed.
                </small>
              </div>

              <div className="profile-form-group">
                <label>Email</label>

                <input
                  type="email"
                  value={profile.email}
                  disabled
                />

                <small>
                  Email cannot be changed.
                </small>
              </div>

              <div className="profile-form-group">
                <label>Role</label>

                <input
                  type="text"
                  value={profile.role}
                  disabled
                />
              </div>

              <div className="profile-form-group">
                <label>Profile picture</label>

                <input
                  type="text"
                  value={profilePicture}
                  placeholder="Paste image URL"
                  onChange={(e) =>
                    setProfilePicture(e.target.value)
                  }
                />
              </div>

              <div className="profile-form-group">
                <label>Motto</label>

                <input
                  type="text"
                  value={motto}
                  placeholder="Write something that represents you"
                  onChange={(e) =>
                    setMotto(e.target.value)
                  }
                />
              </div>

              <div className="profile-form-group">
                <label>Bio</label>

                <textarea
                  value={bio}
                  placeholder="Tell other travelers something about yourself..."
                  rows={5}
                  onChange={(e) =>
                    setBio(e.target.value)
                  }
                />
              </div>

              {error && (
                <div className="profile-message profile-message-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="profile-message profile-message-success">
                  {success}
                </div>
              )}

              <button
                className="profile-save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving changes..."
                  : "Save changes"}
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}