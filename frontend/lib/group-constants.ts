export const GROUP_COLORS = [
  { name: "Red", value: "#EF4444", light: "#FEE2E2" },
  { name: "Orange", value: "#F97316", light: "#FFEDD5" },
  { name: "Amber", value: "#F59E0B", light: "#FEF3C7" },
  { name: "Yellow", value: "#EAB308", light: "#FEF9C3" },
  { name: "Lime", value: "#84CC16", light: "#ECFCCB" },
  { name: "Green", value: "#10B981", light: "#D1FAE5" },
  { name: "Teal", value: "#14B8A6", light: "#CCFBF1" },
  { name: "Cyan", value: "#06B6D4", light: "#CFFAFE" },
  { name: "Blue", value: "#3B82F6", light: "#DBEAFE" },
  { name: "Indigo", value: "#6366F1", light: "#E0E7FF" },
  { name: "Purple", value: "#8B5CF6", light: "#EDE9FE" },
  { name: "Pink", value: "#EC4899", light: "#FCE7F3" },
] as const;

export const DEFAULT_GROUP_COLOR = GROUP_COLORS[8]; // Blue

export type GroupColor = typeof GROUP_COLORS[number];