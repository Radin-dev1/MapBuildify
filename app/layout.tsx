import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "MapBuildify",
  description:
    "A reference library of Roblox map images and 3D models that the mapbuildify Claude skill studies before it builds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <Logo />
            <span>MapBuildify</span>
          </Link>
          <nav>
            <Link href="/">Library</Link>
            <Link href="/upload">Upload</Link>
            <Link href="/skill">Claude skill</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>MapBuildify</span>
          <a href="/api/examples">Catalog JSON</a>
          <a href="https://github.com/Radin-dev1/MapBuildify">GitHub</a>
        </footer>
      </body>
    </html>
  );
}
