import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, type HTMLAttributes, forwardRef } from "react";

export function GlassPanel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const GlassButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
>(function GlassButton({ className, variant = "primary", children, ...props }, ref) {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400/30",
    ghost: "bg-white/5 hover:bg-white/10 text-zinc-100 border-white/10",
    danger: "bg-red-600/80 hover:bg-red-500/90 text-white border-red-400/30",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export function GlassInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 backdrop-blur-md outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20",
        className
      )}
      {...props}
    />
  );
}

export function GlassTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 backdrop-blur-md outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 min-h-[120px]",
        className
      )}
      {...props}
    />
  );
}

export function GlassBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-zinc-200",
        className
      )}
    >
      {children}
    </span>
  );
}
