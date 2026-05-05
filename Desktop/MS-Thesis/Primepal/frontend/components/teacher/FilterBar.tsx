"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

interface FilterBarProps {
  /** Show the search input (default true) */
  showSearch?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Show the pillar/skill dropdown (default true) */
  showPillar?: boolean;
  /** Show the section dropdown (default false) */
  showSection?: boolean;
  /** Available sections to display */
  sections?: string[];
  /** Available grade levels (defaults to 1-5) */
  grades?: number[];
}

const PILLARS = [
  { value: "", label: "All Skills" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "listening", label: "Listening" },
  { value: "speaking", label: "Speaking" },
];

const DEFAULT_GRADES = [1, 2, 3, 4, 5];

export default function FilterBar({
  showSearch = true,
  searchPlaceholder = "Search by name or roll number...",
  showPillar = true,
  showSection = false,
  sections = [],
  grades = DEFAULT_GRADES,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const gradeLevel = searchParams.get("grade") || "";
  const pillar = searchParams.get("pillar") || "";
  const section = searchParams.get("section") || "";
  const search = searchParams.get("search") || "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => updateParams({ search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        )}
        <select
          value={gradeLevel}
          onChange={(e) => updateParams({ grade: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={String(g)}>
              Grade {g}
            </option>
          ))}
        </select>
        {showSection && sections.length > 0 && (
          <select
            value={section}
            onChange={(e) => updateParams({ section: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
        )}
        {showPillar && (
          <select
            value={pillar}
            onChange={(e) => updateParams({ pillar: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            {PILLARS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to read current filter values from URL search params.
 * Use this in page components that need the filter values for API calls.
 */
export function useFilterParams() {
  const searchParams = useSearchParams();
  return {
    gradeLevel: searchParams.get("grade") ? Number(searchParams.get("grade")) : undefined,
    pillar: searchParams.get("pillar") || undefined,
    section: searchParams.get("section") || undefined,
    search: searchParams.get("search") || undefined,
  };
}
