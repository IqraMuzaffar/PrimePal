"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style: string;
  theme_color: string;
}

interface Props {
  avatars: Avatar[];
  onBack: () => void;
  onAvatarSelect: (avatar: Avatar) => void;
}

export default function AvatarSelect({ avatars, onBack, onAvatarSelect }: Props) {
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
        {avatars.map((avatar) => (
          <motion.button
            key={avatar.id}
            onClick={() => onAvatarSelect(avatar)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="relative flex flex-col items-center pt-4 pb-4 px-3
                       bg-white rounded-2xl ring-1 ring-slate-200 shadow-md
                       hover:shadow-xl focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-indigo-500
                       overflow-hidden transition-shadow duration-150"
            aria-label={`Select ${avatar.student_name}`}
          >
            {/* Theme color top strip */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: avatar.theme_color }}
            />

            <div
              className="w-20 h-20 rounded-full ring-4 ring-violet-400 ring-offset-2 overflow-hidden bg-slate-50"
            >
              <Image
                src={avatar.avatar_url}
                alt={avatar.student_name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>

            <span className="mt-3 text-sm font-bold text-slate-700 text-center leading-tight">
              {avatar.student_name}
            </span>
          </motion.button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-6 w-full text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
      >
        ← Wrong class? Go back
      </button>
    </div>
  );
}
