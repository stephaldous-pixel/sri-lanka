import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="whitespace-nowrap font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 whitespace-nowrap text-sm text-muted">
          <Link href="/sri-lanka" className="hidden hover:text-foreground sm:block">
            Sri Lanka
          </Link>
          <Link href="/sri-lanka/guide" className="hover:text-foreground">
            <span className="sm:hidden">Guide</span>
            <span className="hidden sm:inline">Practical guide</span>
          </Link>
          <Link href="/sri-lanka/plan" className="rounded-md bg-accent px-3 py-1.5 font-medium text-on-accent hover:opacity-90">
            Plan a trip
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:px-6">
        <p>
          {SITE_NAME} is a trip planner for solo travellers. Information changes. Always check
          transport, prices and safety advice before you go.
        </p>
        <p>
          Photos from Wikimedia Commons, credited on each page. <Link href="/credits" className="underline">Photo credits</Link>
        </p>
      </div>
    </footer>
  );
}
