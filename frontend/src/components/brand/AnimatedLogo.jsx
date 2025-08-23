import { useEffect, useMemo, useState } from "react";

const items = [
  {
    key: "notas",
    label: "Notas",
    color: "#30D158", // verde-limão
    Icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 4h10a2 2 0 0 1 2 2v13l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2zM9 8h6v2H9V8zm0 4h6v2H9v-2z"/>
      </svg>
    ),
  },
  {
    key: "redacao",
    label: "Redação",
    color: "#FF2D55", // rosa
    Icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm12 0v4h4"/>
        <path d="M7 13h10v2H7zM7 9h6v2H7z"/>
      </svg>
    ),
  },
  {
    key: "recados",
    label: "Recados",
    color: "#0A84FF", // azul royal
    Icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21 6a2 2 0 0 0-2-2H5C3.9 4 3 4.9 3 6v9a2 2 0 0 0 2 2h11l4 3V6z"/>
      </svg>
    ),
  },
  {
    key: "gabaritos",
    label: "Gabaritos",
    color: "#6E44FF", // roxo
    Icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 11l3 3L22 4l-2-2-8 8-3-3-2 2zm-6 9h18v-2H3v2z"/>
      </svg>
    ),
  },
];

export default function AnimatedLogo() {
  const [idx, setIdx] = useState(0);
  const current = useMemo(() => items[idx], [idx]);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ys-hero" role="img" aria-label={`YS ${current.label}`}>
      <div className="ys-icon">
        <span>YS</span>
      </div>

      <div className="ys-label" style={{ color: current.color }}>
        <current.Icon />
        <span>{current.label}</span>
      </div>
    </div>
  );
}
