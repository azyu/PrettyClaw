import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrettyClaw",
  description: "Visual Novel Agent UI for OpenClaw",
};

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
