import type { ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";

/** Shared banner: its logo placement is independent of the page's content width. */
const AppHeader = ({ children }: { children?: ReactNode }) => (
  <header className="sticky top-0 z-50 flex h-20 shrink-0 items-center justify-between gap-3 border-b border-border/20 bg-card/90 pl-3 pr-4 backdrop-blur-sm">
    <BrandLogo className="shrink-0" />
    <div className="flex min-w-0 items-center justify-end gap-2">{children}</div>
  </header>
);

export default AppHeader;