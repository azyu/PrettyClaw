"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-8 w-14 shrink-0 cursor-pointer touch-manipulation items-center rounded-full border border-border/60 bg-muted/90 shadow-xs transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary/85 data-[state=checked]:border-primary/75",
        className,
      )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-6 w-6 rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1",
      )}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
