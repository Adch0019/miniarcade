
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "MINIARCADE | Play Free Online Games",
  description:
    "Play free online games including Snake, Tic Tac Toe, 2048 and Memory Lab on MINIARCADE.",
  keywords: [
    "free online games",
    "Snake game",
    "Tic Tac Toe",
    "2048 game",
    "Memory game",
    "MINIARCADE",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-778VFJ9CXC"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-778VFJ9CXC');
          `}
        </Script>
      </body>
    </html>
  );
}
