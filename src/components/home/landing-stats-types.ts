/** Serializable icon keys for landing stats (safe for Server → Client props). */
export type LandingStatIconKey = "users" | "fileQuestion" | "target" | "graduationCap";

export type LandingStatItemDTO = {
  label: string;
  value: string;
  hint?: string;
  icon?: LandingStatIconKey;
};
