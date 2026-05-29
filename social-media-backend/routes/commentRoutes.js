const express = require("express");

const router = express.Router();

const {

    createComment,
    getComments

} = require("../controllers/commentController");
const requireAuth = require("../middleware/authMiddleware");

router.post("/", requireAuth, createComment);

router.get("/:postId", requireAuth, getComments);

module.exports = router;