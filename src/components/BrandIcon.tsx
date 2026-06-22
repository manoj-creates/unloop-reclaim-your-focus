import React from "react";
import linkedInIcon from "@/assets/app-icons/linkedin.jpg.asset.json";
import telegramIcon from "@/assets/app-icons/telegram.jpg.asset.json";
import mojIcon from "@/assets/app-icons/moj.jpg.asset.json";
import joshIcon from "@/assets/app-icons/josh.jpg.asset.json";

export type BrandName =
  | "Instagram" | "YouTube" | "YouTube Shorts" | "Shorts" | "TikTok"
  | "Facebook" | "X" | "Twitter" | "Snapchat" | "Reddit" | "Pinterest" | "Threads"
  | "LinkedIn" | "Telegram" | "Moj" | "Josh";

type Brand = {
  bg: string;
  fg: string;
  gradient?: string;
  image?: string;
  /** SVG viewBox, default "0 0 24 24" */
  viewBox?: string;
  /** Logo size as a fraction of the container (default 0.56) */
  scale?: number;
  path?: React.ReactNode;
};

export const BRANDS: Record<BrandName, Brand> = {
  Instagram: {
    bg: "#E4405F",
    fg: "#ffffff",
    gradient: "linear-gradient(135deg,#feda75 0%,#fa7e1e 25%,#d62976 55%,#962fbf 80%,#4f5bd5 100%)",
    scale: 0.58,
    path: (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      </g>
    ),
  },
  YouTube: {
    bg: "#FF0000",
    fg: "#ffffff",
    scale: 0.62,
    path: (
      <g>
        <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.2 5 12 5 12 5s-6.2 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.8 19 12 19 12 19s6.2 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z" />
        <path d="M10 15.2 15.2 12 10 8.8Z" fill="#FF0000" />
      </g>
    ),
  },
  "YouTube Shorts": {
    bg: "#FF0033",
    fg: "#ffffff",
    scale: 0.58,
    path: (
      <g>
        <path d="M14.3 3.4a4 4 0 0 1 1.5 5.5l-.3.5 1.2.6a3.6 3.6 0 0 1 .5 6.2l-6.3 4a4 4 0 0 1-5.6-1.5 4 4 0 0 1 1.4-5.4l.4-.3-1.2-.6A3.6 3.6 0 0 1 5.4 6.2l6.3-4a4 4 0 0 1 2.6.2Z" />
        <path d="M10.5 8.5v7l5.5-3.5Z" fill="#FF0033" />
      </g>
    ),
  },
  Shorts: {
    bg: "#FF0033",
    fg: "#ffffff",
    scale: 0.58,
    path: (
      <g>
        <path d="M14.3 3.4a4 4 0 0 1 1.5 5.5l-.3.5 1.2.6a3.6 3.6 0 0 1 .5 6.2l-6.3 4a4 4 0 0 1-5.6-1.5 4 4 0 0 1 1.4-5.4l.4-.3-1.2-.6A3.6 3.6 0 0 1 5.4 6.2l6.3-4a4 4 0 0 1 2.6.2Z" />
        <path d="M10.5 8.5v7l5.5-3.5Z" fill="#FF0033" />
      </g>
    ),
  },
  TikTok: {
    bg: "#000000",
    fg: "#ffffff",
    scale: 0.56,
    path: (
      <path d="M16.5 3c.3 1.9 1.4 3.4 3.5 3.8v2.7c-1.4 0-2.6-.4-3.7-1.1v6.4a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.9a2.6 2.6 0 1 0 1.8 2.5V3Z" />
    ),
  },
  Facebook: {
    bg: "#1877F2",
    fg: "#ffffff",
    scale: 0.66,
    path: (
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5H17V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.8v3h2.5V21Z" />
    ),
  },
  X: {
    bg: "#000000",
    fg: "#ffffff",
    scale: 0.5,
    path: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    ),
  },
  Twitter: {
    bg: "#000000",
    fg: "#ffffff",
    scale: 0.5,
    path: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    ),
  },
  Snapchat: {
    bg: "#FFFC00",
    fg: "#000000",
    scale: 0.66,
    path: (
      <path d="M12.166 2c2.86.02 4.83 1.39 5.94 3.83.38.84.47 1.79.43 2.71-.03.59-.11 1.18-.13 1.77 0 .13.05.31.14.39.32.27.7.4 1.12.43.31.02.62-.04.92-.13.16-.05.32-.11.49-.13.36-.04.66.15.71.46.05.29-.09.55-.4.69-.32.14-.66.23-1 .35-.27.09-.55.17-.81.29-.32.15-.39.34-.28.66.59 1.71 1.69 2.95 3.4 3.62.21.08.43.13.65.17.36.07.5.31.34.65-.13.27-.36.41-.62.5-.66.22-1.34.36-2.02.51-.21.05-.32.16-.36.37-.04.21-.1.42-.15.62-.07.27-.25.4-.52.4-.31 0-.62-.06-.93-.06-.59-.01-1.18.04-1.73.27-.39.16-.74.4-1.1.62-.74.46-1.54.71-2.42.7-.86-.01-1.65-.27-2.39-.71-.39-.24-.78-.49-1.2-.66-.6-.24-1.23-.27-1.87-.22-.23.02-.46.05-.69.04-.27-.01-.43-.16-.5-.42-.05-.2-.11-.4-.15-.6-.04-.22-.16-.33-.37-.38-.6-.13-1.2-.27-1.79-.43-.28-.07-.55-.18-.74-.41-.27-.32-.16-.65.24-.76 1.91-.51 3.18-1.78 3.85-3.63.13-.36.08-.51-.26-.69-.34-.18-.71-.29-1.07-.42-.27-.09-.55-.17-.81-.29-.34-.16-.46-.43-.36-.71.1-.27.4-.43.74-.36.31.07.62.19.94.23.4.04.79.02 1.15-.19.27-.16.41-.36.39-.69-.04-.69-.13-1.38-.16-2.07-.12-2.46 1.16-4.6 3.35-5.66.92-.44 1.91-.62 2.93-.62Z" />
    ),
  },
  Reddit: {
    bg: "#FF4500",
    fg: "#ffffff",
    scale: 0.7,
    path: (
      <path d="M22 12.07c0-1.21-.98-2.19-2.19-2.19-.59 0-1.13.24-1.52.62-1.5-1.07-3.56-1.76-5.84-1.84l1-4.69 3.27.7c.04.83.72 1.49 1.56 1.49.86 0 1.56-.7 1.56-1.56S19.14 3 18.28 3c-.61 0-1.14.36-1.4.87l-3.65-.77c-.1-.02-.21 0-.3.05s-.15.13-.17.23l-1.11 5.23c-2.32.06-4.41.75-5.94 1.84-.39-.39-.94-.62-1.53-.62A2.19 2.19 0 0 0 2 12.07c0 .88.52 1.64 1.27 1.99-.03.21-.05.43-.05.65 0 3.27 3.8 5.92 8.49 5.92s8.49-2.65 8.49-5.92c0-.22-.02-.43-.05-.64.73-.36 1.25-1.11 1.25-2Zm-14 1.43a1.56 1.56 0 1 1 3.12 0 1.56 1.56 0 0 1-3.12 0Zm8.74 4.05c-1.07 1.07-3.12 1.15-3.72 1.15s-2.66-.08-3.72-1.15a.39.39 0 0 1 0-.56.39.39 0 0 1 .56 0c.68.68 2.12.92 3.16.92s2.49-.24 3.16-.92a.39.39 0 0 1 .56 0c.16.16.16.41 0 .56Zm-.27-2.49a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12Z" />
    ),
  },
  Pinterest: {
    bg: "#E60023",
    fg: "#ffffff",
    scale: 0.62,
    path: (
      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.93-.2-2.36.04-3.38.22-.92 1.4-5.85 1.4-5.85s-.36-.72-.36-1.78c0-1.66.97-2.91 2.17-2.91 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.19.6 2.16 1.77 2.16 2.13 0 3.76-2.24 3.76-5.48 0-2.86-2.06-4.87-5-4.87-3.41 0-5.41 2.56-5.41 5.2 0 1.03.4 2.13.89 2.73.1.12.11.22.08.34l-.33 1.34c-.05.22-.17.27-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.78 2.74-7.25 7.91-7.25 4.15 0 7.38 2.96 7.38 6.92 0 4.13-2.6 7.45-6.21 7.45-1.21 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0Z" />
    ),
  },
  Threads: {
    bg: "#000000",
    fg: "#ffffff",
    scale: 0.6,
    path: (
      <path d="M17.46 11.13c-.08-.04-.16-.07-.24-.11-.14-2.64-1.59-4.15-4.02-4.16-1.47-.01-2.7.61-3.46 1.75l1.35.93c.56-.85 1.45-1.04 2.1-1.04 0 0 .01 0 .01 0 .82 0 1.43.24 1.83.71.29.34.48.81.58 1.41-.74-.13-1.54-.17-2.4-.12-2.41.14-3.96 1.55-3.86 3.5.05.99.55 1.84 1.39 2.4.71.47 1.62.7 2.57.65 1.26-.07 2.24-.55 2.93-1.43.52-.66.85-1.52 1-2.59.61.37 1.06.86 1.32 1.45.43.99.45 2.61-.88 3.94-1.16 1.16-2.56 1.66-4.68 1.68-2.35-.02-4.13-.77-5.29-2.24-1.08-1.37-1.64-3.35-1.66-5.89.02-2.54.58-4.52 1.66-5.89C7.87 4.84 9.65 4.09 12 4.07c2.37.02 4.18.77 5.39 2.24.59.72 1.04 1.62 1.34 2.67l1.62-.43c-.36-1.29-.93-2.4-1.7-3.34C17.1 3.36 14.85 2.42 12 2.4h-.01c-2.85.02-5.06.96-6.56 2.81C4.1 6.86 3.4 9.15 3.38 12v.01c.02 2.85.72 5.14 2.05 6.79 1.5 1.85 3.71 2.79 6.56 2.81h.01c2.54-.02 4.33-.68 5.8-2.15 1.93-1.92 1.87-4.33 1.24-5.81-.46-1.06-1.32-1.92-2.58-2.52Zm-4.16 4.04c-1.05.06-2.13-.41-2.18-1.42-.04-.75.53-1.58 2.25-1.68.2-.01.39-.02.58-.02.62 0 1.21.06 1.74.18-.2 2.46-1.35 2.88-2.39 2.94Z" />
    ),
  },
  LinkedIn: {
    bg: "#0A66C2",
    fg: "#ffffff",
    image: linkedInIcon.url,
  },
  Telegram: {
    bg: "#229ED9",
    fg: "#ffffff",
    image: telegramIcon.url,
  },
  Moj: {
    bg: "#F50057",
    fg: "#ffffff",
    image: mojIcon.url,
  },
  Josh: {
    bg: "#E11D48",
    fg: "#ffffff",
    image: joshIcon.url,
  },
};

export function BrandIcon({
  name,
  size = 48,
  rounded = "rounded-full",
}: {
  name: string;
  size?: number;
  rounded?: string;
}) {
  const brand = BRANDS[name as BrandName];
  if (!brand) {
    return (
      <div
        className={`${rounded} bg-accent text-primary flex items-center justify-center font-bold shadow-soft`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        {name.slice(0, 1)}
      </div>
    );
  }
  if (brand.image) {
    return (
      <img
        src={brand.image}
        alt={`${name} logo`}
        className={`${rounded} shadow-soft overflow-hidden flex-shrink-0 object-cover`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  const inner = Math.round(size * (brand.scale ?? 0.56));
  return (
    <div
      className={`${rounded} flex items-center justify-center shadow-soft overflow-hidden flex-shrink-0`}
      style={{
        width: size,
        height: size,
        background: brand.gradient ?? brand.bg,
        color: brand.fg,
      }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox={brand.viewBox ?? "0 0 24 24"}
        fill="currentColor"
        style={{ display: "block" }}
      >
        {brand.path}
      </svg>
    </div>
  );
}
