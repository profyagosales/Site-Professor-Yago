import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "md" | "sm";
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00]";

  const variantStyles = {
    primary: "bg-ys-amber text-white hover:brightness-110 shadow-ys-md",
    ghost: "bg-white text-ys-ink hover:bg-ys-bg border border-ys-line",
  } satisfies Record<NonNullable<Props["variant"]>, string>;

  const sizeStyles = {
    md: "px-4 py-2",
    sm: "px-3 py-1.5",
  } satisfies Record<NonNullable<Props["size"]>, string>;

  return (
    <button
      className={`${base} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}

