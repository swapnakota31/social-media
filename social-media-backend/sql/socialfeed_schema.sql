BEGIN;

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS post_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

UPDATE posts
SET likes = COALESCE(likes, 0)
WHERE likes IS NULL;

COMMIT;

-- Example usage after the schema is in place:
-- 1. Create a user through the app signup form.
-- 2. Create a post while logged in.
-- 3. Click Like once to add 1, click again to remove 1.
-- 4. Comments will be stored with the logged-in user's username.