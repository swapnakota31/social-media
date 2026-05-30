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

const buildCommentTree = (rows) => {
    const commentsById = new Map();
    const roots = [];

    rows.forEach((row) => {
        commentsById.set(row.id, {
            ...row,
            replies: [],
        });
    });

    rows.forEach((row) => {
        const comment = commentsById.get(row.id);

        if (row.parent_comment_id && commentsById.has(row.parent_comment_id)) {
            commentsById.get(row.parent_comment_id).replies.push(comment);
            return;
        }

        roots.push(comment);
    });

    return roots;
};

const createComment = async (req, res) => {
    const client = await pool.connect();

    try {
        const { post_id, content, parent_comment_id } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Comment content is required" });
        }

        await client.query("BEGIN");

        const supportsNestedComments = await hasColumn(client, "comments", "parent_comment_id");
        const notificationsEnabled = await hasTable(client, "notifications");

        const insertQuery = supportsNestedComments
            ? `
                INSERT INTO comments (post_id, content, user_id, parent_comment_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id, post_id, user_id, content, parent_comment_id, created_at
              `
            : `
                INSERT INTO comments (post_id, content, user_id)
                VALUES ($1, $2, $3)
                RETURNING id, post_id, user_id, content, NULL::int AS parent_comment_id, created_at
              `;

        const insertParams = supportsNestedComments
            ? [post_id, content.trim(), userId, parent_comment_id || null]
            : [post_id, content.trim(), userId];

        const result = await client.query(insertQuery, insertParams);

        const comment = result.rows[0];

        const authorResult = await client.query(
            `SELECT id, username, profile_pic FROM users WHERE id = $1`,
            [userId]
        );

        const postAuthorResult = await client.query(
            `SELECT user_id FROM posts WHERE id = $1`,
            [post_id]
        );

        const postAuthorId = postAuthorResult.rows[0]?.user_id || null;

        if (notificationsEnabled && postAuthorId && postAuthorId !== userId) {
            await client.query(
                `
                INSERT INTO notifications (recipient_user_id, actor_user_id, type, post_id, comment_id, metadata)
                VALUES ($1, $2, $3, $4, $5, jsonb_build_object('source', 'comment_action'))
                `,
                [postAuthorId, userId, parent_comment_id ? "reply" : "comment", post_id, comment.id]
            );
        }

        if (supportsNestedComments && notificationsEnabled && parent_comment_id) {
            const parentAuthorResult = await client.query(
                `
                SELECT user_id
                FROM comments
                WHERE id = $1
                `,
                [parent_comment_id]
            );

            const parentAuthorId = parentAuthorResult.rows[0]?.user_id || null;

            if (parentAuthorId && parentAuthorId !== userId && parentAuthorId !== postAuthorId) {
                await client.query(
                    `
                    INSERT INTO notifications (recipient_user_id, actor_user_id, type, post_id, comment_id, metadata)
                    VALUES ($1, $2, 'reply', $3, $4, jsonb_build_object('source', 'reply_action'))
                    `,
                    [parentAuthorId, userId, post_id, comment.id]
                );
            }
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Comment added",
            comment: {
                ...comment,
                author: authorResult.rows[0] || null,
                replies: [],
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    } finally {
        client.release();
    }
};

const getComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const client = await pool.connect();

        try {
            const supportsNestedComments = await hasColumn(client, "comments", "parent_comment_id");
            const parentCommentSelect = supportsNestedComments ? "c.parent_comment_id" : "NULL::int AS parent_comment_id";

            const result = await client.query(
                `
                SELECT
                    c.id,
                    c.post_id,
                    c.user_id,
                    c.content,
                    ${parentCommentSelect},
                    c.created_at,
                    COALESCE(u.username, 'Unknown') AS username,
                    u.profile_pic
                FROM comments c
                LEFT JOIN users u ON u.id = c.user_id
                WHERE post_id = $1
                ORDER BY created_at ASC, id ASC
                `,
                [postId]
            );

            res.json({ comments: buildCommentTree(result.rows) });
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

module.exports = {
    createComment,
    getComments,
};