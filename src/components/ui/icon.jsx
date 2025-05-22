import * as React from "react"
import { Icons } from "./icons"
import { cn } from "../../lib/utils"

const Icon = React.forwardRef(({ 
  name, 
  className, 
  size = "default",
  variant = "default",
  ...props 
}, ref) => {
  const IconComponent = Icons[name]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`)
    return null
  }

  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8"
  }

  const variantClasses = {
    default: "text-gray-600 dark:text-gray-400",
    primary: "text-blue-600 dark:text-blue-400",
    secondary: "text-gray-500 dark:text-gray-500",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
    muted: "text-gray-400 dark:text-gray-600"
  }

  return (
    <IconComponent
      ref={ref}
      className={cn(
        "transition-colors duration-200",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})

Icon.displayName = "Icon"

export { Icon } 