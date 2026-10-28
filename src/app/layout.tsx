import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { CurrencyProvider } from "@/components/currency";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { isSitePublic } from "@/lib/site-access";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141412" },
  ],
};

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
  robots: isSitePublic() ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CurrencyProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </CurrencyProvider>
      </body>
    </html>
  );
}
