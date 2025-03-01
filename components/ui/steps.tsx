import type * as React from "react"
import { cn } from "@/lib/utils"

interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  currentStep: number
}

export function Steps({ currentStep, className, ...props }: StepsProps) {
  return <div className={cn("flex w-full", className)} {...props} />
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  completed?: boolean
}

export function Step({ title, description, completed, className, ...props }: StepProps) {
  return (
    <div className={cn("flex-1 relative", className)} {...props}>
      <div className="flex items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center z-10",
            completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {completed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <span className="text-sm font-medium"></span>
          )}
        </div>
        <div className="flex-1 h-[2px] bg-muted ml-2"></div>
      </div>
      <div className="mt-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

