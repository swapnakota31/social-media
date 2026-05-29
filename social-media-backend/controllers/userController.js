const pool = require("../db");
const cloudinary = require("../config/cloudinary");

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT id, username, email, bio, profile_pic, created_at FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];

    const aggResult = await pool.query(
      `SELECT COUNT(*)::int AS total_posts, COALESCE(SUM(likes),0)::int AS total_likes
       FROM posts
       WHERE user_id = $1`,
      [id]
    );

    const stats = aggResult.rows[0];

    return res.json({ user: { ...user, total_posts: stats.total_posts, total_likes: stats.total_likes } });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;

    const postsResult = await pool.query(
      `SELECT id, content, created_at, likes FROM posts WHERE user_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ posts: postsResult.rows });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, profile_pic } = req.body;

    const nextBio = typeof bio === "string" ? bio : null;
    const nextProfilePic = typeof profile_pic === "string" ? profile_pic : null;

    const result = await pool.query(
      `
      UPDATE users
      SET
        bio = COALESCE($1, bio),
        profile_pic = COALESCE($2, profile_pic)
      WHERE id = $3
      RETURNING id, username, email, bio, profile_pic, created_at
      `,
      [nextBio, nextProfilePic, userId]
    );

    res.json({ message: "Profile updated", user: result.rows[0] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        message: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend .env",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "socialfeed/profile_pictures",
          resource_type: "image",
          transformation: [
            {
              width: 1200,
              height: 1200,
              crop: "limit",
            },
          ],
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const result = await pool.query(
      `
      UPDATE users
      SET profile_pic = $1
      WHERE id = $2
      RETURNING id, username, email, bio, profile_pic, created_at
      `,
      [uploadResult.secure_url, userId]
    );

    return res.json({
      message: "Profile image uploaded",
      url: uploadResult.secure_url,
      user: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Image upload failed" });
  }
};

module.exports = {
  getUserProfile,
  getUserPosts,
  updateProfile,
  uploadProfilePicture,
};
