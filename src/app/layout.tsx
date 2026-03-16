import type { Metadata, Viewport } from "next";
import { AppIntlProvider } from "@/i18n/client";
import { getRequestLocaleData } from "@/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getRequestLocaleData();

  return {
    title: String(messages.metadata?.title ?? "PrettyClaw"),
    description: String(messages.metadata?.description ?? "Visual Novel Agent UI for OpenClaw"),
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, messages } = await getRequestLocaleData();

  return (
    <html lang={locale}>
      <body>
        <AppIntlProvider initialLocale={locale} initialMessages={messages}>
          {children}
        </AppIntlProvider>
      </body>
    </html>
  );
}
