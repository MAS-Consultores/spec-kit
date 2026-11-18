import type { ReactNode } from "react";

export interface NavItem {
  readonly to: string;
  readonly labelKey: string;
}

export interface ShellActions {
  readonly onLogout?: () => void;
}

export interface AppShellProps extends ShellActions {
  readonly items: readonly NavItem[];
  readonly children: ReactNode;
}
