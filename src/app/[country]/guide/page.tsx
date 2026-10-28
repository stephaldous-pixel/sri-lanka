import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Markdown } from "@/components/markdown";
import { getCountry } from "@/content";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[country]/guide">): Promise<Metadata> {
  const content = getCountry((await params).country);
  return content ? { title: `${content.country.name} practical guide` } : {};
}

export default async function GuidePage({ params }: PageProps<"/[country]/guide">) {
  const content = getCountry((await params).country);
  if (!content) notFound();
  const { country } = content;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: `/${country.slug}`, label: country.name }, { label: "Practical guide" }]} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{country.name}: the practical stuff</h1>
      <p className="mt-2 text-muted">Last checked {formatDate(country.lastChecked)}.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex flex-wrap gap-2 text-sm lg:flex-col lg:gap-1">
            {country.guide.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-md border border-line px-3 py-1.5 hover:bg-surface-sunken lg:border-0 lg:px-2 lg:py-1"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-12">
          {country.guide.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-6" aria-labelledby={`${section.id}-heading`}>
              <h2 id={`${section.id}-heading`} className="text-2xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <p className="mt-1 text-muted">{section.summary}</p>
              <Markdown className="mt-4 max-w-3xl">{section.body}</Markdown>
              <details className="mt-4 text-sm text-muted">
                <summary className="cursor-pointer">Sources</summary>
                <ul className="mt-2 space-y-1">
                  {section.sources.map((source) => (
                    <li key={source} className="break-all">
                      <a href={source} className="underline" target="_blank" rel="noopener noreferrer">
                        {source}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
