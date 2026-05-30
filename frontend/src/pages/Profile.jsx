import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import SocialNavbar from "../components/SocialNavbar";
import {
  createComment,
  fetchComments,
  fetchFollowers,
  fetchFollowing,
  fetchProfile,
  fetchUserPosts,
  followUser,
  toggleLike,
  unfollowUser,
  updateProfile,
  uploadProfilePicture,
} from "../services/socialApi";
import "./Profile.css";

function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = {
    id: localStorage.getItem("userId"),
    username: localStorage.getItem("username"),
    bio: localStorage.getItem("bio"),
    profile_pic: localStorage.getItem("profile_pic"),
  };

  const isMe = String(currentUser.id) === String(id);

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTargets, setReplyTargets] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [picInput, setPicInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [relationshipModal, setRelationshipModal] = useState(null);
  const [relationshipLoading, setRelationshipLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("profile_pic");
    localStorage.removeItem("bio");
    navigate("/");
  };

  const loadComments = async (postId) => {
    const data = await fetchComments(postId);
    setCommentsByPost((current) => ({
      ...current,
      [postId]: data.comments || [],
    }));
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchProfile(id);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      const data = await fetchUserPosts(id);
      const userPosts = data.posts || [];
      setPosts(userPosts);
      await Promise.all(userPosts.map((post) => loadComments(post.id)));
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadPosts();
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

  const handleSave = async () => {
    try {
      setIsUploadingImage(true);

      let nextProfilePic = picInput.trim();

      if (selectedFile) {
        const uploadData = await uploadProfilePicture(selectedFile);
        nextProfilePic = uploadData.user?.profile_pic || uploadData.url || nextProfilePic;
      }

      const data = await updateProfile({
        bio: bioInput,
        profile_pic: selectedFile ? undefined : nextProfilePic || undefined,
      });

      const nextUser = selectedFile && nextProfilePic
        ? { ...data.user, profile_pic: nextProfilePic }
        : data.user;

      setUser(nextUser);

      if (nextUser?.username) {
        localStorage.setItem("username", nextUser.username);
      }

      if (typeof nextUser?.bio === "string") {
        localStorage.setItem("bio", nextUser.bio);
      }

      if (nextUser?.profile_pic) {
        localStorage.setItem("profile_pic", nextUser.profile_pic);
      }

      setEditing(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");
    } catch (error) {
      alert(error.message || "Update failed");
    } finally {
      setIsUploadingImage(false);
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
      await loadComments(postId);
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
    await loadComments(postId);
  };

  const openRelationships = async (type) => {
    if (!user) {
      return;
    }

    try {
      setRelationshipLoading(true);
      const data = type === "followers" ? await fetchFollowers(user.id) : await fetchFollowing(user.id);
      setRelationshipModal({
        type,
        title: type === "followers" ? "Followers" : "Following",
        items: data[type] || [],
      });
    } finally {
      setRelationshipLoading(false);
    }
  };

  const closeRelationships = () => setRelationshipModal(null);

  const handleFollowToggle = async () => {
    if (!user) {
      return;
    }

    const data = user.is_following ? await unfollowUser(user.id) : await followUser(user.id);

    if (data.profile) {
      setUser(data.profile);
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

  return (
    <div className="social-app">
      <SocialNavbar currentUser={currentUser} onLogout={handleLogout} />

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

                  {!isMe && (
                    <button className="profile-btn profile-btn-primary" onClick={handleFollowToggle}>
                      {user.is_following ? "Unfollow" : "Follow"}
                    </button>
                  )}

                  {!isMe && <button className="profile-btn profile-btn-soft">Message</button>}
                </div>
              </div>

              <p className="profile-bio">{user.bio || "No bio added yet. This space is ready for a great intro."}</p>

              <div className="profile-meta-row">
                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                <span>{user.followers_count || 0} followers</span>
                <span>{user.following_count || 0} following</span>
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
                onChange={(event) => setBioInput(event.target.value)}
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
                <small>JPG, PNG, WEBP. Max 5MB. Uploaded via Cloudinary and saved as a URL in PostgreSQL.</small>
              </div>

              <input
                value={picInput}
                onChange={(event) => setPicInput(event.target.value)}
                placeholder="Or paste an image URL"
              />
            </div>

            <div className="profile-edit-actions">
              <button className="profile-btn profile-btn-primary" onClick={handleSave} disabled={isUploadingImage}>
                {isUploadingImage ? "Saving..." : "Save Changes"}
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
          <button type="button" className="profile-stat-card profile-stat-button" onClick={() => openRelationships("followers")}>
            <span className="profile-stat-label">Followers</span>
            <strong>{user.followers_count || 0}</strong>
          </button>

          <button type="button" className="profile-stat-card profile-stat-button" onClick={() => openRelationships("following")}>
            <span className="profile-stat-label">Following</span>
            <strong>{user.following_count || 0}</strong>
          </button>

          <article className="profile-stat-card">
            <span className="profile-stat-label">Total Posts</span>
            <strong>{user.total_posts || 0}</strong>
          </article>

          <article className="profile-stat-card">
            <span className="profile-stat-label">Likes Received</span>
            <strong>{user.total_likes || 0}</strong>
          </article>

          <article className="profile-stat-card">
            <span className="profile-stat-label">Account Type</span>
            <strong>{isMe ? "Owner" : user.is_following ? "Following" : "Viewer"}</strong>
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
          )}
        </section>
      </section>

      {relationshipModal && (
        <div className="profile-modal-backdrop" onClick={closeRelationships} role="presentation">
          <div className="profile-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="profile-modal-header">
              <h3>{relationshipModal.title}</h3>
              <button type="button" onClick={closeRelationships}>Close</button>
            </div>

            {relationshipLoading ? (
              <p>Loading relationships...</p>
            ) : (
              <div className="profile-relationship-list">
                {relationshipModal.items.length === 0 ? (
                  <p>No {relationshipModal.title.toLowerCase()} yet.</p>
                ) : (
                  relationshipModal.items.map((member) => (
                    <Link key={member.id} to={`/profile/${member.id}`} className="profile-relationship-item">
                      <img
                        src={member.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
                        alt={member.username}
                      />
                      <div>
                        <strong>{member.username}</strong>
                        <small>{member.bio || "No bio"}</small>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;