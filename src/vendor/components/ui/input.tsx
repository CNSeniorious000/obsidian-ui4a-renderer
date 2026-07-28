import React from "react";
import { cn } from "@/lib/style";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Single-line text entry. Avoid form-heavy defaults unless the prompt explicitly asks for input. */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-[14px] border border-border bg-muted px-4 py-2 text-sm text-foreground ring-offset-background transition-[background-color,border-color,color,opacity] duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground hover:bg-accent active:bg-accent focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));

Input.displayName = "Input";

export { Input };
