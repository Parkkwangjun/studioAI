import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { LibraryPanel } from "@/components/layout/LibraryPanel";
import GlobalDragHandler from "@/components/layout/GlobalDragHandler";

export const metadata: Metadata = {
  title: "AI Studio",
  description: "AI-powered content creation studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-(--bg-dark) text-white h-screen overflow-hidden flex">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative py-6">
          <GlobalDragHandler />
          {children}
        </main>
        <LibraryPanel />
      </body>
    </html>
  );
}
