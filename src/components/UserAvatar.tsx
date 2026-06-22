import { useState } from "react";

/**
 * Real avatar with graceful initials fallback. No mock URLs.
 */
export function UserAvatar({
  src,
  name,
  initials,
  size = 44,
  className = "",
}: {
  src?: string;
  name?: string;
  initials: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;
  return (
    <div
      className={`rounded-full bg-gradient-flame text-white font-semibold flex items-center justify-center shadow-soft ring-2 ring-card overflow-hidden ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-label={name ?? "Avatar"}
    >
      {showImg ? (
        <img
          src={src}
          alt={name ?? ""}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
