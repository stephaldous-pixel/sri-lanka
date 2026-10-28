# Solo Planner (working name)

A trip planner for solo travellers. Sri Lanka first; more countries later. See [PLAN.md](PLAN.md) for the full build plan.

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

## Where things live

- `src/lib/site.ts`: site name and tagline (change the name here)
- `src/lib/site-access.ts` and `src/proxy.ts`: the password gate
- `src/app/`: pages
