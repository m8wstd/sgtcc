import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SGTCC - Sistema de Gestão de TCC",
  description: "Plataforma integrada de Acompanhamento e Gestão de TCC",
  icons: {
    icon: [
      { url: "/sgtcc-browser-icon.png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/sgtcc-browser-icon.png",
    apple: "/sgtcc-browser-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
