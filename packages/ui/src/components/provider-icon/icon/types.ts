export const iconNames = ["openai", "anthropic", "google", "opencode", "synthetic"] as const

export type IconName = (typeof iconNames)[number]
