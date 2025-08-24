import React from 'react';

// exemplo de classe base para CTA laranja
const cta =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 " +
  "font-semibold shadow-[0_6px_20px_rgba(255,115,0,.25)] " +
  "bg-[rgb(var(--brand))] text-white " +
  "transition-colors duration-200 " +
  "hover:brightness-[1.05] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--brand))]/40";

export function CtaButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${cta} ${props.className ?? ''}`} />;
}
