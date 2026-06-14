import * as React from "react";

import { cn } from "../../lib/utils";

const Input = React.forwardRef(({ className, type, "aria-invalid": ariaInvalid, ...props }, ref) => {
  return (
    <input
      type={type}
      aria-invalid={ariaInvalid}
      className={cn(
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus-visible:border-red-700 focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]",
        ariaInvalid && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
