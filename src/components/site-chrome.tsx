import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { CurrencyPicker } from "./currency";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="whitespace-nowrap font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-5 whitespace-nowrap text-sm">
          <Link href="/sri-lanka" className="hidden text-muted hover:text-foreground sm:block">
            Sri Lanka
          </Link>
          <Link href="/sri-lanka/guide" className="hidden text-muted hover:text-foreground sm:block">
            Practical guide
          </Link>
          <CurrencyPicker />
          <Link
            href="/sri-lanka/plan"
            className="rounded-full bg-foreground px-4 py-1.5 font-medium text-background transition hover:opacity-85"
          >
            Plan a trip
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
        <p className="max-w-md">
          {SITE_NAME} plans trips for people travelling alone. Details change, so check transport,
          prices and safety advice before you go.
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/sri-lanka/guide" className="hover:text-foreground">
            Practical guide
          </Link>
          <Link href="/credits" className="hover:text-foreground">
            Photo credits
          </Link>
        </nav>
      </div>
    </footer>
  );
}
