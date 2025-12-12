import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CanvasBackground from '../components/CanvasBackground';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RouteSnap - 智慧外送助手",
  description: "AI 自動辨識訂單，一鍵規劃最佳配送路線",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} antialiased`}>
        <CanvasBackground />
        {children}
      </body>
    </html>
  );
}
