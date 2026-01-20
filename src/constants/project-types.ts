export const PROJECT_TYPES = [
  "VISUAL IMAGE",
  "CAROUSEL",
  "VIDEO MOTION",
  "GENERAL",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
