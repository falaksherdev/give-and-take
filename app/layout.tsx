import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Give and Take",
  description: "A simple record of gifts and money you give and receive.",
};

export const viewport: Viewport = {
  themeColor: "#1b2b49",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
