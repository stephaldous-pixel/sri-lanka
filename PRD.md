# Product Requirements: Solo Planner (working name)

| | |
|---|---|
| **Status** | Private preview. Phases 0–4 built; accounts, gallery and launch polish to come |
| **Last updated** | 28 October 2026 |
| **First country** | Sri Lanka |
| **Companion docs** | [PLAN.md](PLAN.md) covers *how* it's built (phases, technology, setup). This document covers *what* and *why* |

---

## 1. Summary

Solo Planner helps people travelling alone plan a trip that fits them. A traveller says when they're going, what they love doing and how they like to travel. The site then suggests a route that suits the season, keeps travel time sensible and explains every stop. They can adjust the route, see it on a map, and read honest destination guides written for one person: where it's easy to meet people, how to stay safe, and what things really cost when you're not splitting a room.

The product is built to cover many countries. Sri Lanka is the first.

## 2. Problem

Planning a solo trip means stitching together guidebooks, blogs, forums and weather sites, and almost none of it is written for someone on their own.

- **Routes are hard to get right.** It's easy to pick places that are out of season, too far apart, or reached by transport that isn't running. In Sri Lanka, two monsoons hit opposite coasts at different times, and some rail lines are still disrupted after Cyclone Ditwah (November 2025).
- **Solo concerns are an afterthought.** Safety at night, scams aimed at lone travellers, whether you'll meet anyone, and single-occupancy costs are scattered or missing.
- **Plans don't adapt.** Most itineraries are static articles. Changing one stop means redoing the whole thing by hand.

## 3. Goals and non-goals

### Goals
1. **A good first route in under two minutes:** a varied, seasonal, travel-sensible route from a few simple answers.
2. **Make the solo angle central:** sociability, safety, transport and single-traveller costs on every destination.
3. **Let people make the route their own:** reorder, add, remove and change nights, with everything recalculating instantly.
4. **Be trustworthy:** original writing, cited sources, "last checked" dates, and clear warnings when transport or weather may disrupt plans.
5. **Grow to more countries by adding content, not code.**
6. **Run on free plans.**

### Non-goals (for now)
- Booking flights, accommodation or tours, or taking payments.
- Routes that cross countries. The data model allows them, but the first version is one country per trip.
- AI-generated itineraries. Routes come from transparent rules; AI may later polish the wording only.
- Real-time transport timetables or live prices.
- Native mobile apps. The web app is built mobile-first.

## 4. Who it's for

| Persona | Needs | What matters most |
|---|---|---|
| **First-time solo traveller** | Reassurance and a sensible plan | Safety notes, easy places to meet people, clear "best time to go" |
| **Budget backpacker** | Stretch time and money; be social | Public transport routes, dorm/guesthouse prices, sociable stops |
| **Woman travelling alone** | Practical, specific safety advice | Guidance on evening travel, trusted transport, and where harassment is more common |
| **Time-pressed mid-range traveller** | Fit the highlights into fixed dates | Exact-date planning, car-and-driver option, tight routing |

## 5. Key user journeys

1. **Plan a route:** Plan a trip → pick dates on a calendar (or "Not sure yet": month + days) → choose interests → optionally focus on regions → review (travel style tucked behind "Adjust") → see the route, the map and a day-by-day plan.
2. **Tune it:** change nights at any stop with − / +, or open "Edit route" to drag stops into a new order, remove them or add places. Trip length, dates, costs, warnings and the map update instantly.
3. **Research a place:** browse regions and destinations → see the best months at a glance → tap a month for typical temperature and rainfall → expand safety tips, transport and prices as needed.
4. **Prepare to go:** read the practical guide (visas, getting around, safety, women travelling solo, money, weather, respect).
5. **Come back later:** the route and any edits are restored on the same device. (Across devices needs accounts: phase 5.)

## 6. Requirements

Priority: **P0** = needed for launch, **P1** = important, **P2** = nice to have.
Status: ✅ built · 🔜 planned · 💭 later.

### 6.1 Destination content and guides
| ID | Requirement | Priority | Status |
|---|---|---|---|
| C1 | Country page: hero, regions with "Best …" months, month-by-month chart for every region, links to the practical guide | P0 | ✅ |
| C2 | Region pages: summary, best time with a clickable month chart, its destinations | P0 | ✅ |
| C3 | Destination pages: summary; "At a glance" (best time, length of stay, budget per night, how social it is); description; highlights with prices; expandable safety and tips, getting there (direct connections with transport status), stay prices by budget, and sources | P0 | ✅ |
| C4 | Practical guide as expandable sections that open directly from links | P0 | ✅ |
| C5 | Freely licensed photos with credit on each photo and a credits page | P0 | ✅ |
| C6 | All writing original; every destination lists sources and a "last checked" date | P0 | ✅ |
| C7 | Content validated automatically; a broken content file can't be deployed | P0 | ✅ |
| C8 | Sri Lanka launch coverage: about 25+ destinations across all regions | P0 | ✅ (29 destinations, 8 regions) |

