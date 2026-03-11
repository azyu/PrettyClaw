"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow,background-color,border-color,filter,transform] outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border/40 disabled:bg-muted/40 disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-primary/70 bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(122,162,255,0.2)] hover:bg-primary/92 hover:shadow-[0_10px_28px_rgba(122,162,255,0.3)]",
        secondary: "border border-border bg-secondary/90 text-secondary-foreground shadow-sm hover:border-ring/40 hover:bg-accent/20 hover:text-foreground",
        ghost: "text-foreground hover:bg-accent/14 hover:text-accent-foreground",
        destructive: "border border-destructive/75 bg-destructive text-destructive-foreground shadow-[0_8px_24px_rgba(239,68,68,0.18)] hover:bg-destructive/92",
        destructiveSubtle: "border border-destructive/35 bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/18 hover:border-destructive/55",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 rounded-md px-3 text-sm",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";

export { Button, buttonVariants };
