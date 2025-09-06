import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`block w-full px-3 py-2 border border-ys-line rounded-lg bg-white text-ys-ink placeholder-ys-ink-2 focus:outline-none focus:ring-2 focus:ring-ys-primary focus:border-transparent resize-vertical ${className}`}
      {...props}
    />
  );
}
