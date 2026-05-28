import { useState } from "react";

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Feed() {

  const [content, setContent] = useState("");
  const [posts, setPosts] = useState([]);

  const navigate = useNavigate();

  const handleLogout = () => {

    localStorage.removeItem("token");

    navigate("/");

  };

  const handleCreatePost = async () => {

    const response = await fetch(
      "http://localhost:3000/api/posts",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
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

  const response = await fetch(
    "http://localhost:3000/api/posts"
  );

  const data = await response.json();

  setPosts(data);

};

  useEffect(() => {

    fetchPosts();

  }, []);

return (

  <div className="app-layout">

    <nav className="navbar">

      <h2>SocialFeed 🚀</h2>

      <button onClick={handleLogout}>
        Logout
      </button>

    </nav>

    <div className="main-layout">

      <aside className="sidebar">

        <ul>

          <li>🏠 Home</li>

          <li>👤 Profile</li>

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

          {posts.map((post) => (

            <div
              key={post.id}
              className="post-card"
            >

              <div className="post-header">

                <div className="avatar">
                  S
                </div>

                <div>

                  <h4>Swapna</h4>

                  <small>
                    {new Date(post.created_at).toLocaleString()}
                  </small>

                </div>

              </div>

              <p>{post.content}</p>

              <div className="post-actions">

                <span>❤️ Like</span>

                <span>💬 Comment</span>

              </div>

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