import * as React from "react";
import { cn } from "@/lib/ui";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600",
  secondary: "bg-white text-slate-700 hover:border-slate-400 border border-slate-300",
  danger: "bg-white text-rose-700 hover:border-rose-400 border border-rose-300",
  ghost: "bg-transparent text-blue-700 hover:text-blue-900",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
