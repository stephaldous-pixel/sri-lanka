import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chevron } from "@/components/disclosure";
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
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: `/${country.slug}`, label: country.name }, { label: "Practical guide" }]} />
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">The practical stuff</h1>
      <p className="mt-3 text-lg text-muted">
        Everything you need to know before travelling {country.name} on your own. Checked {formatDate(country.lastChecked)}.
      </p>

      <div className="mt-10 border-t border-line">
        {country.guide.map((section) => (
          <details key={section.id} id={section.id} className="group scroll-mt-20 border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-lg font-semibold">{section.title}</span>
                <span className="block text-sm text-muted">{section.summary}</span>
              </span>
              <Chevron />
            </summary>
            <div className="pb-8">
              <Markdown>{section.body}</Markdown>
              <details className="mt-5 text-xs text-muted">
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
            </div>
          </details>
        ))}
      </div>
      <OpenFromHash />
    </main>
  );
}

/** Opens the section named in the URL (e.g. /guide#visas) so links from other pages land on open content. */
function OpenFromHash() {
  const script = `(()=>{const o=()=>{const el=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));if(el&&el.tagName==="DETAILS"){el.open=true;el.scrollIntoView();}};o();addEventListener("hashchange",o);})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
