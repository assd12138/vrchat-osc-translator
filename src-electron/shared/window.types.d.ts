export interface WindowState {
  platform: string;
  maximized: boolean;
}
export type WindowAction = "minimize" | "toggle-maximize" | "close";
