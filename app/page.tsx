"use client";

import createGlobe from "cobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { fakeReceipt } from "./utils/fonts";
import restaurantsData from "../data/restaurants.json";
import { Nanum_Pen_Script, Zalando_Sans } from "next/font/google";
import gsap from "gsap";
import { GlobeIcon, InstagramLogoIcon, LinktreeLogoIcon, MapPinIcon, TiktokLogoIcon } from "@phosphor-icons/react";

const nanumPenScript = Nanum_Pen_Script({ weight: "400" });
const zalandoSans = Zalando_Sans({ weight: ["400", "500", "600", "700", "800", "900"] });

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
  CZ: [49.8, 15.5],
};

type ReceiptSection = { section: string; items: string[] };

function buildSections(r: Restaurant): ReceiptSection[] {
  const out: ReceiptSection[] = [];
  const add = (s: string, list: string[]) => {
    if (!list.length) return;
    out.push({ section: s, items: list });
  };
  add("BEVERAGES", r.beverages);
  add("APPETIZERS", r.appetizers);
  add("MAINS", r.mains);
  add("DESSERTS", r.desserts);
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
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // Refs for GSAP targets
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const globeWrapperRef = useRef<HTMLDivElement>(null);
  const receiptAreaRef = useRef<HTMLDivElement>(null);
  const receiptCardRef = useRef<HTMLDivElement>(null);
  const postItRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<Restaurant | null>(null);
  const animatingRef = useRef(false);

  // ── Page load entrance animation ──────────────────────────────
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Title drops in
    tl.fromTo(
      titleRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 }
    );

    // Subtitle fades in
    tl.fromTo(
      subtitleRef.current,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      "-=0.5"
    );

    // Globe scales up with a satisfying bounce
    tl.fromTo(
      globeWrapperRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, ease: "back.out(1.4)" },
      "-=0.3"
    );
  }, []);

  // ── Receipt animation on selection ────────────────────────────
  const animateReceiptIn = useCallback(() => {
    if (!receiptCardRef.current) return;

    const card = receiptCardRef.current;
    const lines = card.querySelectorAll("[data-receipt-line]");

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => { animatingRef.current = false; },
    });

    // Receipt slides down like paper printing — reveal via clipPath
    tl.fromTo(
      card,
      {
        clipPath: "inset(0 0 100% 0)",
        opacity: 1,
        y: -10,
        rotate: 0,
      },
      {
        clipPath: "inset(0 0 0% 0)",
        y: 0,
        rotate: 2,
        duration: 0.7,
        ease: "power2.inOut",
      }
    );

    // Lines stagger in with a typewriter-like feel
    tl.fromTo(
      lines,
      { opacity: 0, x: -6 },
      { opacity: 1, x: 0, duration: 0.25, stagger: 0.03, ease: "power1.out" },
      "-=0.3"
    );

    // Post-it slaps on after receipt prints
    if (postItRef.current) {
      tl.fromTo(
        postItRef.current,
        { scale: 0, opacity: 0, rotate: -10 },
        { scale: 1, opacity: 1, rotate: 2, duration: 0.4, ease: "back.out(2.5)" },
        "-=0.1"
      );
    }
  }, []);

  const handleStickerClick = useCallback(
    (r: Restaurant) => {
      if (animatingRef.current) return;
      if (selected?.id === r.id) return;
      animatingRef.current = true;

      // If a receipt is already showing, animate it out first
      if (selected && receiptCardRef.current) {
        const outTl = gsap.timeline({
          onComplete: () => {
            setSelected(r);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                animateReceiptIn();
              });
            });
          },
        });
        // Post-it flies off first
        if (postItRef.current) {
          outTl.to(postItRef.current, {
            scale: 0, opacity: 0, rotate: -15, duration: 0.2, ease: "power2.in",
          });
        }
        // Then receipt slides up
        outTl.to(receiptCardRef.current, {
          clipPath: "inset(0 0 100% 0)",
          y: -10,
          rotate: 0,
          opacity: 0,
          duration: 0.35,
          ease: "power2.in",
        }, postItRef.current ? "-=0.1" : "0");
      } else {
        // FLIP: capture globe position before layout shift
        const globeRect = globeWrapperRef.current?.getBoundingClientRect();

        setSelected(r);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // FLIP: animate globe from old position to new
            if (globeRect && globeWrapperRef.current) {
              const newRect = globeWrapperRef.current.getBoundingClientRect();
              const dx = globeRect.left - newRect.left;
              const dy = globeRect.top - newRect.top;
              if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                gsap.fromTo(
                  globeWrapperRef.current,
                  { x: dx, y: dy },
                  { x: 0, y: 0, duration: 0.7, ease: "power2.out" }
                );
              }
            }
            animateReceiptIn();
          });
        });
      }
    },
    [selected, animateReceiptIn]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true;
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;

      const dx = e.clientX - lastXRef.current;
      const dy = e.clientY - lastYRef.current;

      phiRef.current += dx * 0.005;
      thetaRef.current = Math.max(
        THETA_MIN,
        Math.min(THETA_MAX, thetaRef.current + dy * 0.005)
      );

      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
    },
    []
  );

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      width: 800,
      height: 800,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 0,
      diffuse: 1,
      mapSamples: 20000,
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
      if (!isDraggingRef.current) {
        phiRef.current += 0.001;
      }
      globe.update({ phi: phiRef.current, theta: thetaRef.current });
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      globe.destroy();
    };
  }, []);

  const sections = selected ? buildSections(selected) : [];

  return (
    <main className="min-h-screen bg-[#f2ede6] flex flex-col justify-between items-center px-5 pt-8 pb-16 text-[#1a1520]">
      {/* SVG sticker outline filter */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="sticker-outline">
            <feMorphology
              in="SourceAlpha"
              result="Dilated"
              operator="dilate"
              radius="3"
            />
            <feFlood floodColor="#ffffff" result="OutlineColor" />
            <feComposite
              in="OutlineColor"
              in2="Dilated"
              operator="in"
              result="Outline"
            />
            <feMerge>
              <feMergeNode in="Outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="flex flex-col gap-2">
        <h1
          ref={titleRef}
          className={`text-center tracking-wide ${nanumPenScript.className} text-7xl mb-2 opacity-0`}
        >
          tastebuds nyc receipts
        </h1>

        <div ref={subtitleRef} className="flex flex-col items-center">
          <div
            className={`text-[#8a7e78] text-lg tracking-[0.08em] flex items-center gap-1.5 mb-4 font-semibold ${zalandoSans.className}`}
          >
            <a href="https://www.tiktok.com/@tastebuds_nyc" target="_blank" rel="noopener noreferrer" className="flex gap-2 items-center hover:text-[#1a1520] transition-colors duration-200">
              <span>
                <TiktokLogoIcon size={18} weight="fill" />
              </span>
              tiktok
            </a>
            <p>
              ·
            </p>
            <a href="https://linktr.ee/Tastebuds_nyc" target="_blank" rel="noopener noreferrer" className="flex gap-2 items-center hover:text-[#1a1520] transition-colors duration-200">
              <span>
                <LinktreeLogoIcon size={18} weight="fill" />
              </span>
              linktree
            </a>
            <p>
              ·
            </p>
            <a href="https://pinnit.io/map/tastebuds-nyc" target="_blank" rel="noopener noreferrer" className="flex gap-2 items-center hover:text-[#1a1520] transition-colors duration-200">
              <span>
                <MapPinIcon size={18} weight="fill" />
              </span>
              pinnit
            </a>
          </div>

          <p className={`text-sm text-[#8a7e78] tracking-[0.08em] ${zalandoSans.className}`}>
            spin the globe, click a flag, view the receipt!
          </p>

        </div>
      </div>


      <div className="flex items-center justify-center flex-wrap w-full">
        <div
          ref={globeWrapperRef}
          className="globeWrapper relative w-[600px] h-[600px] shrink-0 opacity-0"
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="globeCanvas block w-[600px]! h-[600px]! rounded-full cursor-grab active:cursor-grabbing"
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
              style={
                {
                  positionAnchor: `--cobe-${r.id}`,
                  opacity: `var(--cobe-visible-${r.id}, 0)`,
                  pointerEvents: `var(--cobe-visible-${r.id}, none)` as React.CSSProperties["pointerEvents"],
                } as React.CSSProperties
              }
              onClick={() => handleStickerClick(r)}
              title={`${r.restaurant_name} · ${r.country}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleStickerClick(r);
              }}
            >
              {getFlagEmoji(r.country_code)}
            </div>
          ))}
        </div>

        {/* Receipt */}
        <div ref={receiptAreaRef} className="flex flex-col items-center drop-shadow-md">
          {selected && (
            <div className="relative">
              <div
                ref={receiptCardRef}
                className="w-[300px] flex flex-col items-center"
                style={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
              >
                {/* Paper body */}
                <div
                  className={`w-full px-5 pt-4 pb-6 bg-[#fffef8] shadow-[0_1px_4px_rgba(0,0,0,0.08)] ${fakeReceipt.className}`}
                >
                  <p
                    data-receipt-line
                    className="text-center text-lg text-black font-bold tracking-wide"
                  >
                    {selected.restaurant_name.toUpperCase()}
                  </p>
                  <p
                    data-receipt-line
                    className="text-center my-1.5 text-sm leading-[1.4] text-[#555]"
                  >
                    {getFlagEmoji(selected.country_code)}{" "}
                    {selected.country.toUpperCase()}
                  </p>
                  <a
                    data-receipt-line
                    className="text-[0.65rem] leading-[1.4] text-[#777] underline hover:text-blue-500 transition-colors duration-200"
                    href={`https://maps.google.com/?q=${selected.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <p className="text-center">
                      {selected.address}
                    </p>
                  </a>

                  <p
                    data-receipt-line
                    className="text-center text-[0.7rem] my-2 text-[#999]"
                  >
                    - - - - - - - - - - - - - - - - -
                  </p>

                  <p
                    data-receipt-line
                    className="text-[0.7rem] my-px leading-[1.4] text-[#555]"
                  >
                    ORDER #{String(selected.id).padStart(4, "0")}
                  </p>

                  <p
                    data-receipt-line
                    className="text-center text-[0.7rem] my-2 text-[#999]"
                  >
                    - - - - - - - - - - - - - - - - -
                  </p>

                  {sections.map((sec) => (
                    <div key={sec.section} className="mb-2">
                      <p
                        data-receipt-line
                        className="text-[0.7rem] mt-1 mb-0.5 text-[#888] tracking-[0.08em] uppercase"
                      >
                        {sec.section}
                      </p>
                      {sec.items.map((item) => (
                        <p
                          key={item}
                          data-receipt-line
                          className="text-[0.8rem] my-px leading-normal text-[#222] pl-1"
                        >
                          {item}
                        </p>
                      ))}
                    </div>
                  ))}

                  <p
                    data-receipt-line
                    className="text-center text-[0.7rem] my-2 text-[#999]"
                  >
                    - - - - - - - - - - - - - - - - -
                  </p>

                  <p
                    data-receipt-line
                    className="text-center text-[0.8rem] my-px leading-[1.6] text-[#555]"
                  >
                    THANK YOU FOR DINING WITH US!
                  </p>
                  <p
                    data-receipt-line
                    className="text-center text-[0.7rem] my-px leading-[1.4] text-[#888]"
                  >
                    tastebuds_nyc
                  </p>
                  <p
                    data-receipt-line
                    className="text-center text-[0.7rem] mt-2 mb-12 text-[#aaa]"
                  >
                    * * * CUSTOMER COPY * * *
                  </p>
                </div>

                {/* Torn edge */}
                <svg
                  className="w-full block"
                  height="12"
                  preserveAspectRatio="none"
                  viewBox="0 0 280 12"
                >
                  <path
                    d="M0,0 L5,4 L10,1 L15,5 L20,2 L25,6 L30,1 L35,5 L40,2 L45,4 L50,1 L55,5 L60,2 L65,6 L70,1 L75,4 L80,2 L85,5 L90,1 L95,6 L100,2 L105,4 L110,1 L115,5 L120,2 L125,6 L130,1 L135,4 L140,2 L145,5 L150,1 L155,6 L160,2 L165,4 L170,1 L175,5 L180,2 L185,6 L190,1 L195,4 L200,2 L205,5 L210,1 L215,6 L220,2 L225,4 L230,1 L235,5 L240,2 L245,6 L250,1 L255,4 L260,2 L265,5 L270,1 L275,4 L280,0"
                    fill="#fffef8"
                  />
                </svg>
              </div>

              {/* Post-it note with links */}
              <div
                ref={postItRef}
                className={`absolute -bottom-[4%] left-1/2 -translate-x-1/2 w-[150px] bg-[#fef08a] px-3 py-2.5 shadow-[2px_2px_6px_rgba(0,0,0,0.15)] ${nanumPenScript.className}`}
                style={{ opacity: 0, transformOrigin: "top left" }}
              >
                {/* Tape strip */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-5 bg-[#fde68a]/60 rounded-sm" />

                <div className="flex flex-col gap-1.5 mt-1">
                  {selected.tiktok_video_id && (
                    <a
                      href={`https://www.tiktok.com/@tastebuds_nyc/video/${selected.tiktok_video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#92400e] hover:text-[#78350f] transition-colors duration-150 no-underline"
                    >
                      {/* Globe icon */}
                      <span className="shrink-0"><TiktokLogoIcon size={18} weight="fill" /></span>
                      <span className="leading-tight truncate">tiktok</span>
                    </a>
                  )}
                  {selected.website && (
                    <a
                      href={selected.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#92400e] hover:text-[#78350f] transition-colors duration-150 no-underline"
                    >
                      {/* Globe icon */}
                      <span className="shrink-0"><GlobeIcon size={18} weight="fill" /></span>
                      <span className="leading-tight truncate">website</span>
                    </a>
                  )}
                  {selected.instagram && (
                    <a
                      href={`https://instagram.com/${selected.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#92400e] hover:text-[#78350f] transition-colors duration-150 no-underline"
                    >
                      {/* Instagram icon */}
                      <span className="shrink-0"><InstagramLogoIcon size={18} weight="fill" /></span>
                      <span className="leading-tight truncate">@{selected.instagram}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      {/* Footer */}
      <div className="flex flex-col items-center mt-10">
        <p className={`text-sm text-[#8a7e78] tracking-[0.08em] ${zalandoSans.className}`}>
          made with ❤️ by <a href="https://www.ysadamt.com" target="_blank" rel="noopener noreferrer" className="text-[#92400e] hover:text-[#78350f] transition-colors duration-150 no-underline">ysadamt</a>, code available on <a href="https://github.com/ysadamt/tastebuds-nyc-receipts" target="_blank" rel="noopener noreferrer" className="text-[#92400e] hover:text-[#78350f] transition-colors duration-150 no-underline">github</a>.
        </p>
      </div>
    </main >
  );
}
