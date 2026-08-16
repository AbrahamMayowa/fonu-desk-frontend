import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

const sherika = localFont({
  src: [
    { path: "./fonts/Sherika-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/Sherika-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/Sherika-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Sherika-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/Sherika-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "./fonts/Sherika-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-sherika",
});

export const metadata: Metadata = {
  title: "Fonu Desk - Premium SaaS Support Ticketing",
  description: "Enterprise grade B2B support ticketing platform for organizations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sherika.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface-app text-foreground font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
