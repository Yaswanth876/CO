import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "../../lib/utils";

const Label = React.forwardRef(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-sm font-medium text-red-900 leading-none disabled:cursor-not-allowed disabled:opacity-70", className)}
    {...props}
  >
    {children}
    {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
  </LabelPrimitive.Root>
));

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
