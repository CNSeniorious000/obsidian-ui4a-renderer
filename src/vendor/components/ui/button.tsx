import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/style";

const buttonVariants = cva("demo-motion-ease inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium transition-[background-color,color,border-color,filter,opacity,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
      outline: "border border-border bg-background text-foreground hover:bg-accent active:bg-accent",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
      tertiary: "border border-border bg-muted text-foreground hover:bg-accent active:bg-accent",
      ghost: "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent",
      link: "text-primary underline-offset-4 hover:underline",
      primary: ["bg-primary", "text-primary-foreground", "rounded-full", "hover:brightness-105 active:brightness-95"],
      macaron: ["bg-primary", "text-primary-foreground", "rounded-full", "hover:brightness-105 active:brightness-95"],
      "macaron-new": ["bg-primary", "text-primary-foreground", "px-4 md:px-5", "rounded-full", "hover:brightness-105 active:brightness-95"],
    },
    disabled: {
      true: ["pointer-events-none", "bg-muted", "text-muted-foreground", "rounded-full", "shadow-none", "cursor-not-allowed"],
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-full px-3 text-sm",
      lg: "h-11 rounded-full px-8 text-base",
      xl: "h-14 rounded-full px-10 text-base",
      icon: "h-10 w-10 rounded-full",
    },
    full: {
      true: "w-full",
    },
  },
  compoundVariants: [{ variant: "macaron-new", disabled: true, className: "bg-primary border-none opacity-20" }],
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  full?: boolean;
  disabled?: boolean;
}

/**
 * Command control for explicit user actions. Set size/variant deliberately; do not leave primary CTAs on defaults when the surrounding surface has a custom visual system.
 * @param full Expands to the full available width, useful for stacked mobile actions.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, full, size, asChild = false, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className, full, disabled }))} ref={ref} disabled={disabled} {...props} />;
});

Button.displayName = "Button";

export { Button, buttonVariants };
