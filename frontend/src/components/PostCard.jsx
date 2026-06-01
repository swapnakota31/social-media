import { useState } from "react";
import { Link } from "react-router-dom";
import CommentThread from "./CommentThread";
import { isPostShared, markPostShared } from "../services/socialApi";

function PostCard({
  post,
  currentUserId,
  comments,
  isOpen,
  commentDraft,
  replyTarget,
  onToggleComments,
  onToggleLike,
  onCommentDraftChange,
  onSubmitComment,
  onReply,
  onUpdatePost,
  onDeletePost,
}) {
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
  const [previewUrl, setPreviewUrl] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState(() => (isPostShared(post.id) ? "Shared" : ""));
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content || "");
  const isOwner = String(currentUserId) === String(post.user_id);

  const shareUrl = `${window.location.origin}/feed#post-${post.id}`;
  const shareText = `${post.username} shared a post on SocialFeed`;

  const persistShareState = (channel) => {
    markPostShared(post.id, { channel, url: shareUrl });
    setShareStatus("Shared");
    setShareOpen(false);
  };

  const copyPostLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      persistShareState("copy-link");
    } catch (error) {
      window.prompt("Copy this post link", shareUrl);
      persistShareState("copy-link-fallback");
    }
  };

  const useNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.username} on SocialFeed`,
          text: shareText,
          url: shareUrl,
        });
        persistShareState("native-share");
        return;
      } catch (error) {
        return;
      }
    }

    await copyPostLink();
  };

  const shareTo = (channel) => {
    const shareTargets = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    };

    const target = shareTargets[channel];
    if (target) {
      window.open(target, "_blank", "noopener,noreferrer");
      persistShareState(channel);
    }
  };

  const handleEditStart = () => {
    setEditDraft(post.content || "");
    setIsEditing(true);
    setShareOpen(false);
  };

  const handleEditCancel = () => {
    setEditDraft(post.content || "");
    setIsEditing(false);
  };

  const handleEditSave = async () => {
    if (typeof onUpdatePost !== "function") {
      return;
    }

    await onUpdatePost(post.id, { content: editDraft });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (typeof onDeletePost !== "function") {
      return;
    }

    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) {
      return;
    }

    await onDeletePost(post.id);
  };

  return (
    <>
      <article className="post-card social-card" id={`post-${post.id}`}>
        <Link to={`/profile/${post.user_id}`} className="post-author-link post-author-link-clickable">
          <img
            className="post-avatar"
            src={post.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
            alt={`${post.username} avatar`}
          />
          <div className="post-author-copy">
            <h3>{post.username}</h3>
            <small>{new Date(post.created_at).toLocaleString()}</small>
          </div>
        </Link>

        <div className="post-card-body">
          {isEditing ? (
            <div className="post-edit-shell">
              <textarea
                className="post-edit-textarea"
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
              />
              <div className="post-edit-actions">
                <button type="button" className="primary-chip" onClick={handleEditSave}>Save</button>
                <button type="button" className="ghost-chip" onClick={handleEditCancel}>Cancel</button>
              </div>
            </div>
          ) : (
            <p className="post-card-content">{post.content}</p>
          )}

          {post.media?.length > 0 && (
            <button
              type="button"
              className="post-media-button"
              onClick={() => setPreviewUrl(post.media[0].url)}
              aria-label="Open image preview"
            >
              <img
                src={post.media[0].url}
                alt="Post"
                className="post-image"
              />
            </button>
          )}
        </div>

        <div className="post-card-meta-row">
          <button
            type="button"
            className={`action-pill ${post.is_liked_by_me ? "action-pill-active" : ""}`}
            onClick={() => onToggleLike(post.id)}
          >
            {post.is_liked_by_me ? "Unlike" : "Like"} {post.likes || 0}
          </button>
          <button type="button" className="action-pill" onClick={() => onToggleComments(post.id)}>
            Comment {post.comments_count || comments?.length || 0}
          </button>
          <button
            type="button"
            className={`action-pill action-pill-ghost ${shareStatus ? "action-pill-active" : ""}`}
            onClick={() => setShareOpen((current) => !current)}
          >
            {shareStatus || "Share"}
          </button>
          {isOwner && !isEditing && (
            <>
              <button type="button" className="action-pill action-pill-ghost" onClick={handleEditStart}>Edit</button>
              <button type="button" className="action-pill action-pill-ghost" onClick={handleDelete}>Delete</button>
            </>
          )}
          <span className="post-card-muted">
            {likedBy.length > 0 ? `Liked by ${likedBy.slice(0, 3).map((user) => user.username).join(", ")}` : "No likes yet"}
          </span>
        </div>

        {shareOpen && (
          <div className="post-share-menu" role="menu" aria-label="Share options">
            <button type="button" onClick={copyPostLink}>Copy post link</button>
            <button type="button" onClick={useNativeShare}>Native share</button>
            <button type="button" onClick={() => shareTo("whatsapp")}>WhatsApp</button>
            <button type="button" onClick={() => shareTo("telegram")}>Telegram</button>
            <button type="button" onClick={() => shareTo("x")}>Twitter / X</button>
          </div>
        )}

        {isOpen && (
          <section className="comment-shell">
            <div className="comment-composer">
              {replyTarget && (
                <div className="reply-banner">
                  Replying to {replyTarget.username}
                  <button type="button" onClick={() => onReply(post.id, null)}>
                    Cancel
                  </button>
                </div>
              )}
              <textarea
                value={commentDraft}
                onChange={(event) => onCommentDraftChange(post.id, event.target.value)}
                placeholder="Write a comment..."
              />
              <button type="button" className="primary-chip" onClick={() => onSubmitComment(post.id)}>
                Comment
              </button>
            </div>

            <CommentThread comments={comments} onReply={(comment) => onReply(post.id, comment)} />
          </section>
        )}
      </article>

      {previewUrl && (
        <button type="button" className="image-preview-modal" onClick={() => setPreviewUrl("")}> 
          <img src={previewUrl} alt="Expanded post preview" className="image-preview-modal-image" />
        </button>
      )}
    </>
  );
}

export default PostCard;