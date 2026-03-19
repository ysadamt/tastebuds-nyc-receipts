"use client";

import createGlobe from "cobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { fakeReceipt } from "./utils/fonts";
import restaurantsData from "../data/restaurants.json";

type Restaurant = (typeof restaurantsData)[0];

function getFlagEmoji(countryCode: string) {
  return [...countryCode.toUpperCase()]
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// [lat, lng] country centroids
const COORDS: Record<string, [number, number]> = {
  AM: [40.0, 45.0],
  HU: [47.0, 19.5],
  PH: [12.8, 121.8],
  VE: [8.0, -66.0],
  KR: [36.5, 127.5],
  AL: [41.3, 20.2],
  BT: [27.5, 90.4],
  TJ: [39.0, 71.0],
  PY: [-23.4, -58.4],
  MA: [31.8, -7.1],
  ID: [-2.5, 118.0],
  SO: [6.0, 46.2],
  AF: [33.9, 67.7],
  BR: [-14.2, -51.9],
  SY: [35.0, 38.0],
  HT: [19.0, -72.3],
};

function hashPrice(seed: string, min: number, max: number): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return ((min * 100 + (h % ((max - min) * 100))) / 100).toFixed(2);
}

type ReceiptSection = { section: string; items: { label: string; price: string }[] };

function buildSections(r: Restaurant): ReceiptSection[] {
  const out: ReceiptSection[] = [];
  const add = (s: string, list: string[], lo: number, hi: number) => {
    if (!list.length) return;
    out.push({ section: s, items: list.map((n) => ({ label: n, price: hashPrice(n + r.id, lo, hi) })) });
  };
  add("BEVERAGES", r.beverages, 5, 14);
  add("APPETIZERS", r.appetizers, 8, 16);
  add("MAINS", r.mains, 16, 32);
  add("DESSERTS", r.desserts, 7, 13);
  return out;
}

