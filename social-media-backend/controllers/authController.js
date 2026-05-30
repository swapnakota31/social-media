const pool = require("../db");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const signup = async (req, res) => {

    try {

        const { username, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(

            `
            INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, username, email
            `,
            [username, email, hashedPassword]
        );

        res.json({

            message: "User created successfully 🚀",

            user: result.rows[0]

        });

    } catch (error) {

    console.log(error);

    if (error.code === "23505") {

        return res.status(400).json({

            message: "Email already exists"

        });

    }

    res.status(500).json({

        message: "Server error"

    });

}

};



const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const result = await pool.query(

            `
            SELECT * FROM users
            WHERE email = $1
            `,
            [email]
        );

        if (result.rows.length === 0) {

            return res.status(400).json({

                message: "User not found"

            });

        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            return res.status(400).json({

                message: "Invalid password"

            });

        }

        const token = jwt.sign(

            {
                id: user.id,
                email: user.email
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "30d"
            }

        );

        res.json({

            message: "Login successful 🚀",

            token,

            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                profile_pic: user.profile_pic,
                created_at: user.created_at
            }

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            message: "Server error"

        });

    }

};

module.exports = {

    signup,
    login

};