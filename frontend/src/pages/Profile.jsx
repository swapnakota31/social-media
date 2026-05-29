import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./Profile.css";

function Profile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [picInput, setPicInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchProfile = async () => {
    setLoading(true);
    const res = await fetch(`http://localhost:3000/api/users/${id}`);
    const data = await res.json();
    setUser(data.user);
    setLoading(false);
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    const res = await fetch(`http://localhost:3000/api/users/${id}/posts`);
    const data = await res.json();
    const userPosts = data.posts || [];
    setPosts(userPosts);

    try {
      const commentRequests = userPosts.map((post) =>
        fetch(`http://localhost:3000/api/comments/${post.id}`, {
          headers: authHeaders,
        }).then((commentRes) => commentRes.json())
      );

      const commentsData = await Promise.all(commentRequests);
      const totalComments = commentsData.reduce(
        (sum, item) => sum + (Array.isArray(item) ? item.length : 0),
        0
      );
      setCommentsCount(totalComments);
    } catch (error) {
      console.log(error);
      setCommentsCount(0);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [id]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setSelectedFile(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!selectedFile) {
      return null;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    setIsUploadingImage(true);

    try {
      const uploadRes = await fetch(`http://localhost:3000/api/users/upload-profile-pic`, {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.message || "Image upload failed");
      }

      setUser(uploadData.user);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");
      return uploadData.url;
    } catch (error) {
      alert(error.message || "Image upload failed");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    let uploadedImageUrl = null;

    if (selectedFile) {
      uploadedImageUrl = await uploadImage();
      if (!uploadedImageUrl) {
        return;
      }
    }

    const res = await fetch(`http://localhost:3000/api/users/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        bio: bioInput,
        profile_pic: uploadedImageUrl || picInput || undefined,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      // persist username so other UI (navbar, feed) updates immediately
      if (data.user && data.user.username) {
        localStorage.setItem("username", data.user.username);
      }
      if (data.user && data.user.profile_pic) {
        localStorage.setItem("profile_pic", data.user.profile_pic);
      }
      setEditing(false);
    } else {
      alert(data.message || "Update failed");
    }
  };

  if (loading) {
    return (
      <section className="profile-shell">
        <div className="profile-skeleton">
          <div className="profile-skeleton-row" />
          <div className="profile-skeleton-row" />
          <div className="profile-skeleton-row profile-skeleton-row-wide" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="profile-shell">
        <div className="profile-empty-card">
          <h2>Profile Not Found</h2>
          <p>This account may have been removed or does not exist.</p>
        </div>
      </section>
    );
  }

  const isMe = String(currentUserId) === String(id);

  return (
    <section className="profile-shell">
      <header className="profile-hero">
        <div className="profile-cover" />

        <div className="profile-identity-wrap">
          <img
            className="profile-avatar-lg"
            src={user.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
            alt={`${user.username} avatar`}
          />

          <div className="profile-identity-content">
            <div className="profile-identity-main-row">
              <div>
                <h1>{user.username}</h1>
                <p className="profile-handle">@{user.username?.toLowerCase()}</p>
              </div>

              <div className="profile-header-actions">
                {isMe && !editing && (
                  <button
                    className="profile-btn profile-btn-primary"
                    onClick={() => {
                      setEditing(true);
                      setBioInput(user.bio || "");
                      setPicInput(user.profile_pic || "");
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                      }
                      setPreviewUrl("");
                    }}
                  >
                    Edit Profile
                  </button>
                )}
                {!isMe && <button className="profile-btn profile-btn-soft">Follow</button>}
                {!isMe && <button className="profile-btn profile-btn-soft">Message</button>}
              </div>
            </div>

            <p className="profile-bio">{user.bio || "No bio added yet. This space is ready for a great intro."}</p>

            <div className="profile-meta-row">
              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
              <span>Followers 0</span>
              <span>Following 0</span>
            </div>
          </div>
        </div>
      </header>

      {isMe && editing && (
        <section className="profile-edit-panel">
          <h3>Update Profile</h3>
          <div className="profile-edit-grid">
            <textarea
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder="Write a short bio"
            />
            <div className="profile-upload-box">
              <label htmlFor="profile-image-input">Profile Image</label>
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <img className="profile-upload-preview" src={previewUrl} alt="Selected preview" />
              ) : (
                <img
                  className="profile-upload-preview"
                  src={user.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
                  alt="Current profile"
                />
              )}
              <small>
                JPG, PNG, WEBP. Max 5MB. Uploaded via Cloudinary and saved as URL in PostgreSQL.
              </small>
            </div>
            <input
              value={picInput}
              onChange={(e) => setPicInput(e.target.value)}
              placeholder="Or paste an image URL"
            />
          </div>
          <div className="profile-edit-actions">
            <button className="profile-btn profile-btn-primary" onClick={handleSave} disabled={isUploadingImage}>
              {isUploadingImage ? "Uploading..." : "Save Changes"}
            </button>
            <button
              className="profile-btn profile-btn-soft"
              onClick={() => {
                setEditing(false);
                setSelectedFile(null);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                }
                setPreviewUrl("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="profile-stats-grid">
        <article className="profile-stat-card">
          <span className="profile-stat-label">Total Posts</span>
          <strong>{user.total_posts || 0}</strong>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Likes Received</span>
          <strong>{user.total_likes || 0}</strong>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Comments</span>
          <strong>{commentsCount}</strong>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Followers</span>
          <strong>0</strong>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Following</span>
          <strong>0</strong>
        </article>
      </section>

      <section className="profile-posts-section">
        <div className="profile-posts-head">
          <h2>Posts</h2>
          <p>Recent thoughts and updates from this profile</p>
        </div>

        {loadingPosts ? (
          <div className="profile-empty-card">
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="profile-empty-card">
            <h3>No Posts Yet</h3>
            <p>Posts shared by this account will appear here.</p>
          </div>
        ) : (
          <div className="profile-posts-grid">
            {posts.map((post) => (
              <article key={post.id} className="profile-post-card">
                <p>{post.content}</p>
                <div className="profile-post-footer">
                  <small>{new Date(post.created_at).toLocaleString()}</small>
                  <div className="profile-post-meta">
                    <button type="button">Like</button>
                    <button type="button">Comment</button>
                    <span>{post.likes || 0} likes</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default Profile;
