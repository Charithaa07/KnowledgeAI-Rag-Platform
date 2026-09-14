// Shared formatting helpers + UI constants (avoids magic numbers & inline prop objects).
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;

export function formatBytes(bytes = 0) {
  if (bytes < BYTES_PER_KB) return `${bytes} B`;
  if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

// Stable reference reused across renders for Recharts <Tooltip contentStyle>.
export const CHART_TOOLTIP_STYLE = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: 8,
  fontSize: 12,
};

const DOC_STATUS_COLORS = {
  ready: "text-emerald-400",
  failed: "text-red-400",
};

export function docStatusColor(status) {
  return DOC_STATUS_COLORS[status] || "text-amber-400";
}
