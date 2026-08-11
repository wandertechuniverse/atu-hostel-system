import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ATU Hostel Booking - Find your room at Accra Technical University",
    template: "%s - ATU Hostel Booking",
  },
  description:
    "Search, compare and book rooms across ATU campus hostels and private hostels around Adabraka. Live availability, secure login and verified payments.",
  keywords: [
    "ATU",
    "Accra Technical University",
    "hostel booking",
    "student accommodation",
    "Adabraka hostels",
    "rooms for students",
  ],
  authors: [{ name: "Accra Technical University" }],
  creator: "Accra Technical University",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "ATU Hostel Booking",
    title: "ATU Hostel Booking",
    description:
      "Search, compare and book rooms across ATU campus hostels and private hostels around Adabraka.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATU Hostel Booking",
    description:
      "Search, compare and book rooms across ATU campus hostels and private hostels around Adabraka.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ATU Hostel Booking",
  applicationCategory: "TravelApplication",
  operatingSystem: "Any",
  description:
    "Hostel booking system for Accra Technical University students - search campus and private hostels around Adabraka, request rooms and verify payments.",
  url: siteUrl,
  provider: {
    "@type": "CollegeOrUniversity",
    name: "Accra Technical University",
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "GHS",
    lowPrice: "3500",
    highPrice: "6000",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Apply the saved theme before hydration to avoid a flash of the wrong
            scheme (suppressHydrationWarning is set on <html>). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