### 6.2 Route generator
| ID | Requirement | Priority | Status |
|---|---|---|---|
| R1 | Inputs: dates (calendar range, 3–60 days) or month + days; interests (17); optional focus regions; pace; budget; transport (public / mix / car and driver); prefer sociable places | P0 | ✅ |
| R2 | Routes start and end at the arrival airport, fill exactly the days given, and never repeat a place | P0 | ✅ |
| R3 | Season-aware: avoid places in their poor season unless their region was requested; warn about mixed or poor months | P0 | ✅ |
| R4 | Travel-sensible: a travel-time allowance set by pace; route order optimised to reduce travel; long travel days flagged | P0 | ✅ |
| R5 | Never route travellers onto suspended transport; warn when a chosen option is disrupted | P0 | ✅ |
| R6 | Varied routes: interests already well covered count for less | P1 | ✅ |
| R7 | Every stop explains why it was chosen | P0 | ✅ |
| R8 | Day-by-day plan with dates and an idea for each day | P1 | ✅ |
| R9 | Rough cost for one person (stays plus daily spend) by budget level | P1 | ✅ |
| R10 | Same answers always give the same route | P1 | ✅ |
| R11 | Optional AI-written day descriptions, within a free usage cap | P2 | 💭 |

### 6.3 Editing and the map
| ID | Requirement | Priority | Status |
|---|---|---|---|
| E1 | Change nights at any stop directly from the route; the trip stays the length of the traveller's dates, with nights moved to or from other stops (refused with an explanation if every other stop is at 1 night) | P0 | ✅ |
| E2 | Reorder stops by drag (mouse or touch) and by keyboard (↑ / ↓ on the handle), with screen reader announcements | P0 | ✅ |
| E3 | Remove stops; add places from a searchable list, inserted where they add the least travel | P0 | ✅ |
| E4 | Instant recalculation of journeys, warnings, costs and day plan; adding or removing places rebalances nights so total days stay fixed; "Reset" to the suggested route | P0 | ✅ |
| E5 | Automatically add a night near the airport when the last stop is far away | P1 | ✅ |
| E8 | Choose where to spend the first night (any place, nearest the airport first, with travel time); nights rebalance to keep the dates | P1 | ✅ |
| E6 | Map with numbered stops and the route line; two-finger panning on phones; free tiles | P1 | ✅ |
| E7 | Routes and edits saved on the device | P0 | ✅ |

### 6.4 Seasons, weather and money
| ID | Requirement | Priority | Status |
|---|---|---|---|
| W1 | Month ratings (great / good / mixed / poor) per region, overridable per destination | P0 | ✅ |
| W2 | "Best Dec–Apr"-style labels on cards and pages | P0 | ✅ |
| W3 | Tap any month for typical high/low temperature, rainfall and rainy days, naming the weather station | P1 | ✅ (12 stations) |
| M1 | Prices in local currency plus the traveller's chosen currency (16 options), remembered on the device | P1 | ✅ |
| M2 | Exchange rates refreshed daily from a free source | P1 | ✅ |

### 6.5 Accounts, sharing and community
| ID | Requirement | Priority | Status |
|---|---|---|---|
| A1 | Sign in with email or Google; trips sync across devices; "My trips" list | P0 | 🔜 Phase 5 |
| A2 | Try the planner before signing up; a device-saved trip moves into the account on sign-in | P0 | 🔜 Phase 5 |
| G1 | Publish a trip to a public gallery; browse by length and interests; copy a trip to edit | P1 | 🔜 Phase 6 |
| G2 | Report button on published trips, with an admin review page | P1 | 🔜 Phase 6 |
| G3 | Share a read-only link to a trip (for example with family) | P2 | 💭 |

### 6.6 Access and launch
| ID | Requirement | Priority | Status |
|---|---|---|---|
| L1 | Whole site behind one shared password until launch; hidden from search engines | P0 | ✅ |
| L2 | Single setting to open the site to the public | P0 | ✅ |
| L3 | Launch polish: performance, accessibility review, search-engine basics, privacy page | P0 | 🔜 Phase 7 |
| L4 | Choose the product name and domain | P0 | 🔜 |

### 6.7 More countries
| ID | Requirement | Priority | Status |
|---|---|---|---|
| X1 | Adding a country = adding a content folder (destinations, regions, travel legs, climate, guide) | P0 | ✅ (structure) |
| X2 | Per-country accent colour and photography | P1 | ✅ |
| X3 | Multi-country trips | P2 | 💭 |

## 7. Non-functional requirements

- **Mobile-first:** every page works at 375px wide with no sideways scrolling; checked in testing.
- **Accessibility:** keyboard-operable throughout, including reordering stops. Proper labels for controls, focus moves to each new step in the planner, expandable sections use native elements, and alt text describes every photo. Target: WCAG 2.2 AA at launch.
- **Privacy:** no tracking or analytics yet. Planner answers and routes stay on the device until accounts exist. No personal data in URLs.
- **Performance:** pages are pre-built; photos are served at the size each slot needs; the map loads only in the browser and draws as soon as its style is ready.
- **Cost:** free plans only (Vercel Hobby, Supabase Free, OpenFreeMap tiles, free exchange rates, Wikimedia Commons photos).
- **Reliability of information:** transport options carry a status (running / disrupted / suspended) and a "last checked" date; anything time-sensitive is re-checked before launch.
- **Quality:** automated tests cover the route generator, editing, dates and labels; the content check runs before every build.

