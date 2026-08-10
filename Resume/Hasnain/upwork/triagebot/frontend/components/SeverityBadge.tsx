const colors: Record<string, string> = {
  red: "bg-red-600 text-white",
  yellow: "bg-yellow-500 text-black",
  green: "bg-green-600 text-white",
};
const labels: Record<string, string> = { red: "URGENT", yellow: "SOON", green: "ROUTINE" };

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${colors[severity] || "bg-gray-400 text-white"}`}>
      {labels[severity] || severity.toUpperCase()}
    </span>
  );
}
