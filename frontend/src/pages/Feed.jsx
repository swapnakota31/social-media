import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import PostComposer from "../components/PostComposer";
import SocialNavbar from "../components/SocialNavbar";
import { createComment, createPost, fetchComments, fetchFeed, toggleLike } from "../services/socialApi";

function Feed() {
  const navigate = useNavigate();
  const sentinelRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTargets, setReplyTargets] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const currentUser = {
    id: localStorage.getItem("userId"),
    username: localStorage.getItem("username"),
    bio: localStorage.getItem("bio"),
    profile_pic: localStorage.getItem("profile_pic"),
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("profile_pic");
    localStorage.removeItem("bio");
    navigate("/");
  };

  const loadFeed = async ({ append = false, nextCursor = null } = {}) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError("");

      const data = await fetchFeed({ cursor: nextCursor || undefined });
      const incoming = data.posts || [];

      setPosts((current) => {
        const merged = append ? [...current, ...incoming] : incoming;
        const seen = new Set();
        return merged.filter((post) => {
          if (seen.has(post.id)) {
            return false;
          }
          seen.add(post.id);
          return true;
        });
      });

      setCursor(data.nextCursor || null);
      setHasMore(Boolean(data.nextCursor) && incoming.length > 0);

      if (incoming.length > 0) {
        await Promise.all(incoming.map((post) => loadPostComments(post.id)));
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadPostComments = async (postId) => {
    const data = await fetchComments(postId);
    setCommentsByPost((current) => ({
      ...current,
      [postId]: data.comments || [],
    }));
  };

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && cursor) {
          loadFeed({ append: true, nextCursor: cursor });
        }
      },
      { threshold: 0.15 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [cursor, hasMore, loadingMore]);

  const handleCreatePost = async ({ content, mediaUrls }) => {
    try {
      setPublishing(true);
      const data = await createPost({ content, mediaUrls });
      setPosts((current) => [data.post, ...current]);
      if (data.post?.id) {
        await loadPostComments(data.post.id);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleLike = async (postId) => {
    const data = await toggleLike(postId);
    setPosts((current) => current.map((post) => (post.id === postId ? data.post : post)));
  };

  const handleCommentDraftChange = (postId, value) => {
    setCommentDrafts((current) => ({ ...current, [postId]: value }));
  };

  const handleReplyTarget = (postId, comment) => {
    setReplyTargets((current) => ({ ...current, [postId]: comment }));
  };

  const handleToggleComments = async (postId) => {
    setOpenComments((current) => ({ ...current, [postId]: !current[postId] }));

    if (!commentsByPost[postId]) {
      await loadPostComments(postId);
    }
  };

  const handleSubmitComment = async (postId) => {
    const content = (commentDrafts[postId] || "").trim();
    if (!content) {
      return;
    }

    const replyTarget = replyTargets[postId];
    await createComment({
      post_id: postId,
      content,
      parent_comment_id: replyTarget?.id || null,
    });

    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setReplyTargets((current) => ({ ...current, [postId]: null }));
    await loadPostComments(postId);
  };

  return (
    <div className="social-app">
      <SocialNavbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="social-shell">
        <aside className="social-rail social-rail-left">
          <section className="social-profile-card social-card">
            <img
              className="social-profile-avatar"
              src={currentUser.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
              alt="Current user"
            />
            <strong>{currentUser.username}</strong>
            <p>{currentUser.bio || "No bio yet. Build your first strong profile note."}</p>
            <button type="button" className="primary-chip" onClick={() => navigate(`/profile/${currentUser.id}`)}>
              View profile
            </button>
          </section>

          <section className="social-card mini-tray">
            <h4>Shortcuts</h4>
            <Link to="/feed">Home feed</Link>
            <a href="#compose-post">Create post</a>
            <button type="button" onClick={() => document.getElementById("compose-post")?.scrollIntoView({ behavior: "smooth" })}>
              New post
            </button>
          </section>
        </aside>

        <section className="social-feed-column">
          <PostComposer onCreatePost={handleCreatePost} busy={publishing} />

          <div className="feed-intro social-card">
            <div>
              <h2>Home Feed</h2>
              <p>Fresh posts from the network, ordered newest first with infinite-scroll-ready pagination.</p>
            </div>
            <span className="composer-badge">{posts.length} posts</span>
          </div>

          {loading && <div className="social-card empty-state">Loading the feed...</div>}
          {error && <div className="social-card empty-state error-state">{error}</div>}

          <div className="feed-list">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                comments={commentsByPost[post.id] || []}
                isOpen={Boolean(openComments[post.id])}
                commentDraft={commentDrafts[post.id] || ""}
                replyTarget={replyTargets[post.id] || null}
                onToggleComments={handleToggleComments}
                onToggleLike={handleToggleLike}
                onCommentDraftChange={handleCommentDraftChange}
                onSubmitComment={handleSubmitComment}
                onReply={handleReplyTarget}
              />
            ))}
          </div>

          <div ref={sentinelRef} className="feed-sentinel">
            {loadingMore ? "Loading more posts..." : hasMore ? "Scroll for more" : "You are all caught up"}
          </div>
        </section>

        <aside className="social-rail social-rail-right">
          <section className="social-card suggestion-card">
            <h4>Why this structure works</h4>
            <p>All feed actions now share one API layer and one relational model, which makes likes, comments, follows, and notifications consistent.</p>
          </section>
          <section className="social-card suggestion-card">
            <h4>Next steps</h4>
            <ul>
              <li>Realtime notifications</li>
              <li>Saved posts</li>
              <li>Direct messages</li>
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default Feed;