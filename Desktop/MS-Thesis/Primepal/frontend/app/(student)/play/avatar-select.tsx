"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style: string;
  theme_color: string;
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

  async function handleAvatarTap(avatar: Avatar) {
    setError(null);
    setLoadingId(avatar.id);
    try {
      const data = await apiFetch<TokenResponse>("/auth/student/login", {
        method: "POST",
        body: JSON.stringify({ student_id: avatar.id, class_code: classCode }),
      });
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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Choose Your Character
        </h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Tap yourself to enter!
        </p>
      </div>

      {/* Character grid */}
      <div className="grid grid-cols-2 gap-3">
        {avatars.map((avatar) => {
          const isLoading = loadingId === avatar.id;
          return (
            <button
              key={avatar.id}
              onClick={() => handleAvatarTap(avatar)}
              disabled={!!loadingId}
              className="relative flex flex-col items-center pt-4 pb-4 px-3
                         bg-white rounded-2xl ring-1 ring-slate-200 shadow-md
                         hover:shadow-xl hover:scale-[1.04] active:scale-95
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-150 focus:outline-none
                         focus-visible:ring-2 focus-visible:ring-indigo-500
                         overflow-hidden"
              aria-label={`Login as ${avatar.student_name}`}
            >
              {/* Theme color top strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: avatar.theme_color }}
              />

              {isLoading ? (
                <div className="w-20 h-20 flex items-center justify-center">
                  <Loader2 size={36} className="animate-spin text-indigo-500" />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-full ring-4 ring-offset-2 overflow-hidden bg-slate-50"
                  style={{ "--tw-ring-color": avatar.theme_color } as React.CSSProperties}
                >
                  <Image
                    src={avatar.avatar_url}
                    alt={avatar.student_name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <span className="mt-3 text-sm font-bold text-slate-700 text-center leading-tight">
                {avatar.student_name}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm font-medium text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
          😬 {error}
        </p>
      )}

      <button
        onClick={onBack}
        className="mt-6 w-full text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
      >
        ← Wrong class? Go back
      </button>
    </div>
  );
}
