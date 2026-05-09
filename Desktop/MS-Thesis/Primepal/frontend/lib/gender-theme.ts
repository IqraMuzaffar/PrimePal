/**
 * Gender-based theme inference from Pakistani first names.
 * Purely cosmetic — no gender data is stored or sent to any API.
 */

export type GenderTheme = "girl" | "boy" | "neutral";

const GIRL_NAMES = new Set([
  "fatima", "aisha", "ayesha", "sara", "sarah", "horain", "maryam", "zara",
  "hira", "sana", "mahnoor", "laiba", "nimra", "iqra", "amna", "rabia",
  "nida", "sadia", "bushra", "mehak", "komal", "kinza", "alina", "anaya",
  "minahil", "dua", "hafsa", "sidra", "samia", "noor", "arooj", "kiran",
  "saima", "shabnam", "tahira", "uzma", "yasmin", "zubaida", "naila",
  "fouzia", "nasreen", "parveen", "rubina", "rukhsana", "shaista",
  "zainab", "aleeza", "eman", "emaan", "inaya", "jannat", "kashaf",
  "mahira", "nawal", "rida", "rimsha", "saman", "tuba", "urooj",
  "wardah", "zoya", "aimen", "areeba", "fariha", "huriya", "javeria",
  "kanwal", "lubna", "momina", "nayab", "raheela", "saba", "tayyaba",
  "umme", "zobia", "asma", "humaira", "irum", "maria", "neha", "roshni",
  "sunaina", "tanzeela", "wajeeha", "zahra", "areesha", "hania", "hooriya",
]);

const BOY_NAMES = new Set([
  "ahmed", "ahmad", "hassan", "ali", "saad", "hamza", "usman", "bilal",
  "rizwan", "farhan", "asad", "imran", "zain", "shahid", "waqas", "faisal",
  "adeel", "arsalan", "kamran", "nabeel", "junaid", "omar", "aamir",
  "rehan", "mohsin", "danish", "fahad", "tariq", "sajid", "nadeem",
  "zahid", "waseem", "arif", "salman", "shoaib", "tahir", "yasir",
  "zubair", "khalid", "mudassar", "naeem", "rashid", "shafiq", "tanveer",
  "umer", "amir", "babar", "daniyal", "ehsan", "ghulam", "haroon",
  "irfan", "javed", "kashif", "liaqat", "majid", "naveed", "owais",
  "qasim", "raza", "sohail", "usama", "waqar", "yousuf", "zeeshan",
  "abdullah", "abrar", "afzal", "anas", "atif", "azhar", "basit",
  "faheem", "haider", "hamid", "hammad", "ibraheem", "ibrahim", "iftikhar",
  "ismail", "jawad", "khawar", "maqsood", "moiz", "muneeb", "mustafa",
  "noman", "rafay", "saif", "sameer", "shahbaz", "sufyan", "talha",
  "taimoor", "umair", "wahab", "waleed", "zafar", "zaid",
]);

export function guessGender(fullName: string): GenderTheme {
  const first = fullName.trim().split(/\s+/)[0].toLowerCase();
  if (GIRL_NAMES.has(first)) return "girl";
  if (BOY_NAMES.has(first)) return "boy";
  return "neutral";
}

/* ── Theme tokens (Tailwind class fragments) ─────────────────── */

export interface ThemeTokens {
  gender: GenderTheme;
  // Hero
  heroBg: string;
  heroGlow1: string; // radial-gradient CSS for top-right blob
  heroGlow2: string; // radial-gradient CSS for bottom-left blob
  heroLabel: string;
  heroNameAccent: string;
  // Nav
  navPillActive: string;
  navPillText: string;
  navIconBounce: string;
  // Cards & accents
  pointsChip: string;
  streakChip: string;
  // Mascot
  mascotEmoji: string;
  // Student row (play page)
  rowBg: string;
  rowBgHover: string;
  rowBorder: string;
  rowBorderHover: string;
  rowAvatar: string;
  rowAvatarBorder: string;
  rowName: string;
  rowArrow: string;
  rowArrowHover: string;
  rowShadowHover: string;
  avatarEmoji: string;
  // PIN
  pinAvatarBg: string;
  pinAvatarBorder: string;
  pinFilledBg: string;
  pinFilledBorder: string;
  pinFilledText: string;
}

const GIRL_TOKENS: ThemeTokens = {
  gender: "girl",
  heroBg: "bg-gradient-to-br from-pink-100 via-fuchsia-100 to-pink-50",
  heroGlow1: "radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(236,72,153,0) 70%)",
  heroGlow2: "radial-gradient(circle, rgba(244,114,182,0.25) 0%, rgba(244,114,182,0) 70%)",
  heroLabel: "text-pink-800/70",
  heroNameAccent: "text-pink-950",
  navPillActive: "bg-gradient-to-br from-pink-200 to-pink-300",
  navPillText: "text-pink-900",
  navIconBounce: "animate-bounceSoft",
  pointsChip: "from-pink-200 to-pink-300",
  streakChip: "from-rose-200 to-rose-300",
  mascotEmoji: "🦄",
  rowBg: "bg-gradient-to-br from-pink-50/60 to-white/80",
  rowBgHover: "hover:bg-gradient-to-br hover:from-pink-100 hover:to-pink-50",
  rowBorder: "border-pink-200",
  rowBorderHover: "hover:border-pink-400",
  rowAvatar: "bg-gradient-to-br from-pink-200 to-pink-300",
  rowAvatarBorder: "border-pink-300",
  rowName: "text-pink-950",
  rowArrow: "text-pink-300",
  rowArrowHover: "group-hover:text-pink-500",
  rowShadowHover: "hover:shadow-[0_8px_24px_rgba(236,72,153,0.15)]",
  avatarEmoji: "👧",
  pinAvatarBg: "bg-gradient-to-br from-pink-200 to-fuchsia-200",
  pinAvatarBorder: "border-pink-300",
  pinFilledBg: "bg-pink-50",
  pinFilledBorder: "border-pink-400",
  pinFilledText: "text-pink-700",
};

