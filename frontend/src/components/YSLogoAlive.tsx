import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { YSMark } from './YSMark';

const STATES = [
  { key: 'notas', color: '#84CC16' }, // verde limão
  { key: 'redacao', color: '#EC4899' }, // rosa
  { key: 'recados', color: '#2563EB' }, // azul royal
  { key: 'gabaritos', color: '#7C3AED' }, // roxo
];

export function YSLogoAlive({ showLabel = false }: { showLabel?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % STATES.length), 2200);
    return () => clearInterval(id);
  }, []);
  const c = STATES[i].color;

  return (
    <div className='relative mx-auto w-full max-w-4xl'>
      {/* destaque de fundo com a cor atual (sutil, sem rodar) */}
      <motion.div
        aria-hidden
        className='absolute -inset-x-8 -top-10 h-40 rounded-3xl blur-2xl'
        animate={{
          background: `radial-gradient(600px 120px at 50% 40%, ${c}22, transparent 70%)`,
        }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className='ys-glass ys-logo-alive relative mx-auto flex items-center justify-center py-10 md:py-14'
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <motion.div
          key={c}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <YSMark color={c} size={150} />
          </motion.div>
        </motion.div>
      </motion.div>

      {showLabel && (
        <motion.div
          className='text-center mt-3 text-sm text-white/70'
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          YS • estado #{i + 1}
        </motion.div>
      )}
    </div>
  );
}
