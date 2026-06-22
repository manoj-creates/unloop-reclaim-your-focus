import logoImage from "../assets/unloop-logo.png";

export const UNLOOP_LOGO_URL = logoImage;

export function UnloopMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={UNLOOP_LOGO_URL}
      width={size}
      height={size}
      alt="Unloop"
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
      draggable={false}
    />
  );
}

export function UnloopWordmark({
  size = 32,
  className = "",
  tone = "dark",
}: {
  size?: number;
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} style={{ height: size }}>
      <UnloopMark size={size} />
      <span
        className="font-bold tracking-tight leading-none"
        style={{
          fontSize: size * 0.7,
          color: tone === "dark" ? "var(--foreground)" : "#ffffff",
          letterSpacing: "-0.04em",
        }}
      >
        unloop
      </span>
    </div>
  );
}
