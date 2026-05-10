"use client";

import { createContext, useContext, useMemo } from "react";
import { guessGender, getThemeTokens, type ThemeTokens } from "./gender-theme";

const GenderThemeContext = createContext<ThemeTokens | null>(null);

/**
 * Provides gender-based theme tokens to all student pages.
 * Wrap around the student layout content (after profile is loaded).
 */
export function GenderThemeProvider({
  studentName,
  children,
}: {
  studentName: string | null;
  children: React.ReactNode;
}) {
  const tokens = useMemo(() => {
    const gender = studentName ? guessGender(studentName) : "neutral";
    return getThemeTokens(gender);
  }, [studentName]);

  return (
    <GenderThemeContext.Provider value={tokens}>
      {children}
    </GenderThemeContext.Provider>
  );
}

/**
 * Hook to access the current student's gender-based theme tokens.
 * Falls back to neutral if outside provider.
 */
export function useGenderTheme(): ThemeTokens {
  const ctx = useContext(GenderThemeContext);
  if (!ctx) return getThemeTokens("neutral");
  return ctx;
}
