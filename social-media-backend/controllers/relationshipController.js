const pool = require("../db");

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

const buildProfileCounts = async (client, userId, viewerId) => {
    const followsEnabled = await hasTable(client, "follows");

    if (!followsEnabled) {
        const fallbackResult = await client.query(
            `
            SELECT
                u.id,
                u.username,
                u.bio,
                u.profile_pic,
                u.created_at,
                COALESCE(post_stats.total_posts, 0)::int AS total_posts,
                COALESCE(post_stats.total_likes, 0)::int AS total_likes,
                0::int AS followers_count,
                0::int AS following_count,
                false AS is_following,
                false AS follows_you
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*)::int AS total_posts, COALESCE(SUM(likes), 0)::int AS total_likes
                FROM posts
                GROUP BY user_id
            ) post_stats ON post_stats.user_id = u.id
            WHERE u.id = $1
            `,
            [userId]
        );

        return fallbackResult.rows[0] || null;
    }

    const result = await client.query(
        `
        SELECT
            u.id,
            u.username,
            u.bio,
            u.profile_pic,
            u.created_at,
            COALESCE(post_stats.total_posts, 0)::int AS total_posts,
            COALESCE(post_stats.total_likes, 0)::int AS total_likes,
            COALESCE(follower_stats.followers_count, 0)::int AS followers_count,
            COALESCE(following_stats.following_count, 0)::int AS following_count,
            EXISTS (
                SELECT 1
                FROM follows f
                WHERE f.follower_id = $2
                AND f.following_id = u.id
            ) AS is_following,
            EXISTS (
                SELECT 1
                FROM follows f
                WHERE f.follower_id = u.id
                AND f.following_id = $2
            ) AS follows_you
        FROM users u
        LEFT JOIN (
            SELECT user_id, COUNT(*)::int AS total_posts, COALESCE(SUM(likes), 0)::int AS total_likes
            FROM posts
            GROUP BY user_id
        ) post_stats ON post_stats.user_id = u.id
        LEFT JOIN (
            SELECT following_id, COUNT(*)::int AS followers_count
            FROM follows
            GROUP BY following_id
        ) follower_stats ON follower_stats.following_id = u.id
        LEFT JOIN (
            SELECT follower_id, COUNT(*)::int AS following_count
            FROM follows
            GROUP BY follower_id
        ) following_stats ON following_stats.follower_id = u.id
        WHERE u.id = $1
        `,
        [userId, viewerId]
    );

    return result.rows[0] || null;
};

