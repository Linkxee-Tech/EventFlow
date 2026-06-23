import * as React from "react"
import { cn } from "@/lib/cn"

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variant === "default" && "border border-transparent bg-indigo-600 text-white hover:bg-indigo-700",
      variant === "secondary" && "border border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",
      variant === "destructive" && "border border-transparent bg-red-500 text-white hover:bg-red-600",
      variant === "outline" && "border border-slate-200 text-slate-950 dark:border-slate-800 dark:text-slate-50",
      className
    )}
    {...props}
  />
))
Badge.displayName = "Badge"

export { Badge }
