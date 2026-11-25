import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Headings: var(--font-syne). The variable keeps its old name so nothing that uses it has to change.
const syne = Bricolage_Grotesque({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.shiftup.club"),
  alternates: { canonical: "./" },
  title: { default: "SHIFTUP: From Grassroots to Greatness", template: "%s | SHIFTUP" },
  description: "SHIFTUP: From Grassroots to Greatness. Four pillars to help every grassroots cricketer get better: Player Analysis, Community, Wellness and Academy, for players and their clubs.",
  openGraph: { siteName: "SHIFTUP", title: "SHIFTUP: From Grassroots to Greatness", description: "From Grassroots to Greatness." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
