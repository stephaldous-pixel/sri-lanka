import { notFound } from "next/navigation";
import { CountryTheme } from "@/components/country-theme";
import { getCountry, getCountrySlugs } from "@/content";

export function generateStaticParams() {
  return getCountrySlugs().map((country) => ({ country }));
}

export default async function CountryLayout({ children, params }: LayoutProps<"/[country]">) {
  const content = getCountry((await params).country);
  if (!content) notFound();
  return <CountryTheme country={content.country}>{children}</CountryTheme>;
}
