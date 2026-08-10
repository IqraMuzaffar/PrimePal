const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") { localStorage.removeItem("token"); window.location.href = "/login"; }
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function login(username: string, password: string) {
  const data = await apiFetch("/auth/login", {
    method: "POST", body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("token", data.token);
  return data;
}
