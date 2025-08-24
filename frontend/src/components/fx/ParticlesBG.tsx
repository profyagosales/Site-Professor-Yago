import React, { useEffect, useRef } from 'react';

export default function ParticlesBG(){
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const particles = Array.from({length: 70}).map(()=>({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random()*1.8,
      s: 0.12 + Math.random()*0.35,
      a: 0.08 + Math.random()*0.22,
      dx: (Math.random()-.5)*0.0008, dy: (Math.random()-.5)*0.0006,
    }));

    const resize = () => {
      canvas.width = innerWidth * DPR;
      canvas.height = innerHeight * DPR;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0,0,canvas.width, canvas.height);
      particles.forEach(p=>{
        p.x += p.dx; p.y += p.dy;
        if(p.x< -0.05) p.x=1.05; if(p.x>1.05) p.x=-0.05;
        if(p.y< -0.05) p.y=1.05; if(p.y>1.05) p.y=-0.05;
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        const g = ctx.createRadialGradient(x,y,0,x,y,p.r*8*DPR);
        g.addColorStop(0, `rgba(255,255,255,${p.a})`);
        g.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x,y,p.r*6*DPR,0,Math.PI*2);
        ctx.fill();
      });
    };
    loop();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className="particles-layer" aria-hidden/>;
}