const BOY_TOKENS: ThemeTokens = {
  gender: "boy",
  heroBg: "bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-50",
  heroGlow1: "radial-gradient(circle, rgba(14,165,233,0.35) 0%, rgba(14,165,233,0) 70%)",
  heroGlow2: "radial-gradient(circle, rgba(96,165,250,0.25) 0%, rgba(96,165,250,0) 70%)",
  heroLabel: "text-sky-800/70",
  heroNameAccent: "text-sky-950",
  navPillActive: "bg-gradient-to-br from-sky-200 to-blue-200",
  navPillText: "text-sky-900",
  navIconBounce: "animate-bounceSoft",
  pointsChip: "from-sky-200 to-sky-300",
  streakChip: "from-blue-200 to-blue-300",
  mascotEmoji: "🚀",
  rowBg: "bg-gradient-to-br from-sky-50/60 to-white/80",
  rowBgHover: "hover:bg-gradient-to-br hover:from-sky-100 hover:to-sky-50",
  rowBorder: "border-sky-200",
  rowBorderHover: "hover:border-sky-400",
  rowAvatar: "bg-gradient-to-br from-sky-200 to-sky-300",
  rowAvatarBorder: "border-sky-300",
  rowName: "text-sky-950",
  rowArrow: "text-sky-300",
  rowArrowHover: "group-hover:text-sky-500",
  rowShadowHover: "hover:shadow-[0_8px_24px_rgba(14,165,233,0.15)]",
  avatarEmoji: "👦",
  pinAvatarBg: "bg-gradient-to-br from-sky-200 to-blue-200",
  pinAvatarBorder: "border-sky-300",
  pinFilledBg: "bg-sky-50",
  pinFilledBorder: "border-sky-400",
  pinFilledText: "text-sky-700",
};

const NEUTRAL_TOKENS: ThemeTokens = {
  gender: "neutral",
  heroBg: "bg-student-hero",
  heroGlow1: "radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(251,191,36,0) 70%)",
  heroGlow2: "radial-gradient(circle, rgba(167,139,250,1) 0%, rgba(167,139,250,0) 70%)",
  heroLabel: "text-pink-900/70",
  heroNameAccent: "text-slate-900",
  navPillActive: "bg-pill-active",
  navPillText: "text-pink-900",
  navIconBounce: "animate-bounceSoft",
  pointsChip: "from-amber-200 to-amber-300",
  streakChip: "from-orange-200 to-orange-300",
  mascotEmoji: "🦄",
  rowBg: "bg-gradient-to-br from-violet-50/60 to-white/80",
  rowBgHover: "hover:bg-gradient-to-br hover:from-violet-100 hover:to-violet-50",
  rowBorder: "border-violet-200",
  rowBorderHover: "hover:border-violet-400",
  rowAvatar: "bg-gradient-to-br from-violet-200 to-violet-300",
  rowAvatarBorder: "border-violet-300",
  rowName: "text-slate-900",
  rowArrow: "text-violet-300",
  rowArrowHover: "group-hover:text-violet-500",
  rowShadowHover: "hover:shadow-[0_8px_24px_rgba(167,139,250,0.15)]",
  avatarEmoji: "⭐",
  pinAvatarBg: "bg-gradient-to-br from-violet-200 to-fuchsia-200",
  pinAvatarBorder: "border-violet-300",
  pinFilledBg: "bg-violet-50",
  pinFilledBorder: "border-violet-400",
  pinFilledText: "text-violet-700",
};

export function getThemeTokens(gender: GenderTheme): ThemeTokens {
  switch (gender) {
    case "girl": return GIRL_TOKENS;
    case "boy": return BOY_TOKENS;
    default: return NEUTRAL_TOKENS;
  }
}

/** Convenience: infer + return tokens in one call */
export function getThemeForName(fullName: string): ThemeTokens {
  return getThemeTokens(guessGender(fullName));
}

/** For the play page student list: assigns rotating colors per index for a mixed list */
const AVATAR_COLORS = [
  { bg: "bg-gradient-to-br from-violet-200 to-violet-300", border: "border-violet-300", text: "text-violet-800" },
  { bg: "bg-gradient-to-br from-pink-200 to-pink-300", border: "border-pink-300", text: "text-pink-800" },
  { bg: "bg-gradient-to-br from-sky-200 to-sky-300", border: "border-sky-300", text: "text-sky-800" },
  { bg: "bg-gradient-to-br from-amber-200 to-amber-300", border: "border-amber-300", text: "text-amber-800" },
  { bg: "bg-gradient-to-br from-emerald-200 to-emerald-300", border: "border-emerald-300", text: "text-emerald-800" },
];

export function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