const THETA = 0.3;
const THETA_MIN = -1.2;
const THETA_MAX = 1.2;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(1.0);
  const thetaRef = useRef(THETA);
  const isDraggingRef = useRef(false);
  const hasEverDraggedRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState("");

  const handleStickerClick = useCallback((r: Restaurant) => {
    setSelected(r);
    setReceiptDate(
      new Date().toLocaleString("en-US", {
        month: "2-digit", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
      })
    );
    setReceiptOpen(false);
    requestAnimationFrame(() => setReceiptOpen(true));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    hasEverDraggedRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastXRef.current;
    const dy = e.clientY - lastYRef.current;

    phiRef.current += dx * 0.005;
    thetaRef.current = Math.max(THETA_MIN, Math.min(THETA_MAX, thetaRef.current + dy * 0.005));

    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
  }, []);

  const onPointerUp = useCallback(() => { isDraggingRef.current = false; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Each marker has an id so COBE creates a CSS anchor div (--cobe-{id}) and
    // sets --cobe-visible-{id}: 1 on :root when the marker faces the camera.
    const markers = restaurantsData.map((r) => {
      const [lat, lng] = COORDS[r.country_code] ?? [0, 0];
      return {
        location: [lat, lng] as [number, number],
        size: 0.04,
        color: [0.15, 0.35, 0.8] as [number, number, number],
        id: String(r.id),
      };
    });

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: 1000,
      height: 1000,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 0,
      diffuse: 1.5,
      mapSamples: 16000,
      mapBrightness: 1,
      mapBaseBrightness: 0.05,
      baseColor: [1, 1, 1],
      markerColor: [0.15, 0.35, 0.8],
      glowColor: [1, 1, 1],
      markerElevation: 0,
      markers,
    });

    let rafId: number;
    function frame() {
      // Auto-rotate until the user drags for the first time
      if (!isDraggingRef.current && !hasEverDraggedRef.current) {
        phiRef.current += 0.003;
      }
      globe.update({ phi: phiRef.current, theta: thetaRef.current });
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(rafId); globe.destroy(); };
  }, []);

  const sections = selected ? buildSections(selected) : [];
  const allItems = sections.flatMap((s) => s.items);
  const subtotal = allItems.reduce((s, i) => s + parseFloat(i.price), 0);
  const tax = subtotal * 0.08875;
  const total = subtotal + tax;

  return (
    <main className="globePage">
      {/* SVG sticker outline filter */}
      <svg width='0' height='0' style={{ position: 'absolute' }}>
        <defs>
          <filter id='sticker-outline'>
            <feMorphology
              in='SourceAlpha'
              result='Dilated'
              operator='dilate'
              radius='4'
            />
            <feFlood floodColor='#ffffff' result='OutlineColor' />
            <feComposite
              in='OutlineColor'
              in2='Dilated'
              operator='in'
              result='Outline'
            />
            <feMerge>
              <feMergeNode in='Outline' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <h1 className="pageTitle">tastebuds nyc</h1>
      <p className="pageSubtitle">spin the globe · click a flag · print your receipt</p>

      <div className="mainLayout">
        <div className="globeWrapper">
          <canvas
            ref={canvasRef}
            width={750}
            height={750}
            className="globeCanvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />

          {/*
            COBE creates `--cobe-{id}` anchor divs and sets `--cobe-visible-{id}: 1`
            on :root when the marker faces the camera (0 / unset when hidden).
            Stickers use CSS Anchor Positioning to sit just above each dot.
          */}
          {restaurantsData.map((r) => (
            <div
              key={r.id}
              className="globeSticker"
              style={{
                positionAnchor: `--cobe-${r.id}`,
                opacity: `var(--cobe-visible-${r.id}, 0)`,
                pointerEvents: `var(--cobe-visible-${r.id}, none)` as React.CSSProperties["pointerEvents"],
              } as React.CSSProperties}
              onClick={() => handleStickerClick(r)}
              title={`${r.restaurant_name} · ${r.country}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleStickerClick(r); }}
            >
              {getFlagEmoji(r.country_code)}
            </div>
          ))}
        </div>

        {/* Receipt printer */}
        <div className={`receiptArea ${selected ? "visible" : ""}`}>
          <div
            className={`printerWrap ${receiptOpen ? "printing" : ""}`}
            onClick={() => setReceiptOpen((p) => !p)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReceiptOpen((p) => !p); }
            }}
            aria-label="Toggle receipt"
          >
            {/* Printer body — fixed height, never moves */}
            <div className="printerBody">
              <div className="signal" />
              <div className="printerSlot" />
            </div>

            {/* Paper clip area — overflow hides paper until printing */}
            <div className="paperClip">
              {selected && (
                <div className={`paper ${fakeReceipt.className}`}>
                  <p className="rCenter rBig">{selected.restaurant_name.toUpperCase()}</p>
                  <p className="rCenter rSm">{getFlagEmoji(selected.country_code)} {selected.country.toUpperCase()}</p>
                  <p className="rCenter rSm">{selected.address}</p>
                  <br />
                  <p className="rCenter rSm">================================</p>
                  <p className="rSm">DATE: {receiptDate.split(",")[0]}</p>
                  <p className="rSm">TIME: {receiptDate.split(",").slice(1).join(",").trim()}</p>
                  <p className="rSm">ORDER #: {String(selected.id).padStart(4, "0")}</p>
                  <p className="rCenter rSm">--------------------------------</p>

                  {sections.map((sec) => (
                    <div key={sec.section}>
                      <p className="rSm rUnderline">{sec.section}</p>
                      {sec.items.map((item) => (
                        <div key={item.label} className="rRow">
                          <span className="rItemName">{item.label}</span>
                          <span className="rDots" />
                          <span className="rItemPrice">${item.price}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  <p className="rCenter rSm">--------------------------------</p>
                  <div className="rRow rSm">
                    <span>SUBTOTAL</span><span className="rDots" /><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="rRow rSm">
                    <span>TAX (8.875%)</span><span className="rDots" /><span>${tax.toFixed(2)}</span>
                  </div>
                  <p className="rCenter rSm">================================</p>
                  <div className="rRow rBig rBold">
                    <span>TOTAL</span><span className="rDots" /><span>${total.toFixed(2)}</span>
                  </div>
                  <p className="rCenter rSm">================================</p>
                  <br />
                  <p className="rCenter rSm">THANK YOU FOR DINING WITH US!</p>
                  <p className="rCenter rSm">PLEASE COME AGAIN SOON</p>
                  <br />
                  <p className="rCenter rSm">tastebuds.nyc</p>
                  <p className="rCenter rSm">* * * CUSTOMER COPY * * *</p>
                  <div style={{ height: 40 }} />
                </div>
              )}
            </div>
          </div>
          {selected && <p className="printerHint">click printer to toggle receipt</p>}
        </div>
      </div>
    </main>
  );
}
