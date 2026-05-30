const pool = require("../db");
const cloudinary = require("../config/cloudinary");

const schemaCache = new Map();

const hasTable = async (client, tableName) => {
    const key = `table:${tableName}`;

    if (schemaCache.has(key)) {
        return schemaCache.get(key);
    }

    const result = await client.query(
        `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
        ) AS exists
        `,
        [tableName]
    );

    const exists = Boolean(result.rows[0]?.exists);
    schemaCache.set(key, exists);
    return exists;
};

const hasColumn = async (client, tableName, columnName) => {
    const key = `column:${tableName}.${columnName}`;

    if (schemaCache.has(key)) {
        return schemaCache.get(key);
    }

    const result = await client.query(
        `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
        ) AS exists
        `,
        [tableName, columnName]
    );

    const exists = Boolean(result.rows[0]?.exists);
    schemaCache.set(key, exists);
    return exists;
};

const parseMediaUrls = (mediaUrls) => {
    if (!mediaUrls) {
        return [];
    }

    if (Array.isArray(mediaUrls)) {
        return mediaUrls.filter(Boolean);
    }

    if (typeof mediaUrls === "string") {
        try {
            const parsed = JSON.parse(mediaUrls);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [mediaUrls];
        } catch (error) {
            return [mediaUrls];
        }
    }

    return [];
};

const uploadPostMedia = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "At least one image is required" });
        }

        const uploads = await Promise.all(
            req.files.map(
                (file) =>
                    new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                folder: "socialfeed/post_media",
                                resource_type: "image",
                                transformation: [
                                    {
                                        width: 1600,
                                        height: 1600,
                                        crop: "limit",
                                    },
                                ],
                            },
                            (error, result) => {
                                if (error) {
                                    reject(error);
                                    return;
                                }

                                resolve({
                                    url: result.secure_url,
                                    public_id: result.public_id,
                                });
                            }
                        );

                        uploadStream.end(file.buffer);
                    })
            )
        );

        res.json({
            message: "Media uploaded",
            media: uploads,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Media upload failed" });
    }
};

const fetchPostCard = async (client, postId, viewerId) => {
    const postLikesEnabled = await hasTable(client, "post_likes");
    const postMediaEnabled = await hasTable(client, "post_media");

    const likedBySelect = postLikesEnabled
        ? `
            COALESCE(
                (
                    SELECT json_agg(
                        jsonb_build_object(
                            'id', liker.id,
                            'username', liker.username,
                            'profile_pic', liker.profile_pic
                        )
                        ORDER BY liker.username ASC
                    )
                    FROM post_likes pl
                    JOIN users liker ON liker.id = pl.user_id
                    WHERE pl.post_id = p.id
                ),
                '[]'::json
            ) AS liked_by,
          `
        : `'[]'::json AS liked_by,`;

    const mediaSelect = postMediaEnabled
        ? `
            COALESCE(
                (
                    SELECT json_agg(
                        jsonb_build_object(
                            'id', media.id,
                            'url', media.media_url,
                            'type', media.media_type,
                            'sort_order', media.sort_order
                        )
                        ORDER BY media.sort_order ASC, media.id ASC
                    )
                    FROM post_media media
                    WHERE media.post_id = p.id
                ),
                '[]'::json
            ) AS media,
          `
        : `'[]'::json AS media,`;

    const likedByMeSelect = postLikesEnabled
        ? `
            EXISTS (
                SELECT 1
                FROM post_likes pl2
                WHERE pl2.post_id = p.id
                AND pl2.user_id = $2
            ) AS is_liked_by_me
          `
        : `false AS is_liked_by_me`;

    const result = await client.query(
        `
        SELECT
            p.id,
            p.content,
            p.created_at,
            p.likes,
            p.user_id,
            COALESCE(author.username, 'Unknown') AS username,
            author.profile_pic,
            COALESCE(comment_stats.comments_count, 0)::int AS comments_count,
            ${likedBySelect}
            ${mediaSelect}
            ${likedByMeSelect}
        FROM posts p
        LEFT JOIN users author ON author.id = p.user_id
        LEFT JOIN (
            SELECT post_id, COUNT(*)::int AS comments_count
            FROM comments
            GROUP BY post_id
        ) comment_stats ON comment_stats.post_id = p.id
        WHERE p.id = $1
        `,
        [postId, viewerId]
    );

    return result.rows[0] || null;
};

