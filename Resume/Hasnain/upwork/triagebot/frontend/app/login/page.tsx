"use client";
import { useState } from "react";
import { login } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      router.push("/");
    } catch { setError("Invalid credentials"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">TriageBot</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <input value={username} onChange={e => setUsername(e.target.value)}
          placeholder="Username" className="w-full p-3 border rounded mb-3" />
        <input value={password} onChange={e => setPassword(e.target.value)}
          type="password" placeholder="Password" className="w-full p-3 border rounded mb-4" />
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700">
          Login
        </button>
      </form>
    </div>
  );
}
