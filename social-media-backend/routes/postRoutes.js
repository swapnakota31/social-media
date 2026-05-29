const express = require("express");

const router = express.Router();

const {

    createPost,
    getPosts,
    likePost


} = require("../controllers/postController");
const requireAuth = require("../middleware/authMiddleware");

router.post("/", requireAuth, createPost);
router.get("/", requireAuth, getPosts);
router.post("/:postId/like", requireAuth, likePost);
router.put("/like/:postId", requireAuth, likePost);
    
module.exports = router;