const pool = require("../db");

const createPost = async (req, res) => {

    try {

        const { content } = req.body;

        const result = await pool.query(

            `
            INSERT INTO posts (content)
            VALUES ($1)
            RETURNING *
            `,
            [content]

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

        const result = await pool.query(

            `
            SELECT * FROM posts
            ORDER BY created_at DESC
            `
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

    createPost,
    getPosts

};