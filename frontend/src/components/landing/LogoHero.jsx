import { useEffect, useMemo, useState } from 'react'

const CATEGORIES = [
  { key: 'grades', label: 'Notas', color: '#32D74B', emoji: '📊' }, // verde limão
  { key: 'essay', label: 'Redação', color: '#FF2D55', emoji: '✍️' }, // rosa
  { key: 'announcements', label: 'Recados', color: '#0A84FF', emoji: '📣' }, // azul royal
  { key: 'answerkeys', label: 'Gabaritos', color: '#5856D6', emoji: '✅' }, // roxo
]

export default function LogoHero() {
  const [idx, setIdx] = useState(0)
  const current = useMemo(() => CATEGORIES[idx], [idx])

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % CATEGORIES.length)
    }, 1600) // tempo de troca
    return () => clearInterval(id)
  }, [])

  // acessibilidade: evitar animação se usuário preferir
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex w-full flex-col items-center gap-8">
      {/* BLOCO translúcido de destaque */}
      <div
        className="relative rounded-3xl px-8 py-6 backdrop-blur-md ring-1 shadow-2xl"
        style={{
          // fundo translúcido e anel suave
          background: 'rgba(255,255,255,0.10)',
          boxShadow: '0 20px 50px rgba(0,0,0,.25)',
          borderColor: 'rgba(255,255,255,.25)',
        }}
      >
        <div className="relative z-10 flex items-center gap-6">
          {/* YS girando e trocando de cor */}
          <div
            className="grid h-20 w-20 place-items-center rounded-2xl font-extrabold tracking-tight"
            style={{
              color: '#fff',
              background: current.color,
              boxShadow: `0 10px 30px ${hexToRGBA(current.color, 0.45)}`,
              transform: 'translateZ(0)',
              animation: prefersReducedMotion ? undefined : 'spin-slow 6s linear infinite',
            }}
            aria-hidden
          >
            <span className="text-3xl">YS</span>
          </div>

          {/* Ícone + texto da categoria (cor sincronizada) */}
          <div className="flex items-center gap-3">
            <span
              className="text-2xl"
              aria-hidden
              style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.2))' }}
            >
              {current.emoji}
            </span>
            <span
              className="text-2xl font-semibold"
              style={{
                color: current.color,
                textShadow: `0 2px 12px ${hexToRGBA(current.color, 0.45)}`,
              }}
              aria-live="polite"
            >
              {current.label}
            </span>
          </div>
        </div>
      </div>

      {/* Título integrado */}
      <h1 className="text-center leading-tight">
        <span className="block text-sm font-semibold tracking-[0.35em] text-white/90">
          {/* Menos espaçado que antes, mas ainda com personalidade */}
          PROFESSOR
        </span>

        {/* Integração visual: “Yago Sales” com gradiente que envolve o branco e a cor atual */}
        <span
          className="block -mt-1 text-5xl font-extrabold"
          style={{
            background: `linear-gradient(90deg, #FFFFFF 0%, ${current.color} 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 10px 30px rgba(0,0,0,.25)',
          }}
        >
          Yago Sales
        </span>
      </h1>
    </div>
  )
}

// util simples para RGBA
function hexToRGBA(hex, a = 1) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

