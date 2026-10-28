import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-24 sm:px-8">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">{SITE_NAME}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{SITE_TAGLINE}</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Tell us what you love doing and where you&apos;d like to go, and we&apos;ll build a route
        you can make your own. Starting with Sri Lanka.
      </p>
      <p className="mt-10 inline-flex w-fit rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-muted">
        Under construction · private preview
      </p>
    </main>
  );
}