const createPost = async (req, res) => {
    try {
        const { content, media_urls: rawMediaUrls, mediaUrls } = req.body;
        const userId = req.user.id;
        const mediaUrlsList = parseMediaUrls(rawMediaUrls || mediaUrls);

        if ((!content || !content.trim()) && mediaUrlsList.length === 0) {
            return res.status(400).json({ message: "Post content or media is required" });
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const postMediaEnabled = await hasTable(client, "post_media");

            const postResult = await client.query(
                `
                INSERT INTO posts (content, user_id)
                VALUES ($1, $2)
                RETURNING id
                `,
                [content || "", userId]
            );

            const postId = postResult.rows[0].id;

            if (postMediaEnabled) {
                for (let index = 0; index < mediaUrlsList.length; index += 1) {
                    await client.query(
                        `
                        INSERT INTO post_media (post_id, media_url, media_type, sort_order)
                        VALUES ($1, $2, $3, $4)
                        `,
                        [postId, mediaUrlsList[index], "image", index]
                    );
                }
            }

            const createdPost = await fetchPostCard(client, postId, userId);

            await client.query("COMMIT");

            res.status(201).json({
                message: "Post created",
                post: createdPost,
            });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    }
};

const getPosts = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const cursor = req.query.cursor || null;
        const client = await pool.connect();

        try {
            const postLikesEnabled = await hasTable(client, "post_likes");
            const postMediaEnabled = await hasTable(client, "post_media");

            const likedBySelect = postLikesEnabled
                ? `
                    COALESCE(
                        (
                            SELECT json_agg(
                                jsonb_build_object(
                                    'id', liker.id,
                                    'username', liker.username,
                                    'profile_pic', liker.profile_pic
                                )
                                ORDER BY liker.username ASC
                            )
                            FROM post_likes pl
                            JOIN users liker ON liker.id = pl.user_id
                            WHERE pl.post_id = p.id
                        ),
                        '[]'::json
                    ) AS liked_by,
                  `
                : `'[]'::json AS liked_by,`;

            const mediaSelect = postMediaEnabled
                ? `
                    COALESCE(
                        (
                            SELECT json_agg(
                                jsonb_build_object(
                                    'id', media.id,
                                    'url', media.media_url,
                                    'type', media.media_type,
                                    'sort_order', media.sort_order
                                )
                                ORDER BY media.sort_order ASC, media.id ASC
                            )
                            FROM post_media media
                            WHERE media.post_id = p.id
                        ),
                        '[]'::json
                    ) AS media,
                  `
                : `'[]'::json AS media,`;

            const likedByMeSelect = postLikesEnabled
                ? `
                    EXISTS (
                        SELECT 1
                        FROM post_likes pl2
                        WHERE pl2.post_id = p.id
                        AND pl2.user_id = $3
                    ) AS is_liked_by_me
                  `
                : `false AS is_liked_by_me`;

            const result = await client.query(
                `
                SELECT
                    p.id,
                    p.content,
                    p.created_at,
                    p.likes,
                    p.user_id,
                    COALESCE(author.username, 'Unknown') AS username,
                    author.profile_pic,
                    COALESCE(comment_stats.comments_count, 0)::int AS comments_count,
                    ${likedBySelect}
                    ${mediaSelect}
                    ${likedByMeSelect}
                FROM posts p
                LEFT JOIN users author ON author.id = p.user_id
                LEFT JOIN (
                    SELECT post_id, COUNT(*)::int AS comments_count
                    FROM comments
                    GROUP BY post_id
                ) comment_stats ON comment_stats.post_id = p.id
                WHERE ($2::timestamptz IS NULL OR p.created_at < $2::timestamptz)
                ORDER BY p.created_at DESC, p.id DESC
                LIMIT $1
                `,
                [limit, cursor, userId]
            );

            res.json({
                posts: result.rows,
                nextCursor: result.rows.length > 0 ? result.rows[result.rows.length - 1].created_at : null,
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    }
};

const likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        const client = await pool.connect();

        let liked = true;

        try {
            await client.query("BEGIN");

            const postLikesEnabled = await hasTable(client, "post_likes");
            const notificationsEnabled = await hasTable(client, "notifications");
            const postsHasUpdatedAt = await hasColumn(client, "posts", "updated_at");

            const postAuthorResult = await client.query(
                `
                SELECT id, user_id
                FROM posts
                WHERE id = $1
                `,
                [postId]
            );

            if (postAuthorResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ message: "Post not found" });
            }

            const postAuthorId = postAuthorResult.rows[0].user_id;

            if (!postLikesEnabled) {
                await client.query(
                    `
                    UPDATE posts
                    SET likes = COALESCE(likes, 0) + 1
                    WHERE id = $1
                    `,
                    [postId]
                );

                const updatedPost = await fetchPostCard(client, postId, userId);

                await client.query("COMMIT");

                return res.json({
                    message: "Post liked",
                    liked: true,
                    post: updatedPost,
                });
            }

            const existingLike = await client.query(
                `
                SELECT id
                FROM post_likes
                WHERE post_id = $1 AND user_id = $2
                FOR UPDATE
                `,
                [postId, userId]
            );

            if (existingLike.rows.length > 0) {
                liked = false;

                await client.query(
                    `
                    DELETE FROM post_likes
                    WHERE post_id = $1 AND user_id = $2
                    `,
                    [postId, userId]
                );

                await client.query(
                    `
                    UPDATE posts
                    SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
                    ${postsHasUpdatedAt ? ", updated_at = NOW()" : ""}
                    WHERE id = $1
                    `,
                    [postId]
                );
            } else {
                await client.query(
                    `
                    INSERT INTO post_likes (post_id, user_id)
                    VALUES ($1, $2)
                    ON CONFLICT (post_id, user_id) DO NOTHING
                    `,
                    [postId, userId]
                );

                await client.query(
                    `
                    UPDATE posts
                    SET likes = COALESCE(likes, 0) + 1
                    ${postsHasUpdatedAt ? ", updated_at = NOW()" : ""}
                    WHERE id = $1
                    `,
                    [postId]
                );

                if (notificationsEnabled && postAuthorId && postAuthorId !== userId) {
                    await client.query(
                        `
                        INSERT INTO notifications (recipient_user_id, actor_user_id, type, post_id, metadata)
                        VALUES ($1, $2, 'like', $3, jsonb_build_object('source', 'post_action'))
                        `,
                        [postAuthorId, userId, postId]
                    );
                }
            }

            const updatedPost = await fetchPostCard(client, postId, userId);

            await client.query("COMMIT");

            const message = liked ? "Post liked" : "Post unliked";

            res.json({
                message,
                liked,
                post: updatedPost,
            });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Server error",
        });
    }
};

module.exports = {
    createPost,
    getPosts,
    likePost,
    uploadPostMedia,
};