// src/utils/api.ts

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  // 1. Grab the active user ID from storage
  let activeUserId = localStorage.getItem("id");
  
  if (!activeUserId) {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try { activeUserId = JSON.parse(storedUser).id; } catch (err) {}
    }
  }

  // 2. Setup the headers, automatically injecting the user ID
  const headers = {
    "Content-Type": "application/json",
    ...(activeUserId && { "X-User-Id": activeUserId }),
    ...options.headers,
  };

  // 3. Make the fetch call to your backend
  const response = await fetch(`http://localhost:8000${endpoint}`, {
    ...options,
    headers,
  });

  return response;
};