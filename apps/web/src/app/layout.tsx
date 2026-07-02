import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";

export const metadata: Metadata = {
  title: "TradePilot AI",
  description: "Внутренний инструмент команды для торговли без собственного склада",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
