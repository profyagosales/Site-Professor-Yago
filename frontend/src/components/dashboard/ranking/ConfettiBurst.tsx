import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#fbbf24', '#38bdf8', '#f472b6', '#34d399', '#f97316', '#a78bfa'];

interface ConfettiBurstProps {
  seed: number;
  duration?: number;
}

export default memo(function ConfettiBurst({ seed, duration = 0.7 }: ConfettiBurstProps) {
  const pieces = useMemo(() => {
    const random = mulberry32(seed);
    const count = 18;
    return Array.from({ length: count }).map((_, index) => {
      const angle = random() * Math.PI * 2;
      const distance = 80 + random() * 80;
      const tilt = (random() - 0.5) * 140;
      const color = COLORS[index % COLORS.length];
      return {
        id: index,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 40,
        color,
        rotate: tilt,
        delay: random() * 0.12,
        scale: 0.7 + random() * 0.6,
      };
    });
  }, [seed]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 0],
            x: piece.x,
            y: piece.y,
            rotate: piece.rotate,
            scale: piece.scale,
          }}
          transition={{ duration, ease: 'easeOut', delay: piece.delay }}
          className="absolute left-1/2 top-16 block h-2 w-1.5 rounded-full"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
});

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
