import { authFormRequest, authRequest, publicRequest } from "./api";

export const login = (payload) => publicRequest("/auth/login", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const signup = (payload) => publicRequest("/auth/signup", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const fetchFeed = ({ cursor, limit = 20 } = {}) => {
  const query = new URLSearchParams();

  query.set("limit", String(limit));

  if (cursor) {
    query.set("cursor", cursor);
  }

  return authRequest(`/posts/feed?${query.toString()}`);
};

export const createPost = (payload) => authRequest("/posts", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const uploadPostMedia = (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  return authFormRequest("/posts/upload-media", formData);
};

export const toggleLike = (postId) => authRequest(`/posts/${postId}/like`, {
  method: "POST",
});

export const fetchComments = (postId) => authRequest(`/comments/${postId}`);

export const createComment = (payload) => authRequest("/comments", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const fetchProfile = (userId) => authRequest(`/users/${userId}`);

export const fetchUserPosts = (userId) => authRequest(`/users/${userId}/posts`);

export const updateProfile = (payload) => authRequest("/users/update", {
  method: "PUT",
  body: JSON.stringify(payload),
});

export const uploadProfilePicture = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return authFormRequest("/users/upload-profile-pic", formData);
};

export const searchUsers = (query) => authRequest(`/social/search?q=${encodeURIComponent(query)}`);

export const followUser = (userId) => authRequest(`/social/users/${userId}/follow`, {
  method: "POST",
});

export const unfollowUser = (userId) => authRequest(`/social/users/${userId}/follow`, {
  method: "DELETE",
});

export const fetchFollowers = (userId) => authRequest(`/social/users/${userId}/followers`);

export const fetchFollowing = (userId) => authRequest(`/social/users/${userId}/following`);

export const fetchNotifications = () => authRequest("/social/notifications");