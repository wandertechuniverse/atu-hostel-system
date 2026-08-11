import { BookOpen, CheckCircle2, Droplets, ShieldCheck, Wifi, Zap } from "lucide-react";

const FACILITY_ICONS: Record<string, typeof Wifi> = {
  "wi-fi": Wifi,
  water: Droplets,
  security: ShieldCheck,
  "power backup": Zap,
  "study rooms": BookOpen,
};

/** Fallback for any facility not in the known set. */
function iconFor(facility: string) {
  const key = facility.toLowerCase();
  for (const [name, Icon] of Object.entries(FACILITY_ICONS)) {
    if (key.includes(name)) return Icon;
  }
  return CheckCircle2;
}

export function FacilityBadges({ facilities }: { facilities: string | null }) {
  const items = (facilities ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((facility) => {
        const Icon = iconFor(facility);
        return (
          <span
            key={facility}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
          >
            <Icon className="size-3.5" aria-hidden />
            {facility}
          </span>
        );
      })}
    </div>
  );
}
