const pool = require("../db");
const cloudinary = require("../config/cloudinary");

const hasTable = async (tableName) => {
  const result = await pool.query(
    `
    SELECT to_regclass($1) IS NOT NULL AS exists
    `,
    [tableName]
  );

  return Boolean(result.rows[0]?.exists);
};

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.user.id;

    const followsEnabled = await hasTable("public.follows");

    const followsSelect = followsEnabled
      ? `
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
      `
      : `
        0::int AS followers_count,
        0::int AS following_count,
        FALSE AS is_following,
        FALSE AS follows_you
      `;

    const followsJoin = followsEnabled
      ? `
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
      `
      : "";

    const userResult = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.bio,
        u.profile_pic,
        u.created_at,
        COALESCE(post_stats.total_posts, 0)::int AS total_posts,
        COALESCE(post_stats.total_likes, 0)::int AS total_likes,
        ${followsSelect}
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS total_posts, COALESCE(SUM(likes), 0)::int AS total_likes
        FROM posts
        GROUP BY user_id
      ) post_stats ON post_stats.user_id = u.id
      ${followsJoin}
      WHERE u.id = $1
      `,
      [id, viewerId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.user.id;

    const postLikesEnabled = await hasTable("public.post_likes");
    const postMediaEnabled = await hasTable("public.post_media");

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
        EXISTS (
          SELECT 1
          FROM post_likes pl2
          WHERE pl2.post_id = p.id
          AND pl2.user_id = $2
        ) AS is_liked_by_me
      `
      : `
        '[]'::json AS liked_by,
        FALSE AS is_liked_by_me
      `;

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
        ) AS media
      `
      : `'[]'::json AS media`;

    const postsResult = await pool.query(
      `
      SELECT
        p.id,
        p.content,
        p.created_at,
        p.likes,
        p.user_id,
        ${likedBySelect},
        ${mediaSelect},
        COALESCE(comment_stats.comments_count, 0)::int AS comments_count
      FROM posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*)::int AS comments_count
        FROM comments
        GROUP BY post_id
      ) comment_stats ON comment_stats.post_id = p.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      `,
      [id, viewerId]
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