const searchUsers = async (req, res) => {
    try {
        const viewerId = req.user.id;
        const query = String(req.query.q || "").trim();

        if (!query) {
            return res.json({ users: [] });
        }

        const client = await pool.connect();

        try {
            const followsEnabled = await hasTable(client, "follows");

            if (!followsEnabled) {
                const fallbackResult = await client.query(
                    `
                    SELECT
                        u.id,
                        u.username,
                        u.bio,
                        u.profile_pic,
                        u.created_at,
                        0::int AS followers_count,
                        0::int AS following_count,
                        false AS is_following
                    FROM users u
                    WHERE LOWER(u.username) LIKE LOWER($1)
                    ORDER BY u.username ASC
                    LIMIT 10
                    `,
                    [`%${query}%`]
                );

                return res.json({ users: fallbackResult.rows });
            }

            const result = await client.query(
                `
                SELECT
                    u.id,
                    u.username,
                    u.bio,
                    u.profile_pic,
                    u.created_at,
                    COALESCE(follower_stats.followers_count, 0)::int AS followers_count,
                    COALESCE(following_stats.following_count, 0)::int AS following_count,
                    EXISTS (
                        SELECT 1
                        FROM follows f
                        WHERE f.follower_id = $2
                        AND f.following_id = u.id
                    ) AS is_following
                FROM users u
                LEFT JOIN (
                    SELECT following_id, COUNT(*)::int AS followers_count
                    FROM follows
                    GROUP BY following_id
                ) follower_stats ON follower_stats.following_id = u.id
                LEFT JOIN (
                    SELECT follower_id, COUNT(*)::int AS following_count
                    FROM follows
                    GROUP BY follower_id
                ) following_stats ON following_stats.follower_id = u.id
                WHERE LOWER(u.username) LIKE LOWER($1)
                ORDER BY u.username ASC
                LIMIT 10
                `,
                [`%${query}%`, viewerId]
            );

            res.json({ users: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const followUser = async (req, res) => {
    const client = await pool.connect();

    try {
        const viewerId = req.user.id;
        const targetId = Number(req.params.id);

        if (!targetId || Number.isNaN(targetId)) {
            return res.status(400).json({ message: "Invalid user id" });
        }

        if (viewerId === targetId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const followsEnabled = await hasTable(client, "follows");
        const notificationsEnabled = await hasTable(client, "notifications");

        if (!followsEnabled) {
            return res.status(503).json({ message: "Follow feature is unavailable until migrations are applied" });
        }

        await client.query("BEGIN");

        const targetUser = await client.query(
            `SELECT id FROM users WHERE id = $1`,
            [targetId]
        );

        if (targetUser.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "User not found" });
        }

        const insertResult = await client.query(
            `
            INSERT INTO follows (follower_id, following_id)
            VALUES ($1, $2)
            ON CONFLICT (follower_id, following_id) DO NOTHING
            RETURNING id
            `,
            [viewerId, targetId]
        );

        if (notificationsEnabled && insertResult.rows.length > 0) {
            await client.query(
                `
                INSERT INTO notifications (recipient_user_id, actor_user_id, type, metadata)
                VALUES ($1, $2, 'follow', jsonb_build_object('source', 'profile_actions'))
                `,
                [targetId, viewerId]
            );
        }

        const profile = await buildProfileCounts(client, targetId, viewerId);

        await client.query("COMMIT");

        res.json({
            message: insertResult.rows.length > 0 ? "Followed" : "Already following",
            profile,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.log(error);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
};

const unfollowUser = async (req, res) => {
    const client = await pool.connect();

    try {
        const viewerId = req.user.id;
        const targetId = Number(req.params.id);

        if (!targetId || Number.isNaN(targetId)) {
            return res.status(400).json({ message: "Invalid user id" });
        }

        const followsEnabled = await hasTable(client, "follows");

        if (!followsEnabled) {
            return res.status(503).json({ message: "Follow feature is unavailable until migrations are applied" });
        }

        await client.query("BEGIN");

        await client.query(
            `
            DELETE FROM follows
            WHERE follower_id = $1 AND following_id = $2
            `,
            [viewerId, targetId]
        );

        const profile = await buildProfileCounts(client, targetId, viewerId);

        await client.query("COMMIT");

        res.json({
            message: "Unfollowed",
            profile,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.log(error);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
};

const getFollowers = async (req, res) => {
    try {
        const viewerId = req.user.id;
        const { id } = req.params;

        const client = await pool.connect();

        try {
            const followsEnabled = await hasTable(client, "follows");

            if (!followsEnabled) {
                return res.json({ followers: [] });
            }

            const result = await client.query(
                `
                SELECT
                    u.id,
                    u.username,
                    u.bio,
                    u.profile_pic,
                    u.created_at,
                    EXISTS (
                        SELECT 1
                        FROM follows f
                        WHERE f.follower_id = $2
                        AND f.following_id = u.id
                    ) AS is_following
                FROM follows f
                JOIN users u ON u.id = f.follower_id
                WHERE f.following_id = $1
                ORDER BY f.created_at DESC
                `,
                [id, viewerId]
            );

            res.json({ followers: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getFollowing = async (req, res) => {
    try {
        const viewerId = req.user.id;
        const { id } = req.params;

        const client = await pool.connect();

        try {
            const followsEnabled = await hasTable(client, "follows");

            if (!followsEnabled) {
                return res.json({ following: [] });
            }

            const result = await client.query(
                `
                SELECT
                    u.id,
                    u.username,
                    u.bio,
                    u.profile_pic,
                    u.created_at,
                    EXISTS (
                        SELECT 1
                        FROM follows f
                        WHERE f.follower_id = $2
                        AND f.following_id = u.id
                    ) AS is_following
                FROM follows f
                JOIN users u ON u.id = f.following_id
                WHERE f.follower_id = $1
                ORDER BY f.created_at DESC
                `,
                [id, viewerId]
            );

            res.json({ following: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const client = await pool.connect();

        try {
            const notificationsEnabled = await hasTable(client, "notifications");

            if (!notificationsEnabled) {
                return res.json({ notifications: [] });
            }

            const result = await client.query(
                `
                SELECT
                    n.id,
                    n.type,
                    n.post_id,
                    n.comment_id,
                    n.metadata,
                    n.is_read,
                    n.created_at,
                    actor.id AS actor_id,
                    actor.username AS actor_username,
                    actor.profile_pic AS actor_profile_pic,
                    post.content AS post_content
                FROM notifications n
                LEFT JOIN users actor ON actor.id = n.actor_user_id
                LEFT JOIN posts post ON post.id = n.post_id
                WHERE n.recipient_user_id = $1
                ORDER BY n.created_at DESC
                LIMIT 50
                `,
                [userId]
            );

            res.json({ notifications: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    searchUsers,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getNotifications,
};