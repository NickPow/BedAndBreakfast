import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Shylow SKI Bed & Breakfast",
    template: "%s | Shylow SKI Bed & Breakfast",
  },
  description:
    "A refined bed and breakfast experience in Albion, Jamaica with booking requests sent directly to the host.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(16,74,88,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(219,135,82,0.12),_transparent_30%),linear-gradient(180deg,_#f7f4ef_0%,_#eef1ec_48%,_#e4ebe7_100%)] text-slate-950">
        <div className="relative flex min-h-screen flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-55 [background-image:radial-gradient(circle_at_1px_1px,rgba(20,36,45,0.12)_1px,transparent_0)] [background-size:28px_28px]" />
          <div className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(16,74,88,0.14),_transparent_68%)] blur-3xl" />
          <div className="pointer-events-none absolute right-[-5rem] top-[30rem] -z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(219,135,82,0.14),_transparent_70%)] blur-3xl" />
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
