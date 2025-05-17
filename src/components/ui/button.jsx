import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-blue-600 text-white hover:bg-blue-700 border-0": variant === "default",
          "bg-red-600 text-white hover:bg-red-700 border-0": variant === "destructive",
          "border-2 border-blue-300 bg-white text-blue-800 hover:bg-blue-50": variant === "outline",
          "bg-gray-800 text-white hover:bg-gray-900 border-0": variant === "secondary",
          "bg-blue-100 text-blue-800 hover:bg-blue-200 border-0": variant === "accent",
          "bg-transparent text-blue-800 hover:bg-blue-100": variant === "ghost",
          "bg-transparent text-blue-600 underline-offset-4 hover:underline": variant === "link",
          "h-10 px-4 py-2 text-base": size === "default",
          "h-9 rounded-md px-3 text-sm": size === "sm",
          "h-12 rounded-md px-8 text-lg": size === "lg",
          "h-9 w-9": size === "icon",
        },
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button } 