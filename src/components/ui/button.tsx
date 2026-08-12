import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "secondary" | "outline" | "destructive" | "ghost";

const variants: Record<Variant, string> = {
  default: "bg-emerald-700 text-white hover:bg-emerald-800",
  secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200",
  outline: "border border-stone-300 bg-white hover:bg-stone-50",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  ghost: "hover:bg-stone-100 text-stone-700",
};

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
