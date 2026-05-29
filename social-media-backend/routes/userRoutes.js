const express = require("express");
const router = express.Router();

const {
	getUserProfile,
	getUserPosts,
	updateProfile,
	uploadProfilePicture,
} = require("../controllers/userController");
const requireAuth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.put("/update", requireAuth, updateProfile);
router.post("/upload-profile-pic", requireAuth, upload.single("image"), uploadProfilePicture);
router.get("/:id/posts", getUserPosts);
router.get("/:id", getUserProfile);

module.exports = router;
