import React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/style";

/** Use Switch for immediate on/off settings. For switches/toggles, import and use the local <Switch checked={state} onCheckedChange={setState} />; do not hand-roll a switch with button/span, aria-checked, data-state, or runtime-composed translate classes because missing thumb-position state makes on/off both appear on the left. */
const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border p-px transition-[background-color,border-color,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:hover:bg-primary/90 data-[state=checked]:active:bg-primary/80 data-[state=unchecked]:bg-muted data-[state=unchecked]:hover:bg-accent data-[state=unchecked]:active:bg-accent",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full border border-border bg-primary-foreground ring-0 transition-[transform,background-color,border-color] group-active:bg-muted data-[state=checked]:[transform:translateX(1.25rem)] data-[state=unchecked]:[transform:translateX(0)]" />
  </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
