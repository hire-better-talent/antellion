/**
 * Antellion brand design tokens.
 *
 * These are the ONLY colors that may be used in report components and other
 * brand-forward surfaces. Do not introduce additional colors without updating
 * this file.
 */
export const BRAND_TOKENS = {
  // Dark surfaces (cover page, navigation)
  bgBase: "#0B0F14",
  bgSurface: "#2A3441",

  // Accent colors (CTAs, section dividers, highlights)
  accentPrimary: "#2563EB",
  accentHover: "#3B82F6",

  // Text on dark backgrounds
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",

  // Report page surfaces (white background)
  reportBg: "#FFFFFF",
  reportText: "#0B0F14",
  reportSurface: "#F9FAFB",
  reportBorder: "#E5E7EB",
} as const;

export type BrandToken = keyof typeof BRAND_TOKENS;
