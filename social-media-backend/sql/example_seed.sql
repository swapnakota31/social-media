CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    example_user_id INTEGER;
    example_post_id INTEGER;
BEGIN
    INSERT INTO users (username, email, password)
    VALUES (
        'swapna',
        'swapna@example.com',
        crypt('password123', gen_salt('bf'))
    )
    ON CONFLICT (email)
    DO UPDATE SET
        username = EXCLUDED.username,
        password = EXCLUDED.password
    RETURNING id INTO example_user_id;

    INSERT INTO posts (content, user_id, likes)
    VALUES ('Hello from Swapna', example_user_id, 0)
    RETURNING id INTO example_post_id;

    INSERT INTO comments (post_id, content, user_id)
    VALUES (example_post_id, 'Nice post!', example_user_id);

    INSERT INTO post_likes (post_id, user_id)
    VALUES (example_post_id, example_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;

    UPDATE posts
    SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = example_post_id)
    WHERE id = example_post_id;
END $$;