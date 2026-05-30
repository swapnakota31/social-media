import { Link } from "react-router-dom";

function CommentThread({ comments = [], onReply, depth = 0 }) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return null;
  }

  return (
    <div className="comment-thread">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="comment-card"
          style={{ marginLeft: `${Math.min(depth, 3) * 12}px` }}
        >
          <Link to={`/profile/${comment.user_id || comment.author?.id || ""}`} className="comment-avatar-link">
            <img
              className="comment-avatar"
              src={comment.profile_pic || comment.author?.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
              alt="Comment author"
            />
          </Link>
          <div className="comment-body">
            <div className="comment-meta">
              <Link to={`/profile/${comment.user_id || comment.author?.id || ""}`}>{comment.username || comment.author?.username || "Unknown"}</Link>
              <span>{new Date(comment.created_at).toLocaleString()}</span>
            </div>
            <p>{comment.content}</p>
            <button type="button" className="comment-reply-btn" onClick={() => onReply?.(comment)}>
              Reply
            </button>
            {Array.isArray(comment.replies) && comment.replies.length > 0 && (
              <CommentThread comments={comment.replies} onReply={onReply} depth={depth + 1} />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export default CommentThread;