import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "DocTune — Autonomous RAG pipeline tuning",
  description:
    "Upload domain documents and questions. DocTune races 16 RAG configurations, scores them with the domain-weighted DHS metric, and ships a deployable recommendation. Built by Abhinav Mishra for the BuildSpirit hackathon.",
  authors: [{ name: "Abhinav Mishra" }],
  creator: "Abhinav Mishra",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${space.variable} ${plex.variable} ${instrument.variable}`}>
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
