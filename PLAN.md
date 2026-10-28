# Build Plan: Solo Travel Planner (working name TBC)

A public website that helps solo travellers plan a trip. They tell it what they like doing and where they want to go, and it builds a route they can edit, save and share. Sri Lanka is the first country, and the site is designed so more countries can be added later by adding content, not code.

---

## 1. What the first version does

| Feature | Description |
|---|---|
| **Country & destination guides** | About 25 Sri Lanka destinations grouped into 9 regions. Each page gives a solo-traveller angle: safety, social spots, getting there, and costs for one person. |
| **Route generator** | Travellers pick interests, regions, dates and trip length, pace, budget and transport. The site builds a day-by-day route. It uses its own rules, not AI, so it's free to run. |
| **Itinerary editor** | Travellers drag stops to reorder them, add or remove stops and change nights. Travel times and costs update instantly. The route is shown on a map. |
| **Season warnings** | For example: "The east coast is in monsoon in December, so consider the south instead." |
| **Accounts** | Sign in with email or Google to save trips and pick them up on any device. People can try the planner before signing up. |
| **Public gallery** | Travellers can publish a trip. Others can browse it, filter by length and interests, and copy it to edit. A report button flags problems for you to review. |
| **Currency** | Prices are shown in rupees (LKR) plus a home currency the visitor picks, using daily exchange rates. |
| **Private for now** | The whole site sits behind one shared password until you're ready to launch, and it's hidden from search engines. See section 4a. |

**Not in the first version (phase 2):** multi-country trips (the data structure is ready for them), an optional AI that writes friendly day descriptions, more countries, and your own photos.

---

## 2. How the route generator works

1. **Score** every destination against the traveller's interests. Each destination is tagged, e.g. Ella → hiking, scenery, train, social.
2. **Include** the regions the traveller asked for, and lower the score of destinations in monsoon during their dates.
3. **Fit to time.** Pace sets nights per stop (relaxed means more nights). Pick the best-scoring stops until the days are used up, allowing for travel days.
4. **Order** the stops to keep travel time low, starting from the arrival airport (Colombo / BIA) and ending where they fly home. This uses a table of travel times between destinations, with separate times for train/bus and private driver.
5. **Explain** each pick, e.g. "Added Arugam Bay because you chose surfing and it's in season in July."

There's no paid map or routing service. Travel times come from a table we research and keep ourselves (part of the content), so there are no API costs.

---

## 3. Sri Lanka content (for you to review)

Sources: the Lonely Planet *Experience Sri Lanka* ebook (used for facts only) and current web sources, cross-checked. **All text on the site will be written from scratch.** Photos will be free licensed ones from Unsplash or Wikimedia Commons, with credits.

**Status:** Phase 1 done on 28 Oct 2026. There are 29 destinations in 8 regions, plus 46 travel legs with train status, all in `content/`.

**Regions and proposed destinations (about 28, so we can trim):**

