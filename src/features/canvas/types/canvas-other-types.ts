import { LucideIcon } from "lucide-react";
import { CanvasRecord, CanvasSummary } from "../lib/canvas-records";

export  type ActionLogItem = {
  id: string;
  message: string;
};

export  type FrameSummary = {
  id: string;
  title: string;
};

export type LeftPanelView =
  | "home"
  | "frames"
  | "changes"
  | "commands"
  | "voice"
  | "theme"
  | "templates";

export type CanvasPageClientProps = {
  initialCanvas?: CanvasRecord | null;
  initialCanvases?: CanvasSummary[];
};

export type DrawerItemMeta = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  variant?: "heading" | "subheading" | "body";
};