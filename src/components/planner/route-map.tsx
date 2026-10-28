"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { PlannerData, PlanResult } from "@/planner/types";

// Free vector tiles from OpenFreeMap (no key needed); the style carries the OpenStreetMap attribution.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
/** Copied into /public by scripts/copy-map-worker.mjs before each build. */
const WORKER_URL = "/vendor/maplibre-gl-worker.mjs";

type Point = { slug: string; name: string; label: string; lng: number; lat: number };

/** The route on a map: numbered stops joined along the journeys between them. */
export function RouteMap({ data, plan, className = "" }: { data: PlannerData; plan: PlanResult; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const bounds = useRef<[[number, number], [number, number]] | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const coords = new Map(data.destinations.map((d) => [d.slug, [d.coordinates.lng, d.coordinates.lat] as [number, number]]));
  // One marker per place; the airport town appears once even if it's also the last night.
  const points: Point[] = [];
  plan.stops.forEach((stop) => {
    const [lng, lat] = coords.get(stop.destination.slug)!;
    const existing = points.find((p) => p.slug === stop.destination.slug);
    if (existing) return;
    points.push({ slug: stop.destination.slug, name: stop.destination.name, label: stop.role === "arrival" ? "✈" : String(points.length), lng, lat });
  });
  const line = plan.hops.flatMap((hop, i) => hop.path.slice(i === 0 ? 0 : 1).map((slug) => coords.get(slug)!));
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
      markers.current = pts.map((p) => {
        const el = document.createElement("div");
        el.className =
          "flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent shadow-md ring-2 ring-white";
        el.textContent = p.label;
        el.title = p.name;
        return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(instance);
      });
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
