import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listBlogs, getProfile, followUser, isFollowing, createComment, type Blog, type Profile } from "../../services/api";

import "./Blogs.css";

export default function Blogs() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
  const [followLoading, setFollowLoading] = useState<number | null>(null);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentStatus, setCommentStatus] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const blogList = await listBlogs();
        setBlogs(blogList);

        if (token) {
          const me = await getProfile(token);
          setProfile(me);

          const uniqueAuthorIds = Array.from(new Set(blogList.map((b) => b.authorId))).filter(
            (id) => id !== me.id
          );

          const statuses = await Promise.all(
            uniqueAuthorIds.map((id) => isFollowing(token, id).then((r) => [id, r.following] as const))
          );
          setFollowingMap(Object.fromEntries(statuses));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load blogs.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function handleFollow(authorId: number) {
    if (!token) {
      navigate("/login");
      return;
    }
    setFollowLoading(authorId);
    try {
      await followUser(token, authorId);
      setFollowingMap((prev) => ({ ...prev, [authorId]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to follow user.");
    } finally {
      setFollowLoading(null);
    }
  }

  async function handleComment(blogId: string) {
    if (!token) {
      navigate("/login");
      return;
    }
    const content = commentDrafts[blogId]?.trim();
    if (!content) return;

    setCommentLoading(blogId);
    setCommentStatus((prev) => ({ ...prev, [blogId]: "" }));
    try {
      await createComment(token, blogId, content);
      setCommentDrafts((prev) => ({ ...prev, [blogId]: "" }));
      setCommentStatus((prev) => ({ ...prev, [blogId]: "Comment posted." }));
    } catch (err) {
      setCommentStatus((prev) => ({
        ...prev,
        [blogId]: err instanceof Error ? err.message : "Failed to post comment.",
      }));
    } finally {
      setCommentLoading(null);
    }
  }

  return (
    <div className="blogs-page">
      <div className="blogs-container">
        {/* <button className="blogs-back" onClick={() => navigate("/")}>
          ← Back to home
        </button> */}

        <div className="blogs-header">
          <div>
            <h1>Explore blogs</h1>
            <p>Discover stories, experiences and adventures shared by our travelers.</p>
          </div>

          <button
            className="blogs-create-button"
            onClick={() => (token ? navigate("/create-blog") : navigate("/login"))}
          >
            + Create blog
          </button>
        </div>

        {loading && <div className="blogs-status">Loading blogs...</div>}
        {error && <div className="blogs-status blogs-error">{error}</div>}

        {!loading && !error && blogs.length === 0 && (
          <div className="blogs-empty">
            <h2>No blogs yet</h2>
            <p>Be the first person to share a travel story.</p>
            <button onClick={() => (token ? navigate("/create-blog") : navigate("/login"))}>
              Create the first blog
            </button>
          </div>
        )}

        {!loading && !error && blogs.length > 0 && (
          <div className="blogs-grid">
            {blogs.map((blog) => {
              const isOwnBlog = profile?.id === blog.authorId;
              const following = followingMap[blog.authorId];

              return (
                <article className="blog-card" key={blog.id}>
                  <div className="blog-card-image">
                    {blog.images && blog.images.length > 0 ? (
                      <img src={blog.images[0]} alt={blog.title} />
                    ) : (
                      <div className="blog-card-placeholder">
                        <span>TRAVEL</span>
                      </div>
                    )}
                  </div>

                  <div className="blog-card-content">
                    <div className="blog-card-meta">
                      <span>{blog.authorName}</span>
                      <span>{formatDate(blog.createdAt)}</span>
                    </div>

                    <h2>{blog.title}</h2>
                    <p>{blog.description}</p>

                    {token && !isOwnBlog && (
                      <div className="blog-follow-row">
                        <button
                          className={following ? "blog-follow-button following" : "blog-follow-button"}
                          onClick={() => handleFollow(blog.authorId)}
                          disabled={following || followLoading === blog.authorId}
                        >
                          {following
                            ? "Following"
                            : followLoading === blog.authorId
                            ? "Following..."
                            : "Follow"}
                        </button>
                      </div>
                    )}

                    {token && !isOwnBlog && (
                      <div className="blog-comment-box">
                        <input
                          type="text"
                          placeholder={following ? "Write a comment..." : "Follow the author to comment"}
                          value={commentDrafts[blog.id] ?? ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [blog.id]: e.target.value }))
                          }
                        />
                        <button
                          onClick={() => handleComment(blog.id)}
                          disabled={commentLoading === blog.id}
                        >
                          {commentLoading === blog.id ? "Posting..." : "Comment"}
                        </button>
                      </div>
                    )}

                    {commentStatus[blog.id] && (
                      <p className="blog-comment-status">{commentStatus[blog.id]}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}