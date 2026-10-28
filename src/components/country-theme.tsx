import type { CSSProperties, ReactNode } from "react";
import type { Country } from "@/content/schema";

/** Swaps the site accent for the country's own colours (light and dark). */
export function CountryTheme({ country, children }: { country: Country; children: ReactNode }) {
  const style = {
    "--country-accent-light": country.accent.light,
    "--country-accent-dark": country.accent.dark,
  } as CSSProperties;
  return (
    <div className="country-theme flex flex-1 flex-col" style={style}>
      {children}
    </div>
  );
}
