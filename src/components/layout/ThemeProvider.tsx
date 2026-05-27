"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const NextThemesProvider = dynamic(
  () => import("next-themes").then((m) => m.ThemeProvider),
  { ssr: false }
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
