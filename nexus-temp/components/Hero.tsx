
import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface Star {
  x: number;
  y: number;
  z: number;
  baseSize: number;
  active: boolean;
  color: string;
  phase: number; // For twinkling
}

const Hero: React.FC = () => {
  const { t } = useLanguage();
  const [textIndex, setTextIndex] = useState(0);
  const phrases = t.hero.typing;
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Typing effect logic
  useEffect(() => {
    // Slight random variation to make it feel more "human" or "mechanical"
    const typeSpeed = isDeleting ? 30 : 80; 
    
    const timeout = setTimeout(() => {
      const fullText = phrases[textIndex % phrases.length];
      if (!isDeleting) {
        setCurrentText(fullText.substring(0, currentText.length + 1));
        if (currentText === fullText) setTimeout(() => setIsDeleting(true), 2500); // Pause at end
      } else {
        setCurrentText(fullText.substring(0, currentText.length - 1));
        if (currentText === "") { setIsDeleting(false); setTextIndex(prev => prev + 1); }
      }
    }, typeSpeed);
    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, textIndex, phrases]);

  // Star Map Animation Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let rotation = 0;
    
    // Config
    const STAR_COUNT = 300; 
    const FOV = 400; // Field of view
    const ROTATION_SPEED = 0.0010; // Slower, more majestic rotation
    const ACTIVE_SYSTEM_CHANCE = 0.08; // Slightly more active nodes for the network

    // Pastel Palette
    const COLORS = [
        '#FCD34D', // Pastel Gold
        '#F472B6', // Pastel Pink
        '#A78BFA', // Pastel Purple
        '#6EE7B7', // Pastel Mint
    ];

    // Initialize Stars
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        const isActive = Math.random() < ACTIVE_SYSTEM_CHANCE;
        const color = isActive 
            ? COLORS[Math.floor(Math.random() * COLORS.length)]
            : '#E2E8F0'; // Off-white for background stars

        stars.push({
            x: (Math.random() - 0.5) * 1200,
            y: (Math.random() - 0.5) * 700,
            z: (Math.random() - 0.5) * 1200,
            baseSize: isActive ? Math.random() * 2 + 2.5 : Math.random() * 1.5 + 0.5,
            active: isActive,
            color: color,
            phase: Math.random() * Math.PI * 2
        });
    }

    const render = () => {
        // Handle Resize
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rotation += ROTATION_SPEED;

        // Project and Sort Stars
        const projectedStars = stars.map(star => {
            // Rotate Y
            const x1 = star.x * Math.cos(rotation) - star.z * Math.sin(rotation);
            const z1 = star.x * Math.sin(rotation) + star.z * Math.cos(rotation);
            
            // Rotate X (Tilt - slight)
            const y2 = star.y * Math.cos(0.1) - z1 * Math.sin(0.1);
            const z2 = star.y * Math.sin(0.1) + z1 * Math.cos(0.1);

            const scale = FOV / (FOV + z2 + 800);
            const x2d = x1 * scale + cx;
            const y2d = y2 * scale + cy;

            return { ...star, x2d, y2d, scale, z: z2 };
        });

        // Sort by Z for depth
        projectedStars.sort((a, b) => b.z - a.z);

        // Draw Connections - Standard network mesh
        ctx.lineWidth = 1; 
        projectedStars.forEach((s1, i) => {
            // Optimization: Only try to connect stars that are relatively close in the array (approx spatial locality due to projection)
            // or just active ones to create structure.
            // Let's connect Active stars to nearby stars to form "constellations"
            if (s1.active && s1.z > -500) { 
                projectedStars.forEach((s2, j) => {
                    if (i === j) return;
                    
                    const dx = s1.x2d - s2.x2d;
                    const dy = s1.y2d - s2.y2d;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    const maxDist = 150 * s1.scale;

                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.2; // Subtle lines
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(s1.x2d, s1.y2d);
                        ctx.lineTo(s2.x2d, s2.y2d);
                        ctx.stroke();
                    }
                });
            }
        });

        // Draw Stars
        projectedStars.forEach(star => {
            if (star.z > -FOV && star.scale > 0) { 
                const size = star.baseSize * star.scale;
                const opacity = Math.min(1, (1 + Math.sin(Date.now() * 0.002 + star.phase)) * 0.2 + 0.4); // Twinkle

                // Draw Active Systems (Glow)
                if (star.active) {
                    const glowRadius = size * 4;
                    const grad = ctx.createRadialGradient(star.x2d, star.y2d, 0, star.x2d, star.y2d, glowRadius);
                    grad.addColorStop(0, star.color);
                    grad.addColorStop(1, 'transparent');
                    
                    ctx.globalCompositeOperation = 'screen';
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(star.x2d, star.y2d, glowRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';

                    // Label
                    if (star.scale > 0.8) {
                         ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                         ctx.font = '10px "Cinzel Decorative"';
                         ctx.fillText(`SYS-${Math.floor(Math.abs(star.x) % 99)}`, star.x2d + 8, star.y2d + 8);
                    }
                }

                // Core Star Body
                ctx.fillStyle = star.active ? '#ffffff' : `rgba(255, 255, 255, ${opacity})`;
                ctx.beginPath();
                ctx.arc(star.x2d, star.y2d, size, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const scrollToApps = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const section = document.getElementById('apps');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start pt-24 overflow-hidden">
      
      {/* 
         CENTRAL ELEMENT: DYNAMIC STAR MAP CANVAS
      */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
         <canvas ref={canvasRef} className="w-full h-full opacity-100" />
      </div>

      {/* TEXT LAYER */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center mt-0">
        
        {/* Main Title - MAGICAL PASTEL NEON STYLE */}
        <h1 className="text-6xl md:text-8xl font-normal mb-8 tracking-widest animate-scale-reveal font-display
                       text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-pink-300 to-amber-100
                       drop-shadow-[0_0_10px_rgba(165,243,252,0.6)] 
                       filter
                       selection:bg-pink-500 selection:text-white"
            style={{ 
                filter: 'drop-shadow(0 0 10px rgba(165,243,252,0.5)) drop-shadow(0 0 25px rgba(249,168,212,0.3))' 
            }}
        >
          KIKI CROSS ROAD
        </h1>
        
        {/* Typing Subtitle */}
        <div className="h-8 mb-12 flex items-center justify-center gap-4">
             <span className="h-[1px] w-20 bg-gradient-to-r from-transparent to-pink-300 rounded-full opacity-60"></span>
             <span className="text-sm md:text-base text-pink-100 font-light tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(244,114,182,0.6)] font-display">
                {currentText}
             </span>
             <span className="h-[1px] w-20 bg-gradient-to-l from-transparent to-pink-300 rounded-full opacity-60"></span>
        </div>

      </div>

      {/* CTA Button - Moved to bottom */}
      <div className="absolute bottom-20 z-20">
        <a 
            href="#apps" 
            onClick={scrollToApps}
            className="group relative px-10 py-4 rounded-full glass-panel hover:bg-white/10 transition-all duration-300 flex items-center gap-3 border border-amber-200/30 hover:border-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.1)]"
        >
            <span className="text-xs font-semibold text-amber-100 tracking-[0.25em] uppercase drop-shadow-md group-hover:text-white transition-colors font-display">
                {t.hero.cta}
            </span>
            <span className="text-amber-200 group-hover:translate-y-1 transition-transform text-xs animate-bounce group-hover:text-white">▼</span>
        </a>
      </div>
    </div>
  );
};

export default Hero;
