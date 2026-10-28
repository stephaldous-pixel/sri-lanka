"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { PlannerData, PlanResult } from "@/planner/types";
import { stopLabels } from "./stop-labels";

// Free vector tiles from OpenFreeMap (no key needed); the style carries the OpenStreetMap attribution.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
/** Copied into /public by scripts/copy-map-worker.mjs before each build. */
const WORKER_URL = "/vendor/maplibre-gl-worker.mjs";

type Point = { slug: string; name: string; label: string; lng: number; lat: number };

/** Id used for the airport (the starting point) in the list and on the map. */
export const AIRPORT_ID = "airport";

/**
 * The route on a map: the airport and numbered stops joined along the journeys
 * between them. `active` highlights one place (from the list); tapping a marker
 * calls `onSelect` so the list can highlight it too.
 */
export function RouteMap({
  data,
  plan,
  active,
  onSelect,
  className = "",
}: {
  data: PlannerData;
  plan: PlanResult;
  active?: string | null;
  onSelect?: (slug: string) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  const bounds = useRef<[[number, number], [number, number]] | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const coords = new Map(data.destinations.map((d) => [d.slug, [d.coordinates.lng, d.coordinates.lat] as [number, number]]));
  // One marker per place; the airport town appears once even if it's also the last night.
  const airport = data.country.gateways[0];
  const airportPoint: [number, number] = [airport.coordinates.lng, airport.coordinates.lat];
  const points: Point[] = [{ slug: AIRPORT_ID, name: `${airport.shortName} (${airport.code})`, label: "✈", lng: airportPoint[0], lat: airportPoint[1] }];
  const labels = stopLabels(plan);
  plan.stops.forEach((stop, i) => {
    const [lng, lat] = coords.get(stop.destination.slug)!;
    if (points.some((p) => p.slug === stop.destination.slug)) return;
    points.push({ slug: stop.destination.slug, name: stop.destination.name, label: labels[i], lng, lat });
  });
  // Airport → first stop → … → back to the airport. The gateway town stands in for the
  // airport in journey paths, so swap it for the airport's own position at each end.
  const pathCoords = (hop: (typeof plan.hops)[number]) => hop.path.map((slug) => coords.get(slug)!);
  const line: [number, number][] = [
    airportPoint,
    ...pathCoords(plan.startHop).slice(1),
    ...plan.hops.flatMap((hop) => pathCoords(hop).slice(1)),
    airportPoint,
  ];
  const routeKey = JSON.stringify([points, line]);

  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !container.current) return;
        maplibregl.setWorkerUrl(WORKER_URL);
        const instance = new maplibregl.Map({
          container: container.current,
          style: STYLE_URL,
          center: [80.7, 7.85],
          zoom: 6.3,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        let loaded = false;
        // The style (not every tile) is enough to draw the route and markers, so start then.
        instance.once("style.load", () => {
          loaded = true;
          // Start the credit line collapsed (as an ⓘ button) so it doesn't cover a small map.
          container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
          const accent = getComputedStyle(container.current!).getPropertyValue("--accent").trim() || "#b8561b";
          instance.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          instance.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": accent, "line-width": 3.5, "line-opacity": 0.85 },
          });
          setReady(true);
        });
        // A missing tile is harmless; only show the fallback if the map never loads.
        instance.on("error", () => {
          if (!loaded) setFailed(true);
        });
        let wasHidden = true;
        const observer = new ResizeObserver(([entry]) => {
          const hidden = entry.contentRect.width === 0 || entry.contentRect.height === 0;
          if (!hidden) {
            instance.resize();
            if (wasHidden && bounds.current) instance.fitBounds(bounds.current, { padding: 48, maxZoom: 9, duration: 0 });
          }
          wasHidden = hidden;
        });
        observer.observe(container.current);
        instance.once("remove", () => observer.disconnect());
        map.current = instance;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    let cancelled = false;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled) return;
      const [pts, path] = JSON.parse(routeKey) as [Point[], [number, number][]];
      const source = instance.getSource("route");
      if (source && "setData" in source) {
        (source as { setData: (d: GeoJSON.GeoJSON) => void }).setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: path },
        });
      }
      markers.current.forEach((m) => m.remove());
      markers.current = new Map(
        pts.map((p) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = markerClass(p.slug === AIRPORT_ID, false);
          el.textContent = p.label;
          el.title = p.name;
          el.setAttribute("aria-label", `${p.label === "✈" ? "Start" : `Stop ${p.label}`}: ${p.name}`);
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            select.current?.(p.slug);
          });
          return [p.slug, new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(instance)];
        }),
      );
      if (pts.length > 0) {
        const box = new maplibregl.LngLatBounds();
        pts.forEach((p) => box.extend([p.lng, p.lat]));
        bounds.current = box.toArray() as [[number, number], [number, number]];
        if (instance.getContainer().clientWidth > 0) instance.fitBounds(box, { padding: 48, maxZoom: 9, duration: 600 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, routeKey]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    markers.current.forEach((marker, slug) => {
      // Only toggle our size classes: MapLibre keeps its own positioning classes on the element.
      const el = marker.getElement();
      const on = slug === active;
      for (const c of ACTIVE_CLASSES) el.classList.toggle(c, on);
      for (const c of IDLE_CLASSES) el.classList.toggle(c, !on);
      el.style.zIndex = on ? "2" : "";
    });
    const marker = active ? markers.current.get(active) : undefined;
    if (marker && instance.getContainer().clientWidth > 0) {
      const target = marker.getLngLat();
      if (!instance.getBounds().contains(target)) instance.easeTo({ center: target, duration: 500 });
    }
  }, [active, ready, routeKey]);

  const description = `Map of your route: ${points.map((p) => p.name).join(", ")}.`;
  return (
    <div className={`relative w-full min-w-0 overflow-hidden rounded-2xl bg-surface-sunken ${className}`}>
      {/* MapLibre's CSS sets position: relative on this element, so size it explicitly rather than with inset. */}
      <div ref={container} role="img" aria-label={description} className="h-full w-full" />
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
          The map couldn&apos;t load. Your route is listed alongside.
        </p>
      )}
    </div>
  );
}

const ACTIVE_CLASSES = ["size-9", "text-sm", "scale-110", "ring-4", "ring-accent/40"];
const IDLE_CLASSES = ["size-7", "text-xs", "ring-2", "ring-white"];

function markerClass(isAirport: boolean, isActive: boolean): string {
  const base = "flex items-center justify-center rounded-full font-semibold shadow-md transition-transform cursor-pointer";
  const colour = isAirport ? "bg-foreground text-background" : "bg-accent text-on-accent";
  return `${base} ${colour} ${(isActive ? ACTIVE_CLASSES : IDLE_CLASSES).join(" ")}`;
}
