import { cn } from "@/lib/utils";
import type { ReactNode, ElementType } from "react";

export function Container({
  children,
  className,
  as,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const Comp: ElementType = as ?? "div";
  return (
    <Comp className={cn("mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8", className)}>
      {children}
    </Comp>
  );
}