- **Colombo:** Colombo
- **West Coast:** Negombo, Kalpitiya, Wilpattu NP, Bentota, Hikkaduwa
- **Galle & the South:** Galle, Unawatuna, Weligama, Mirissa, Tangalle, Yala NP (Tissamaharama)
- **Hill Country:** Ella, Haputale, Nuwara Eliya, Kitulgala, Sri Pada (Adam's Peak), Uda Walawe NP, Sinharaja
- **Kandy:** Kandy, Knuckles Range
- **Ancient Cities:** Sigiriya, Dambulla, Polonnaruwa, Anuradhapura
- **The East:** Trincomalee, Arugam Bay, Gal Oya NP
- **The North:** Jaffna

**Each destination stores:** a short original description, interest tags, a suggested number of nights, monthly weather/season ratings, solo-safety notes, social spots, how to get there, cost bands for one person (budget/mid/comfort), and map coordinates.

**Country-wide pages:** arriving, visas/ETA, getting around (trains, buses, tuk-tuks), safe travel as a solo traveller (common scams, travelling at night, solo women), money, and responsible travel.

---

## 4. Technology (free plans, beginner-friendly)

| Piece | Choice | Why |
|---|---|---|
| Website framework | **Next.js** (React) | Widely used, fast, and well supported by Vercel |
| Hosting | **Vercel** (free Hobby plan) | Automatic deploys whenever changes are saved to GitHub |
| Accounts & database | **Supabase** (free plan) | Sign-in (email + Google) and a database in one place |
| Maps | **MapLibre + OpenFreeMap** | Free, and no API key needed |
| Exchange rates | **open.er-api.com** | Free, includes LKR, checked once a day |
| Content | Files in the project (one folder per country) | Adding a country = adding a folder; easy to review and edit |
| Code storage | **GitHub** | Keeps the history of changes; Vercel deploys from it |

Notes:
- **You'll need to create free accounts on GitHub, Vercel and Supabase yourself.** I can't create accounts on your behalf. I'll guide you through each step.
- Vercel's free plan is for non-commercial sites. If you later add ads or affiliate links, you'd move to a paid plan (about $20/month) or switch to another free host such as Netlify or Cloudflare.
- Supabase's free plan pauses a project after a week with no activity. Regular visitors keep it awake, and it's easy to wake up again if needed.

### 4a. Shared-password access (until launch)

- Every page, including the gallery, first shows a password page. Once the visitor enters the right password, the browser remembers it for 30 days.
- The password is stored as a Vercel setting, not in the code, so you can change it on the Vercel website without any coding. **Changing it logs everyone out.** That's the only way to remove someone's access.
- The site tells search engines not to list it while it's private.
- Visitors still create their own account to save trips. The password only gets them through the door.
- **Going public:** a single Vercel setting (`SITE_ACCESS=public`) turns off the password page and lets search engines list the site. To switch to an invite list instead, we can add one later without rebuilding anything.
- Limits: anyone with the password can pass it on, and you can't see who used it. That's fine for testing with friends, but not for anything sensitive.

**Data structure (built ready for multi-country trips):**
- `countries/<country>/`: country info, regions, destinations, travel-time table, seasons
- Database tables: `profiles`, `trips` (owner, title, list of countries, dates, preferences, public/private), `trip_stops` (country + destination, order, nights, notes), `reports`

---

## 5. Build phases

Each phase ends with something you can see and try.

| # | Phase | What you'll be able to see |
|---|---|---|
| 0 | **Setup:** project, GitHub, Vercel, Supabase, shared-password page | A placeholder site live on the web, behind your password |
| 1 | **Research:** Sri Lanka content and travel-time table | Content files for you to review and edit |
| 2 ✅ | **Guides:** home, country, region and destination pages, plus a theme for each country | A site you can browse |
| 3 ✅ | **Route generator:** questionnaire and the rules that build the route | Answer questions and get a route (saved in the browser) |
| 4 | **Itinerary editor:** map, drag to reorder, travel times, costs, currency | A fully editable trip |
| 5 | **Accounts:** sign-in, saving trips, "My trips" | Your trips on any device |
| 6 | **Gallery:** publish, browse, copy, report, admin review page | Shared trips from other travellers |
| 7 | **Polish:** works well on phones, accessibility, speed, search engines, privacy page | Ready to launch: you switch off the password whenever you choose |

---

## 6. Decisions needed before Phase 0

1. **Approve the technology choices** in section 4 (or tell me what you'd prefer).
2. **Destination list:** keep the about 28 above, or trim or add some.
3. **Working name:** fine to use a placeholder ("Solo Planner") until you choose one.
4. **Are you happy to create** the GitHub, Vercel and Supabase accounts when we reach Phase 0?
5. **Choose the shared password** when we reach Phase 0. You'll type it into Vercel's settings yourself; don't send it to me in chat.
