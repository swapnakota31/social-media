import { useState, useEffect } from "react";

import { useNavigate, Link } from "react-router-dom";

function Feed() {

  const [content, setContent] = useState("");
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [feedError, setFeedError] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUsername = localStorage.getItem("username");
  const currentUserId = localStorage.getItem("userId");

  const authHeaders = {
    Authorization: `Bearer ${token}`
  };

  const handleLogout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");

    navigate("/");

  };

  const handleCreatePost = async () => {

    const response = await fetch(
      "http://localhost:3000/api/posts",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },

        body: JSON.stringify({
          content,
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (response.ok) {

      alert("Post created 🚀");

      fetchPosts();

      setContent("");

    } else {

      alert(data.message);

    }

  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      setFeedError("");

      const response = await fetch(
        "http://localhost:3000/api/posts",
        {
          headers: authHeaders,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPosts([]);
        setFeedError(data.message || "Failed to load posts");
        return;
      }

      const safePosts = Array.isArray(data) ? data : [];
      setPosts(safePosts);

      safePosts.forEach((post) => {
        fetchComments(post.id);
      });
    } catch (error) {
      console.log(error);
      setPosts([]);
      setFeedError("Failed to load posts");
    } finally {
      setLoadingPosts(false);
    }

  };

  useEffect(() => {

    fetchPosts();

  }, []);

  const handleComment = async (postId) => {

    console.log(postId);

    console.log(commentInputs[postId]);

    const response = await fetch(
      "http://localhost:3000/api/comments",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },

        body: JSON.stringify({

          post_id: postId,

          content: commentInputs[postId]

        }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (response.ok) {

      fetchComments(postId);

      setCommentInputs((prev) => ({

        ...prev,

        [postId]: ""

      }));

    }

  };

  const fetchComments = async (postId) => {

    const response = await fetch(
      `http://localhost:3000/api/comments/${postId}`
      ,
      {
        headers: authHeaders,
      }
    );

    const data = await response.json();

    setComments((prev) => ({

      ...prev,

      [postId]: data

    }));

  };
  const handleLike = async (postId) => {
    const likeRequests = [
      {
        url: `http://localhost:3000/api/posts/${postId}/like`,
        method: "POST",
      },
      {
        url: `http://localhost:3000/api/posts/like/${postId}`,
        method: "PUT",
      },
    ];

    for (const request of likeRequests) {
      const response = await fetch(request.url, {
        method: request.method,
        headers: authHeaders,
      });

      if (response.ok) {
        fetchPosts();
        return;
      }

      if (response.status !== 404) {
        break;
      }
    }

};

  return (

    <div className="app-layout">

      <nav className="navbar">

        <h2>SocialFeed 🚀</h2>

        <small>
          <Link to={`/profile/${currentUserId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            Signed in as {currentUsername}
          </Link>
        </small>

        <button onClick={handleLogout}>
          Logout
        </button>

      </nav>

      <div className="main-layout">

        <aside className="sidebar">

          <ul>

          <li>🏠 Home</li>

          <li>
            <Link to={`/profile/${currentUserId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              👤 Profile
            </Link>
          </li>

          <li>🔍 Explore</li>

          <li>💬 Messages</li>

        </ul>

        </aside>

        <main className="feed-section">

          <div className="create-post">

            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button onClick={handleCreatePost}>
              Create Post
            </button>

          </div>

          <div className="posts-container">

            {loadingPosts && <p>Loading posts...</p>}

            {feedError && <p>{feedError}</p>}

            {posts.map((post) => (

              <div
                key={post.id}
                className="post-card"
              >

                <div className="post-header">

                  <Link to={`/profile/${post.user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="avatar">
                      {post.username?.[0] || 'U'}
                    </div>
                  </Link>

                  <div>

                    <h4>
                      <Link to={`/profile/${post.user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {post.username}
                      </Link>
                    </h4>

                    <small>
                      {new Date(post.created_at).toLocaleString()}
                    </small>

                  </div>

                </div>

                <p>{post.content}</p>

                <div className="post-actions">

                  <span
  onClick={() => handleLike(post.id)}
  style={{ cursor: "pointer" }}
>

  {post.is_liked_by_me ? "💔 Unlike" : "❤️ Like"} {post.likes || 0}

</span>

                  <span
                    onClick={() =>
                      setOpenComments((prev) => ({

                        ...prev,

                        [post.id]: !prev[post.id]

                      }))
                    }
                    style={{ cursor: "pointer" }}
                  >

                    💬 {comments[post.id]?.length || 0} Comments

                  </span>

                </div>

                {openComments[post.id] && (

                  <div className="comment-section">

                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({

                          ...prev,

                          [post.id]: e.target.value

                        }))
                      }
                    />

                    <button
                      onClick={() => handleComment(post.id)}
                    >
                      Comment
                    </button>

                    <div className="comments-list">

                      {comments[post.id]?.map((comment) => (

                        <div
                          key={comment.id}
                          className="comment-item"
                        >

                          <small>{comment.username}</small>
                          <p>{comment.content}</p>

                        </div>

                      ))}

                      {Array.isArray(post.liked_by) && post.liked_by.length > 0 && (
                        <small>
                          Liked by {post.liked_by.map((user) => user.username).join(", ")}
                        </small>
                      )}

                    </div>

                  </div>

                )}

              </div>

            ))}

          </div>

        </main>

        <aside className="right-sidebar">

          <h3>Trends 🔥</h3>

          <p>#React</p>

          <p>#NodeJS</p>

          <p>#PostgreSQL</p>

        </aside>

      </div>

      <div className="mobile-nav">

        <span>🏠</span>

        <span>🔍</span>

        <span>➕</span>

        <span>❤️</span>

        <span>👤</span>

      </div>

    </div>

  );

}

export default Feed;