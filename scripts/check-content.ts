// npm run check:content — validates every content file and prints a summary.
import { crossCheck, listCountrySlugs, loadCountry, loadInterests } from "../src/content/load";

let failed = false;
try {
  const interests = loadInterests();
  console.log(`✓ ${interests.length} interests`);
  for (const slug of listCountrySlugs()) {
    const content = loadCountry(slug);
    const problems = crossCheck(content, interests);
    const { destinations, regions, legs } = content;
    if (problems.length) {
      failed = true;
      console.error(`✗ ${slug}: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    } else {
      const disrupted = legs.flatMap((l) => l.options.filter((o) => o.status !== "running")).length;
      console.log(
        `✓ ${slug}: ${regions.length} regions, ${destinations.length} destinations, ` +
          `${legs.length} travel legs (${disrupted} options disrupted/suspended)`,
      );
    }
  }
} catch (error) {
  failed = true;
  console.error(`✗ ${(error as Error).message}`);
}
process.exit(failed ? 1 : 0);
