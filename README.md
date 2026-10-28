# Solo Planner (working name)

A trip planner for solo travellers. Sri Lanka first; more countries later. See [PRD.md](PRD.md) for what the product does and why, and [PLAN.md](PLAN.md) for how it's being built.

## Running it on this Mac

Node.js is installed in `~/.local/node`. In Terminal:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run dev
```

Then open http://localhost:3000. The local password is in `.env.local` (never committed).

## Private preview (shared password)

Until launch, every page sits behind one shared password. It's controlled by two settings in
Vercel → Project → Settings → Environment Variables:

| Setting | What it does |
|---|---|
| `SITE_PASSWORD` | The shared password. Changing it logs everyone out. |
| `SITE_ACCESS` | `private` (default) keeps the password page; `public` opens the site to everyone and lets search engines list it. |

After changing either one, redeploy (Vercel → Deployments → ⋯ → Redeploy) for it to take effect.

## Editing the travel content

All destination information lives in plain-text files in `content/`:

- `content/interests.yaml`: the interests travellers can pick (shared by every country)
- `content/countries/sri-lanka/country.yaml`: currency, airports and the practical guide (visas, safety, money…)
- `content/countries/sri-lanka/regions.yaml`: regions and their month-by-month weather ratings
- `content/countries/sri-lanka/destinations/*.yaml`: one file per destination
- `content/countries/sri-lanka/travel-legs.yaml`: journey times between neighbouring places, with train status

To add a country, copy the `sri-lanka` folder and change the details. After editing, run
`npm run check:content`: it spots typos, missing fields and broken links between files. The
build runs the same check, so a mistake can't go live.

Write everything in your own words. Guidebooks can be used to check facts, but never copy their text.

## Tests

`npm test` runs the route-generator tests (`src/planner/engine.test.ts`): trips always fill the right number of days, requested regions are included, seasons are respected and suspended trains are never used.

## Where things live

- `src/lib/site.ts`: site name and tagline (change the name here)
- `src/content/`: the content format (`schema.ts`) and loader (`load.ts`)
- `src/planner/`: the route generator (`engine.ts`) and journey times (`graph.ts`)
- `src/lib/site-access.ts` and `src/proxy.ts`: the password gate
- `src/app/`: pages
