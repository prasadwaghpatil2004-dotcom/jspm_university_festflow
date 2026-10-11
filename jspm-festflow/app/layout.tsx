import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "festflow · JSPM Campus Event & Fest Hub",
  description:
    "Discover fests, hackathons, workshops and sports at JSPM University, Pune.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
