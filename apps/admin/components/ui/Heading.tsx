import * as React from "react";

import { cn } from "@/lib/cn";

function PageHeading({
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-3xl font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export { PageHeading };
