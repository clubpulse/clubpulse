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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://shiftup.club"),
  title: { default: "SHIFTUP: From Grassroots to Greatness", template: "%s | SHIFTUP" },
  description: "SHIFTUP: From Grassroots to Greatness. The platform for grassroots cricket clubs and their players.",
  openGraph: { siteName: "SHIFTUP", title: "SHIFTUP: From Grassroots to Greatness", description: "From Grassroots to Greatness." },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
