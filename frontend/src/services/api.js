const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const getToken = () => localStorage.getItem("token");

const readResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload && typeof payload === "object"
      ? payload.message || payload.error || "Request failed"
      : payload || "Request failed";

    throw new Error(message);
  }

  return payload;
};

const publicRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  return readResponse(response);
};

const authRequest = async (path, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": options.body instanceof FormData ? undefined : "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  return readResponse(response);
};

const authFormRequest = async (path, formData, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: options.method || "POST",
    body: formData,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.headers || {}),
    },
  });

  return readResponse(response);
};

export {
  API_BASE_URL,
  authFormRequest,
  authRequest,
  getToken,
  publicRequest,
};