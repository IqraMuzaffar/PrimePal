"use client";

import { motion } from "framer-motion";

interface Tab {
  id: "overview" | "byGrade" | "byClass" | "byStudent";
  label: string;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "byGrade", label: "By Grade" },
  { id: "byClass", label: "By Class" },
  { id: "byStudent", label: "By Student" },
];

interface Props {
  activeTab: Tab["id"];
  onTabChange: (tabId: Tab["id"]) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: Props) {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex relative">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Animated underline */}
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 h-0.5 bg-indigo-600"
            initial={false}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{
              left: `${TABS.findIndex((tab) => tab.id === activeTab) * 25}%`,
              width: "25%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
