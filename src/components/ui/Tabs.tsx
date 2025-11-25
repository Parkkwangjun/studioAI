"use client"

import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface TabsProps {
    defaultValue: string
    className?: string
    children: React.ReactNode
}

const TabsContext = React.createContext<{
    value: string
    setValue: (value: string) => void
} | null>(null)

export function Tabs({ defaultValue, className, children }: TabsProps) {
    const [value, setValue] = React.useState(defaultValue)

    return (
        <TabsContext.Provider value={{ value, setValue }}>
            <div className={cn("w-full", className)}>{children}</div>
        </TabsContext.Provider>
    )
}

export function TabsList({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div
            className={cn(
                "inline-flex h-10 items-center justify-center rounded-lg bg-input p-1 text-muted",
                className
            )}
        >
            {children}
        </div>
    )
}

export function TabsTrigger({ value, className, children }: { value: string, className?: string, children: React.ReactNode }) {
    const context = React.useContext(TabsContext)
    if (!context) throw new Error("TabsTrigger must be used within Tabs")

    const isSelected = context.value === value

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isSelected
                    ? "bg-card text-white shadow-sm"
                    : "text-muted hover:text-white hover:bg-white/5",
                className
            )}
            onClick={() => context.setValue(value)}
        >
            {children}
        </button>
    )
}

export function TabsContent({ value, className, children }: { value: string, className?: string, children: React.ReactNode }) {
    const context = React.useContext(TabsContext)
    if (!context) throw new Error("TabsContent must be used within Tabs")

    if (context.value !== value) return null

    return (
        <div
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
        >
            {children}
        </div>
    )
}
