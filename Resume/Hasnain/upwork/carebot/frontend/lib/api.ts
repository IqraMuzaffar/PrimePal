const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('carebot_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth helpers
export function setToken(token: string) {
  localStorage.setItem('carebot_token', token);
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('carebot_token') : null;
}

export function clearToken() {
  localStorage.removeItem('carebot_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
