import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/AppState";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "高タンパク献立",
  description: "旬の野菜と高タンパクを重視した夕食の献立を自動提案します",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f7d4f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          <main className="container">{children}</main>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
