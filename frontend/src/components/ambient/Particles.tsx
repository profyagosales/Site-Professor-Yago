import React, { useEffect, useRef } from 'react';

export default function Particles({ maxParticles = 12 }:{ maxParticles?:number }){
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if(!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0, w= c.width = window.innerWidth, h= c.height= window.innerHeight;
    const pr = Math.min(maxParticles, window.innerWidth < 768 ? 6 : maxParticles);
    const dots = Array.from({length: pr}).map(()=>({
      x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-0.5)*0.15, vy:(Math.random()-0.5)*0.15
    }));

    const draw = () => {
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = 'rgba(15,23,42,.08)';
      dots.forEach(d=>{
        d.x+=d.vx; d.y+=d.vy;
        if(d.x<0||d.x>w) d.vx*=-1;
        if(d.y<0||d.y>h) d.vy*=-1;
        ctx.beginPath(); ctx.arc(d.x,d.y,1.2,0,Math.PI*2); ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => { w=c.width=window.innerWidth; h=c.height=window.innerHeight; };
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(draw);

    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [maxParticles]);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 -z-[1] opacity-60"
      style={{ filter:'none', mixBlendMode:'normal' }}
      aria-hidden
    />
  );
}
