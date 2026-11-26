import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
