const pool = require("../db");

const createPost = async (req, res) => {

    try {

        const { content } = req.body;
        const userId = req.user.id;

        const result = await pool.query(

            `
            INSERT INTO posts (content, user_id)
            VALUES ($1, $2)
            RETURNING *
            `,
            [content, userId]

        );

        res.json({

            message: "Post created 🚀",

            post: result.rows[0]

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            message: "Server error"

        });

    }

};
const getPosts = async (req, res) => {

    try {

        const userId = req.user?.id || null;

        const result = await pool.query(

            `
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.likes,
                COALESCE(author.username, 'Unknown') AS username,
                author.id AS user_id,
                COALESCE(
                    (
                        SELECT json_agg(
                            jsonb_build_object(
                                'id', liker.id,
                                'username', liker.username
                            )
                        )
                        FROM post_likes pl
                        JOIN users liker ON liker.id = pl.user_id
                        WHERE pl.post_id = p.id
                    ),
                    '[]'::json
                ) AS liked_by,
                EXISTS (
                    SELECT 1
                    FROM post_likes pl2
                    WHERE pl2.post_id = p.id
                    AND pl2.user_id = $1
                ) AS is_liked_by_me
            FROM posts p
            LEFT JOIN users author ON author.id = p.user_id
            ORDER BY p.created_at DESC
            `
            ,
            [userId]
        );

        res.json(result.rows);

    } catch (error) {

        console.log(error);

        res.status(500).json({

            message: "Server error"

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
                    WHERE id = $1
                    `,
                    [postId]
                );
            } else {
                await client.query(
                    `
                    INSERT INTO post_likes (post_id, user_id)
                    VALUES ($1, $2)
                    `,
                    [postId, userId]
                );

                await client.query(
                    `
                    UPDATE posts
                    SET likes = COALESCE(likes, 0) + 1
                    WHERE id = $1
                    `,
                    [postId]
                );
            }

            const updatedPost = await client.query(
                `
                SELECT *
                FROM posts
                WHERE id = $1
                `,
                [postId]
            );

            await client.query("COMMIT");

            const message = liked ? "Post liked ❤️" : "Post unliked 💔";

            res.json({

                message,

                liked,

                post: updatedPost.rows[0]

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

            message: "Server error"

        });

    }

};

module.exports = {

    createPost,
    getPosts,
    likePost

};