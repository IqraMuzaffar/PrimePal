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

// Soft pastel backgrounds cycle across cards to make the grid colorful
const CARD_COLORS = [
  "bg-pink-100   border-pink-300   hover:bg-pink-200",
  "bg-sky-100    border-sky-300    hover:bg-sky-200",
  "bg-violet-100 border-violet-300 hover:bg-violet-200",
  "bg-amber-100  border-amber-300  hover:bg-amber-200",
  "bg-emerald-100 border-emerald-300 hover:bg-emerald-200",
  "bg-orange-100 border-orange-300 hover:bg-orange-200",
];

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

      const avatar = avatars.find((a) => a.id === studentId)!;
      localStorage.setItem("primepal_student_token", data.access_token);
      localStorage.setItem("primepal_student_name", avatar.student_name);
      localStorage.setItem("primepal_student_avatar", avatar.avatar_url);
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setLoadingId(null);
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-5xl mb-3">👋</p>
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
          Who are you?
        </h2>
        <p className="text-gray-500 mt-2 text-base font-medium">
          Tap your picture to start!
        </p>
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-2 gap-4">
        {avatars.map((avatar, i) => {
          const colorClasses = CARD_COLORS[i % CARD_COLORS.length];
          const isLoading = loadingId === avatar.id;

          return (
            <button
              key={avatar.id}
              onClick={() => handleAvatarTap(avatar.id)}
              disabled={!!loadingId}
              className={`
                flex flex-col items-center py-5 px-3
                rounded-3xl border-4 shadow-md
                transition-all duration-150
                hover:scale-105 hover:shadow-xl
                active:scale-95
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-4 focus:ring-yellow-300
                ${colorClasses}
              `}
              aria-label={`Login as ${avatar.student_name}`}
            >
              {isLoading ? (
                <div className="w-24 h-24 flex items-center justify-center">
                  <Loader2 size={40} className="animate-spin text-yellow-500" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar.avatar_url}
                  alt={avatar.student_name}
                  className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-sm object-cover"
                />
              )}
              <span className="mt-3 text-sm font-bold text-gray-700 text-center leading-tight">
                {avatar.student_name}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-5 text-center text-sm font-medium text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
          😬 {error}
        </p>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="mt-8 w-full text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Wrong class? Go back
      </button>
    </div>
  );
}
