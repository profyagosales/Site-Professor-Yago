import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const styles = {
    primary:
      "bg-ys-amber text-white hover:brightness-110 focus-visible:ring-ys-amber focus-visible:ring-offset-white px-4 py-2 shadow-ys-md",
    ghost:
      "bg-white text-ys-ink hover:bg-ys-bg border border-ys-line px-4 py-2",
    outline:
      "bg-white text-ys-ink hover:bg-ys-bg border border-ys-line px-4 py-2",
  }[variant];

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}