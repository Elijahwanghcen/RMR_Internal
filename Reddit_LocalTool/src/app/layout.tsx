import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { SearchCommand } from "@/components/SearchCommand";
import { FreshnessBanner } from "@/components/FreshnessBanner";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UT Housing Hub",
  description: "Internal UT Austin student housing intelligence",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/compare", label: "Compare" },
  { href: "/map", label: "Map" },
  { href: "/charts", label: "Charts" },
  { href: "/boards", label: "Boards" },
  { href: "/reddit", label: "Reddit" },
  { href: "/admin", label: "Admin" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-6 px-4 py-2.5">
            <Link href="/" className="text-sm font-bold tracking-tight whitespace-nowrap">
              🤘 UT Housing Hub
            </Link>
            <nav className="flex flex-1 items-center gap-4 text-sm text-muted-foreground">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
            <SearchCommand />
          </div>
          <FreshnessBanner />
        </header>
        <main className="flex-1 px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
