import React, { useEffect, useRef } from 'react';

export default function ParticlesBG(){
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    // Sinais de capacidade do dispositivo
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mem = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;

    // Degrada automaticamente
    const BASE = reduce ? 0 : 52;                       // partículas base
    const particlesCount = Math.max(0, BASE - (8 - Math.min(mem,8)) * 3);
    const DPR = reduce ? 1 : Math.min(1.25, window.devicePixelRatio || 1); // DPR capado

    // Se estiver muito fraco, nem renderiza
    if (particlesCount === 0){ return; }

    let raf = 0;
    const particles = Array.from({length: particlesCount}).map(()=>({
      x: Math.random(), y: Math.random(),
      r: 0.5 + Math.random()*1.4,
      a: 0.06 + Math.random()*0.16,
      dx: (Math.random()-.5)*0.0006,
      dy: (Math.random()-.5)*0.0005,
    }));

    const resize = () => {
      canvas.width  = innerWidth  * DPR;
      canvas.height = innerHeight * DPR;
      canvas.style.width  = innerWidth  + 'px';
      canvas.style.height = innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const targetMs = (cores <= 4 || mem <= 4) ? 1000/36 : 1000/48; // 36–48 fps

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < targetMs) return; // throttling de FPS
      last = now;

      ctx.clearRect(0,0,canvas.width, canvas.height);
      for (const p of particles){
        p.x += p.dx; p.y += p.dy;
        if(p.x < -0.05) p.x = 1.05; if(p.x > 1.05) p.x = -0.05;
        if(p.y < -0.05) p.y = 1.05; if(p.y > 1.05) p.y = -0.05;

        const x = p.x * canvas.width, y = p.y * canvas.height;
        const g = ctx.createRadialGradient(x,y,0,x,y,p.r*7*DPR);
        g.addColorStop(0, `rgba(255,255,255,${p.a})`);
        g.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x,y,p.r*5*DPR,0,Math.PI*2); ctx.fill();
      }
    };

    // Pausa quando a aba não está visível (economia)
    const vis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else { last = performance.now(); raf = requestAnimationFrame(loop); }
    };
    document.addEventListener('visibilitychange', vis);

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis); };
  }, []);

  return <canvas ref={ref} className="particles-layer" aria-hidden/>;
}

