import { ColorTheme, DEFAULT_COLOR_THEMES, pickRandom } from "./GameTypes";

export class GameThemeManager {
  private themes: readonly ColorTheme[];
  private current: ColorTheme;

  constructor(themes?: readonly ColorTheme[]) {
    this.themes = themes ?? DEFAULT_COLOR_THEMES;
    this.current = pickRandom(this.themes);
  }

  getCurrent(): ColorTheme {
    return this.current;
  }

  rotate(): ColorTheme {
    this.current = pickRandom(this.themes);
    return this.current;
  }

  getCardStyle(): Record<string, string> {
    return {
      "--ttp-text-color": this.current.text,
      "--ttp-glow-color": this.current.glow,
    };
  }

  getBgClass(isDark: boolean): string {
    return `ttp-bg ${isDark ? "ttp-dark" : "ttp-light"}`;
  }
}
