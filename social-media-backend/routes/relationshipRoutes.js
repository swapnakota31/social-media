const express = require("express");

const router = express.Router();

const requireAuth = require("../middleware/authMiddleware");

const {
    searchUsers,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getNotifications,
} = require("../controllers/relationshipController");

router.get("/search", requireAuth, searchUsers);
router.get("/notifications", requireAuth, getNotifications);
router.get("/users/:id/followers", requireAuth, getFollowers);
router.get("/users/:id/following", requireAuth, getFollowing);
router.post("/users/:id/follow", requireAuth, followUser);
router.delete("/users/:id/follow", requireAuth, unfollowUser);

module.exports = router;