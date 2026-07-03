import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const description =
  "Practice debugging real production-style codebases. Reproduce the failure, find the broken line, ship the fix.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Debugging Arena",
    template: "%s · Debugging Arena",
  },
  description,
  applicationName: "Debugging Arena",
  openGraph: {
    type: "website",
    siteName: "Debugging Arena",
    title: "Debugging Arena",
    description,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Debugging Arena",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
