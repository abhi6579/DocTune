import type { Domain } from "@/lib/engine/configs";

export type DomainImage = {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
};

/** Royalty-free domain photography (Pexels license). */
export const DOMAIN_IMAGES: Record<Domain, DomainImage> = {
  healthcare: {
    url: "https://images.pexels.com/photos/5203594/pexels-photo-5203594.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    alt: "White-walled modern hospital corridor with bright overhead lighting",
    credit: "Enrique Silva / Pexels",
    creditUrl: "https://www.pexels.com/@enrique-silva-2498715",
  },
  legal: {
    url: "https://images.pexels.com/photos/159832/justice-law-case-hearing-159832.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    alt: "Close-up of law and regulation books on a shelf",
    credit: "Pixabay / Pexels",
    creditUrl: "https://www.pexels.com/@pixabay",
  },
  finance: {
    url: "https://images.pexels.com/photos/19335810/pexels-photo-19335810.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    alt: "Low-angle view of glass skyscrapers in a financial district",
    credit: "Masood Aslami / Pexels",
    creditUrl: "https://www.pexels.com/@masoodaslami",
  },
};
