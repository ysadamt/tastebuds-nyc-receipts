import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tastebuds nyc receipts",
  description: "receipts from restaurants all over the world, all in nyc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta itemProp="name" content="tastebuds nyc receipts" />
        <meta name="description" content="receipts from restaurants all over the world, all in nyc." />
        <meta property="og:title" content="tastebuds nyc receipts" key="title" />
        <meta
          property="og:image"
          content="https://tastebuds-nyc-receipts.vercel.app/opengraph-image.jpg"
        />
        <meta
          name="og:description"
          content="receipts from restaurants all over the world, all in nyc."
        />
        <meta name="og:site_name" content="tastebuds nyc receipts" />
        <meta name="og:url" content="https://tastebuds-nyc-receipts.vercel.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:image"
          content="https://tastebuds-nyc-receipts.vercel.app/opengraph-image.jpg"
        />
        <meta name="twitter:title" content="tastebuds nyc receipts" />
        <meta name="twitter:domain" content="tastebuds-nyc-receipts.vercel.app" />
        <meta
          name="twitter:description"
          content="receipts from restaurants all over the world, all in nyc."
        />
        <script defer src="https://umami.ysadamt.com/script.js" data-website-id="002a2980-c558-4be9-92cd-4632348dc4ea"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
