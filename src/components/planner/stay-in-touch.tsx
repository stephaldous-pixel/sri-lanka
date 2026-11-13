"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Disclosure } from "@/components/disclosure";
import { button, card } from "@/lib/ui";
import { encodeTrip, todayIn } from "@/lib/trip-link";
import type { EditedRoute } from "@/planner/engine";
import type { PlannerData, PlannerInput } from "@/planner/types";

type Method = "google" | "apple" | "whatsapp" | "other";
type Contact = { id: string; name: string; method: Method; locationShared: boolean; tripSent: boolean };

const METHODS: { value: Method; label: string }[] = [
  { value: "google", label: "Google Maps" },
  { value: "apple", label: "Find My" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other" },
];

// Kept in this browser only, like the saved route.
const CONTACTS_KEY = "solo-planner:contacts";
const NAME_KEY = "solo-planner:traveller-name";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing: the list still works until the page closes.
  }
}

/**
 * Safety while away: how to share live location from the phone (the phone does
 * this far better than a website can), a checklist of the contacts who can see
 * it, a link that shows them the route and dates, and emergency numbers.
 */
export function StayInTouch({ data, input, route }: { data: PlannerData; input: PlannerInput; route: EditedRoute }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [method, setMethod] = useState<Method>("whatsapp");
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setContacts(load<Contact[]>(CONTACTS_KEY, []));
    setName(load<string>(NAME_KEY, ""));
  }, []);

  function updateContacts(next: Contact[]) {
    setContacts(next);
    store(CONTACTS_KEY, next);
  }

  function addContact() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    updateContacts([...contacts, { id: `${Date.now()}`, name: trimmed.slice(0, 60), method, locationShared: false, tripSent: false }]);
    setDraft("");
  }

  function tripLink() {
    const fragment = encodeTrip({ name: name.trim() || undefined, sharedOn: todayIn(data.country.timezone), input, route });
    return `${window.location.origin}/${data.country.slug}/trip#${fragment}`;
  }

  async function shareTrip() {
    const url = tripLink();
    const title = `${name.trim() ? `${name.trim()}’s` : "My"} trip to ${data.country.name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title}: my route and where I'll be each day.`, url });
        setShareNote("Shared. If you change your route, send the link again.");
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied. Paste it into a message to your contacts. If you change your route, send it again.");
    } catch {
      window.prompt("Copy this link and send it to your contacts:", url);
    }
  }

  const ready = contacts.filter((c) => c.locationShared).length;

  return (
    <section aria-labelledby="stay-in-touch" className={`${card} p-5 sm:p-6`}>
      <h2 id="stay-in-touch" className="text-xl font-semibold tracking-tight">
        Stay in touch while you&apos;re away
      </h2>
      <p className="mt-1 text-sm text-muted">
        Let the people you choose see where you are on your phone&apos;s map, and send them your route so they know where you&apos;ll be each day.
      </p>

      <Step number={1} title="Share your live location from your phone">
        <p className="text-sm text-muted">
          Your phone keeps sharing in the background, even when it&apos;s locked, which a website can&apos;t do. Pick the app your contacts use:
        </p>
        <div className="mt-3">
          <Disclosure summary="Google Maps (Android and iPhone)">
            <Steps
              items={[
                "Open Google Maps and tap your profile picture.",
                "Tap Location sharing, then New share (or Share location).",
                "Choose Until you turn this off.",
                "Pick your contacts. They need a Google account to see you.",
              ]}
            />
          </Disclosure>
          <Disclosure summary="Find My (iPhone, for contacts with iPhones)">
            <Steps
              items={[
                "Open the Find My app and go to People.",
                "Tap + then Share My Location.",
                "Add your contacts and choose Share Indefinitely.",
                "Check Settings → Privacy & Security → Location Services is on.",
              ]}
            />
          </Disclosure>
          <Disclosure summary="WhatsApp (good for single travel days)">
            <Steps
              items={[
                "Open the chat with your contact.",
                "Tap + (iPhone) or the paperclip (Android), then Location.",
                "Tap Share live location and choose up to 8 hours.",
                "Repeat on each travel day, as it stops after 8 hours.",
              ]}
            />
          </Disclosure>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Sharing needs mobile data: buy a local SIM or eSIM at the airport (Dialog and Mobitel have desks after arrivals).</li>
          <li>Battery saver modes can pause sharing. Carry a power bank on long travel days.</li>
          <li>Turn sharing off when you&apos;re home: it doesn&apos;t stop by itself in Google Maps or Find My.</li>
        </ul>
      </Step>

      <Step number={2} title="Choose who can see you">
        <p className="text-sm text-muted">Keep track of who you&apos;ve set up. This list stays on this device only.</p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addContact();
          }}
        >
          <label className="min-w-0 flex-1 basis-40">
            <span className="sr-only">Contact&apos;s name</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Contact’s name, e.g. Mum"
              className="w-full rounded-xl border-0 bg-surface-sunken px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </label>
          <label>
            <span className="sr-only">How you&apos;ll share with them</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              className="rounded-xl border-0 bg-surface-sunken px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={button.secondary} disabled={!draft.trim()}>
            Add
          </button>
        </form>
        {contacts.length > 0 && (
          <>
            <ul className="mt-3 divide-y divide-line">
              {contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <span className="min-w-0 flex-1 basis-full sm:basis-32">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block text-xs text-muted">{METHODS.find((m) => m.value === c.method)?.label}</span>
                  </span>
                  <Check
                    checked={c.locationShared}
                    onChange={(v) => updateContacts(contacts.map((x) => (x.id === c.id ? { ...x, locationShared: v } : x)))}
                  >
                    Sees my location
                  </Check>
                  <Check checked={c.tripSent} onChange={(v) => updateContacts(contacts.map((x) => (x.id === c.id ? { ...x, tripSent: v } : x)))}>
                    Has my route
                  </Check>
                  <button
                    type="button"
                    onClick={() => updateContacts(contacts.filter((x) => x.id !== c.id))}
                    aria-label={`Remove ${c.name}`}
                    className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-sunken hover:text-danger"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted" aria-live="polite">
              {ready === contacts.length
                ? `All ${contacts.length} can see your location.`
                : `${ready} of ${contacts.length} can see your location so far.`}
            </p>
          </>
        )}
      </Step>

      <Step number={3} title="Send them your route">
        <p className="text-sm text-muted">
          A private link to your route, dates and day-by-day plan, which shows where you should be today. No password or account needed to open it. It
          contains only your route and the name below.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 basis-40">
            <span className="text-sm font-medium">Your name</span>
            <span className="ml-1 text-sm text-muted">· optional</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                store(NAME_KEY, e.target.value);
              }}
              maxLength={40}
              placeholder="e.g. Steph"
              className="mt-1 w-full rounded-xl border-0 bg-surface-sunken px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </label>
          <button type="button" onClick={shareTrip} className={button.primary}>
            Share my route
          </button>
        </div>
        <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">
          {shareNote}
        </p>
      </Step>

      {data.country.emergency.length > 0 && (
        <Step number={4} title={`Emergency numbers in ${data.country.name}`}>
          <ul className="flex flex-wrap gap-2">
            {data.country.emergency.map((e) => (
              <li key={e.number}>
                <a href={`tel:${e.number}`} className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-4 py-2 text-sm hover:bg-line">
                  {e.label} <span className="font-semibold tabular-nums">{e.number}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">Save these in your phone, with your travel insurer&apos;s emergency line.</p>
        </Step>
      )}
    </section>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="flex items-center gap-3 font-semibold">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-on-accent" aria-hidden="true">
          {number}
        </span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      {children}
    </label>
  );
}
