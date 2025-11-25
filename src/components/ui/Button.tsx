import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: "primary" | "secondary" | "ghost" | "outline" | "danger"
    size?: "sm" | "md" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"

        const variants = {
            primary: "bg-primary text-white hover:bg-(--primary-hover) shadow-lg shadow-primary/20",
            secondary: "bg-card text-white border border-border hover:bg-(--bg-hover)",
            ghost: "hover:bg-(--bg-hover) text-gray-300 hover:text-white",
            outline: "border border-border bg-transparent hover:bg-(--bg-hover) text-gray-300 hover:text-white",
            danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
        }

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-4 py-2 text-sm",
            lg: "h-12 px-6 text-base",
            icon: "h-10 w-10",
        }

        return (
            <Comp
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
