import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header, PatientContextBar, Providers } from "@/components";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "CareSignal AI",
  description:
    "Compassionate AI assistance for caregivers. Get support with care tasks, reminders, and guidance.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen`}
      >
        <Providers>
          <Header />
          <PatientContextBar />
          <main className="min-h-[calc(100vh-4rem)] overflow-x-hidden safe-mobile">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
