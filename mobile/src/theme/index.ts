import { colors as tokens } from "./tokens";

export { fonts, type, space, layout, radius, shadow, motion } from "./tokens";
export const colors = {
  ...tokens,
  paper: tokens.canvas,
  white: tokens.canvas,
  muted: tokens.textSecondary,
  accent: tokens.primary,
  line: tokens.border,
  alpine: tokens.accentFillStrong,
};
