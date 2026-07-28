import React from "react";
import { cn } from "@/lib/style";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Multi-line text entry for notes or long input. Do not use it as decorative body text. */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[96px] w-full rounded-[14px] border border-border bg-muted px-4 py-3 text-sm text-foreground ring-offset-background transition-[background-color,border-color,color,opacity] duration-200 ease-out placeholder:text-muted-foreground hover:bg-accent active:bg-accent focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Textarea };
