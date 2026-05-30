import { Link } from "react-router-dom";
import CommentThread from "./CommentThread";

function PostCard({
  post,
  comments,
  isOpen,
  commentDraft,
  replyTarget,
  onToggleComments,
  onToggleLike,
  onCommentDraftChange,
  onSubmitComment,
  onReply,
}) {
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];

  return (
    <article className="post-card social-card">
      <header className="post-card-header">
        <Link to={`/profile/${post.user_id}`} className="post-author-link">
          <img
            className="post-avatar"
            src={post.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
            alt={`${post.username} avatar`}
          />
          <div>
            <h3>{post.username}</h3>
            <small>{new Date(post.created_at).toLocaleString()}</small>
          </div>
        </Link>
        <Link to={`/profile/${post.user_id}`} className="ghost-chip">
          View profile
        </Link>
      </header>

      <p className="post-card-content">{post.content}</p>

      {mediaItems.length > 0 && (
        <div className={`post-media-grid post-media-grid-${Math.min(mediaItems.length, 4)}`}>
          {mediaItems.map((media) => (
            <img key={media.id} src={media.url} alt="Post attachment" className="post-media-item" />
          ))}
        </div>
      )}

      <div className="post-card-meta-row">
        <button type="button" className={`action-pill ${post.is_liked_by_me ? "action-pill-active" : ""}`} onClick={() => onToggleLike(post.id)}>
          {post.is_liked_by_me ? "Unlike" : "Like"} {post.likes || 0}
        </button>
        <button type="button" className="action-pill" onClick={() => onToggleComments(post.id)}>
          Comments {post.comments_count || comments?.length || 0}
        </button>
        <span className="post-card-muted">{likedBy.length > 0 ? `Liked by ${likedBy.slice(0, 3).map((user) => user.username).join(", ")}` : "No likes yet"}</span>
      </div>

      {isOpen && (
        <section className="comment-shell">
          <div className="comment-composer">
            {replyTarget && (
              <div className="reply-banner">
                Replying to {replyTarget.username}
                <button type="button" onClick={() => onReply(post.id, null)}>Cancel</button>
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
  );
}

export default PostCard;