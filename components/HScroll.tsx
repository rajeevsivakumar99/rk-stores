import type { ReactNode } from "react";

/** Phones: swipeable row with snap. md and up: normal grid. */
export function HScroll({ children, cols = "md:grid-cols-3 lg:grid-cols-4" }: { children: ReactNode; cols?: string }) {
  return (
    <div className={`no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0 ${cols}`}>{children}</div>
  );
}
export const HItem = ({ children, wide = false }: { children: ReactNode; wide?: boolean }) => (
  <div className={`shrink-0 snap-start md:w-auto md:max-w-none ${wide ? "w-[82vw] max-w-[340px]" : "w-[46vw] max-w-[240px]"}`}>{children}</div>
);
