const express = require("express");

const router = express.Router();

const {

    createPost,
    getPosts,
    likePost,
    updatePost,
    deletePost,
    uploadPostMedia


} = require("../controllers/postController");
const requireAuth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/", requireAuth, createPost);
router.get("/", requireAuth, getPosts);
router.get("/feed", requireAuth, getPosts);
router.post("/upload-media", requireAuth, upload.array("images", 10), uploadPostMedia);
router.post("/:postId/like", requireAuth, likePost);
router.put("/like/:postId", requireAuth, likePost);
router.put("/:postId", requireAuth, updatePost);
router.delete("/:postId", requireAuth, deletePost);
    
module.exports = router;