export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

// index.css scopes dark tokens under `.dark`, so the class is the switch.
export function applyTheme(theme: Theme) {
  document.documentElement.classList.remove(...THEMES)
  document.documentElement.classList.add(theme)
}
