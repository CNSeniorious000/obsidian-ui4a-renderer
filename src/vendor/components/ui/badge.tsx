import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/style";

const badgeVariants = cva("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.02em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
  variants: {
    variant: {
      default: "border-transparent bg-muted text-foreground hover:bg-accent",
      secondary: "border-transparent bg-muted text-muted-foreground hover:bg-accent",
      destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      outline: "border-border bg-card text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
const BADGE_TONE_CLASS = {
  green: "border-[#D7E8A4] bg-[#F6FAE8] text-[#62751F]",
  blue: "border-[#BFD7FF] bg-[#EEF5FF] text-[#2457A6]",
  orange: "border-[#FFD8B8] bg-[#FFF3EA] text-[#B45418]",
  red: "border-[#FFC9C9] bg-[#FFF0F0] text-[#B3261E]",
  purple: "border-[#D8CCFF] bg-[#F5F1FF] text-[#6046A8]",
  muted: "border-border bg-muted text-muted-foreground",
} as const;
type BadgeTone = keyof typeof BADGE_TONE_CLASS;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  tone?: BadgeTone;
}

/**
 * Compact status or metadata chip. Avoid using badges as the first visible block unless the prompt asks for filters, taxonomy, or state labels.
 * @param tone Semantic color shortcut for status labels; prefer tone over ad hoc color classes for common success/info/warning/error chips.
 */
function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return <div data-slot="badge" className={cn(badgeVariants({ variant }), tone ? BADGE_TONE_CLASS[tone] : "", className)} {...props} />;
}

export { Badge, badgeVariants };
