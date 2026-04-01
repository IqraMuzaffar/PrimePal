"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface Props {
  classCode: string;
  avatars: Avatar[];
  onBack: () => void;
}

export default function AvatarSelect({ classCode, avatars, onBack }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAvatarTap(studentId: string) {
    setError(null);
    setLoadingId(studentId);

    try {
      const data = await apiFetch<TokenResponse>("/auth/student/login", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, class_code: classCode }),
      });

      // Persist JWT for the student session
      localStorage.setItem("primepal_student_token", data.access_token);
      router.push("/missions");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setLoadingId(null);
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-4xl mb-2">👋</p>
        <h2 className="text-2xl font-bold text-gray-800">Who are you?</h2>
        <p className="text-gray-500 mt-1 text-sm">Tap your picture!</p>
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {avatars.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => handleAvatarTap(avatar.id)}
            disabled={!!loadingId}
            className="flex flex-col items-center p-4 bg-white rounded-2xl shadow border-2 border-transparent
                       hover:border-yellow-400 hover:shadow-md active:scale-95 transition-all
                       disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-yellow-300"
            aria-label={`Login as ${avatar.student_name}`}
          >
            {loadingId === avatar.id ? (
              <div className="w-20 h-20 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-yellow-500" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar.avatar_url}
                alt={avatar.student_name}
                className="w-20 h-20 rounded-full object-cover border-4 border-yellow-200"
              />
            )}
            <span className="mt-3 text-sm font-semibold text-gray-700 text-center leading-tight">
              {avatar.student_name}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="mt-8 w-full text-sm text-gray-500 hover:text-gray-700 underline"
      >
        ← Wrong class? Go back
      </button>
    </div>
  );
}
