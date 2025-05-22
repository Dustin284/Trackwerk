import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "../../lib/utils"
import { Icon } from "./icon"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur-xl p-1.5 shadow-lg border border-gray-200/40",
      "dark:bg-gray-900/95 dark:border-gray-700/40",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 ease-in-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg",
      "data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600",
      "data-[state=inactive]:hover:bg-gray-100 data-[state=inactive]:hover:text-gray-900",
      "dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900",
      "dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:hover:bg-gray-800 dark:data-[state=inactive]:hover:text-white",
      "[&>svg]:w-4 [&>svg]:h-4",
      "data-[state=active]:[&>svg]:text-blue-400",
      "data-[state=inactive]:[&>svg]:text-gray-500",
      "dark:data-[state=active]:[&>svg]:text-blue-500",
      "dark:data-[state=inactive]:[&>svg]:text-gray-500",
      "hover:[&>svg]:text-blue-500",
      "dark:hover:[&>svg]:text-blue-400",
      className
    )}
    {...props}
  >
    {icon && <Icon name={icon} className="w-4 h-4" />}
    {children}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-all",
      "data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2",
      "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-50 data-[state=inactive]:slide-out-to-bottom-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent } 