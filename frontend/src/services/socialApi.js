import { authFormRequest, authRequest, publicRequest } from "./api";

const POST_MEDIA_CACHE_KEY = "socialfeed:post-media-cache";
const SHARED_POSTS_CACHE_KEY = "socialfeed:shared-posts";

const readJsonStorage = (key, fallback) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeJsonStorage = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const cachePostMedia = (postId, mediaItems) => {
  if (!postId) {
    return [];
  }

  const mediaCache = readJsonStorage(POST_MEDIA_CACHE_KEY, {});
  mediaCache[String(postId)] = Array.isArray(mediaItems) ? mediaItems : [];
  writeJsonStorage(POST_MEDIA_CACHE_KEY, mediaCache);
  return mediaCache[String(postId)];
};

export const getCachedPostMedia = (postId) => {
  if (!postId) {
    return [];
  }

  const mediaCache = readJsonStorage(POST_MEDIA_CACHE_KEY, {});
  return mediaCache[String(postId)] || [];
};

export const hydratePostWithCachedMedia = (post) => {
  if (!post) {
    return post;
  }

  const media = Array.isArray(post.media) && post.media.length > 0 ? post.media : getCachedPostMedia(post.id);
  return {
    ...post,
    media,
  };
};

export const mergePostState = (currentPost, nextPost) => {
  if (!currentPost) {
    return hydratePostWithCachedMedia(nextPost);
  }

  const merged = {
    ...currentPost,
    ...(nextPost || {}),
    media: Array.isArray(nextPost?.media) && nextPost.media.length > 0 ? nextPost.media : currentPost.media,
  };

  return hydratePostWithCachedMedia(merged);
};

export const isPostShared = (postId) => {
  if (!postId) {
    return false;
  }

  const sharedPosts = readJsonStorage(SHARED_POSTS_CACHE_KEY, {});
  return Boolean(sharedPosts[String(postId)]);
};

export const markPostShared = (postId, shareDetails = {}) => {
  if (!postId) {
    return null;
  }

  const sharedPosts = readJsonStorage(SHARED_POSTS_CACHE_KEY, {});
  sharedPosts[String(postId)] = {
    sharedAt: new Date().toISOString(),
    ...shareDetails,
  };
  writeJsonStorage(SHARED_POSTS_CACHE_KEY, sharedPosts);
  return sharedPosts[String(postId)];
};

export const getSharedPostInfo = (postId) => {
  if (!postId) {
    return null;
  }

  const sharedPosts = readJsonStorage(SHARED_POSTS_CACHE_KEY, {});
  return sharedPosts[String(postId)] || null;
};

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

export const updatePost = (postId, payload) => authRequest(`/posts/${postId}`, {
  method: "PUT",
  body: JSON.stringify(payload),
});

export const deletePost = (postId) => authRequest(`/posts/${postId}`, {
  method: "DELETE",
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