## 8. Content model (summary)

Each country folder holds plain-text files that are validated against a schema:

- **Country:** currency, airports, accent colours, hero photo, practical guide sections with sources.
- **Regions:** month ratings, notes, weather station.
- **Destinations:** summary, description, interest strengths, nights (min / ideal / max), highlights with prices, solo notes (sociability, safety, tips), stay prices by budget, getting around, photo, sources, last checked.
- **Travel legs:** direct connections with times by mode and status.
- **Climate:** monthly temperature and rainfall per weather station.

Guidebooks may be used to check facts, but their text is never copied.

## 9. Success measures

**Before launch (private preview)**
- Testers get a route they'd actually use without editing more than two stops.
- No route uses suspended transport or sends travellers somewhere in its poor season without a warning (enforced by tests).
- Every page usable on a phone; no accessibility blockers found in review.

**After launch**
- Share of visitors who finish the planner and see a route.
- Share of routes that are edited, saved to an account, or published.
- Return visits to saved trips.
- Gallery trips copied by other travellers.
- Reports per published trip (lower is better).

## 10. Constraints and assumptions

- Free plans only. Vercel's free plan is for non-commercial use, so adding ads or affiliate links would mean a paid plan or another host.
- Supabase's free plan pauses inactive projects. Acceptable now; revisit if usage grows.
- Content is maintained by hand. Prices and transport status go stale, so "last checked" dates and warnings are part of the product.
- Routes start and end at Colombo's international airport (Jaffna as a secondary option later).

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Out-of-date transport or prices mislead travellers | Status on every transport option, "last checked" dates, prominent "check before you go" messaging, and a re-check before launch |
| Safety advice is incomplete | Cite official travel advice; review before launch; women's safety covered as its own section |
| Copyright | Original writing only; freely licensed photos with credits |
| Free-plan limits (images, database pausing) | Photos resized by Wikimedia rather than Vercel; plan for upgrades if traffic grows |
| Gallery abuse | Report button and an admin review page at launch; sign-in required to publish |
| Route quality on edge cases (very short trips, remote regions) | Automated tests for edge cases; warnings for long travel days; editing to fix anything off |

## 12. Milestones

| Phase | Scope | Status |
|---|---|---|
| 0 | Setup and private preview | ✅ |
| 1 | Sri Lanka research and content | ✅ |
| 2 | Guide pages | ✅ |
| 3 | Route generator | ✅ |
| — | Design refresh, currency, clickable climate months, calendar dates | ✅ (added from feedback) |
| 4 | Editing and map | ✅ |
| 5 | Accounts and syncing trips | 🔜 |
| 6 | Public gallery and moderation | 🔜 |
| 7 | Launch polish, then open to the public | 🔜 |

## 13. Open questions

1. **Name and domain:** still a placeholder.
2. **Launch access:** open fully, or move to an invite list first?
3. **Sign-in methods:** email magic link and Google, or others too?
4. **Gallery moderation:** is "publish instantly + report" enough, or approve first for an initial period?
5. **Money:** any plans for affiliate links or ads? (This affects hosting plan and disclosures.)
6. **AI polish:** worth adding AI-written day descriptions within a free cap?
7. **Next country:** which, and when?

## 14. Decision log

| Date | Decision |
|---|---|
| 28 Oct 2026 | Public site for solo travellers; built to cover many countries, starting with Sri Lanka |
| 28 Oct 2026 | Routes from transparent rules, not AI; fully editable afterwards |
| 28 Oct 2026 | Free plans only; Next.js on Vercel, Supabase for accounts, OpenFreeMap for maps |
| 28 Oct 2026 | One shared password until launch, hidden from search engines |
| 28 Oct 2026 | Lonely Planet *Experience Sri Lanka* used for fact-checking only; all text original |
| 28 Oct 2026 | Neutral brand with per-country accent colours; free licensed photos with credits |
| 28 Oct 2026 | Prices in local currency plus the traveller's chosen currency |
| 28 Oct 2026 | Public gallery with a report button for moderation |
| 28 Oct 2026 | Progressive disclosure: key facts first, detail on demand |
| 28 Oct 2026 | Exact travel dates via calendar; climate figures per weather station |
| 28 Oct 2026 | Code repository made public; the site itself stays private |
| 28 Oct 2026 | Editing keeps the trip to the traveller's dates: nights are rebalanced between stops rather than extending the trip |
| 28 Oct 2026 | Mobile-first layout: phone tabs (Route · Map · Days · Cost), 40px+ tap targets, sticky planner buttons, two-column cards |
