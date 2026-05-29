const pool = require("../db");

const createComment = async (req, res) => {

    try {
        const { post_id, content } = req.body;
        const userId = req.user.id;

        const result = await pool.query(

            `
            INSERT INTO comments (post_id, content, user_id)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [post_id, content, userId]

        );

        res.json({

            message: "Comment added 🚀",

            comment: result.rows[0]

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            message: "Server error"

        });

    }

};

const getComments = async (req, res) => {

    try {

        const { postId } = req.params;

        const result = await pool.query(

            `
            SELECT
                c.id,
                c.post_id,
                c.content,
                c.created_at,
                COALESCE(u.username, 'Unknown') AS username
            FROM comments c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE post_id = $1
            ORDER BY created_at ASC
            `,
            [postId]

        );

        res.json(result.rows);

    } catch (error) {

        console.log(error);

        res.status(500).json({

            message: "Server error"

        });

    }

};

module.exports = {

    createComment,
    getComments

};