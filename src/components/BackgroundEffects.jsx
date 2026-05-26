import { useEffect, useRef } from 'react';
import { useSettings } from '../settingsStore.js';

const potOfGoldSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="20" r="8" fill="%23FFD700" stroke="%23DAA520" stroke-width="2"/><circle cx="22" cy="24" r="8" fill="%23FFD700" stroke="%23DAA520" stroke-width="2"/><circle cx="42" cy="24" r="8" fill="%23FFD700" stroke="%23DAA520" stroke-width="2"/><circle cx="28" cy="16" r="8" fill="%23FFD700" stroke="%23DAA520" stroke-width="2"/><circle cx="38" cy="18" r="8" fill="%23FFD700" stroke="%23DAA520" stroke-width="2"/><circle cx="16" cy="28" r="8" fill="%23FFD700" stroke="%23DAA520" stroke-width="2"/><circle cx="48" cy="28" r="8" fill="%23FFD700" stroke="%23DAA520" stroke-width="2"/><path d="M 12 30 C 4 60, 60 60, 52 30 Z" fill="%232C2C2C"/><ellipse cx="32" cy="30" rx="22" ry="6" fill="%231A1A1A" /><ellipse cx="32" cy="29" rx="18" ry="4" fill="%23FFD700" /></svg>`;
const potImg = new Image();
potImg.src = potOfGoldSvg;

const pumpkinSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><path d="M 32 18 C 30 10, 24 6, 24 6 C 26 12, 34 16, 34 18 Z" fill="%232E8B57"/><ellipse cx="18" cy="36" rx="14" ry="20" fill="%23E65C00" stroke="%23CC5200" stroke-width="1.5"/><ellipse cx="46" cy="36" rx="14" ry="20" fill="%23E65C00" stroke="%23CC5200" stroke-width="1.5"/><ellipse cx="24" cy="38" rx="14" ry="22" fill="%23FF7518" stroke="%23E65C00" stroke-width="1.5"/><ellipse cx="40" cy="38" rx="14" ry="22" fill="%23FF7518" stroke="%23E65C00" stroke-width="1.5"/><ellipse cx="32" cy="40" rx="14" ry="24" fill="%23FF8C00" stroke="%23FF7518" stroke-width="1"/><polygon points="22,36 28,36 25,30" fill="%232A0800"/><polygon points="36,36 42,36 39,30" fill="%232A0800"/><polygon points="22,44 42,44 38,50 32,46 26,50" fill="%232A0800"/></svg>`;
const pumpkinImg = new Image();
pumpkinImg.src = pumpkinSvg;

const snowflakeSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64" width="64" height="64"><defs><g id="b"><line x1="0" y1="0" x2="0" y2="-28" stroke="white" stroke-width="5" stroke-linecap="round"/><line x1="0" y1="-16" x2="-8" y2="-24" stroke="white" stroke-width="5" stroke-linecap="round"/><line x1="0" y1="-16" x2="8" y2="-24" stroke="white" stroke-width="5" stroke-linecap="round"/></g></defs><use href="%23b" transform="rotate(0)"/><use href="%23b" transform="rotate(60)"/><use href="%23b" transform="rotate(120)"/><use href="%23b" transform="rotate(180)"/><use href="%23b" transform="rotate(240)"/><use href="%23b" transform="rotate(300)"/><circle cx="0" cy="0" r="4" fill="white"/></svg>`;
const snowflakeImg = new Image();
snowflakeImg.src = snowflakeSvg;

export default function BackgroundEffects() {
  const canvasRef = useRef(null);
  const { settings } = useSettings();
  const theme = settings.theme || 'theme-classic';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    let particles = [];
    let time = 0;

    // Initialize state based on theme
    const countMap = {
      'theme-classic': 60, // Embers
      'theme-christmas': 150, // Snow
      'theme-halloween': 40, // Fog orbs
      'theme-stpatricks': 80, // Gold dust
      'theme-july4th': 100, // Sparks
      'theme-thanksgiving': 50, // Leaves
      'theme-dark': 150, // Stars
      'theme-blue': 80, // Stars
      'theme-cyberpunk': 0, // Handled by grid
      'theme-matrix': 100 // Raindrops
    };

    const count = countMap[theme] || 0;
    
    for (let i = 0; i < count; i++) {
      let p = {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        alpha: Math.random() * 0.8 + 0.1,
        life: Math.random() * 100,
        colorType: Math.random() // Used for multi-color themes
      };
      
      if (theme === 'theme-matrix') {
        p.fontSize = Math.random() * 12 + 10; // 10 to 22px
        p.x = Math.floor(Math.random() * width / p.fontSize) * p.fontSize;
        p.vy = p.fontSize * (0.15 + Math.random() * 0.15); // Fall speed
      }
      
      particles.push(p);
    }

    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      if (theme === 'theme-cyberpunk') {
        ctx.strokeStyle = 'rgba(224, 64, 251, 0.1)';
        ctx.lineWidth = 1.5;
        const gridSize = 50;
        const offset = (time * 30) % gridSize;
        
        ctx.beginPath();
        for (let x = 0; x < width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = offset; y < height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      } 
      else if (count > 0) {
        particles.forEach(p => {
          let fillStyle = '';
          
          if (theme === 'theme-classic') {
            // Rising embers
            p.y -= Math.abs(p.vy) + 0.5;
            p.x += Math.sin(time + p.life) * 0.5;
            if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
            fillStyle = `rgba(255, ${100 + p.colorType * 100}, 50, ${p.alpha})`;
          }
          else if (theme === 'theme-christmas') {
            // Realistic falling snowflakes
            const depth = p.radius / 4; 
            const size = p.radius * 6 + 12; // 18 to 36px
            
            p.y += (Math.abs(p.vy) + 0.5) * depth * 2; 
            p.x += Math.sin(time * 0.8 + p.life) * depth;
            
            if (p.y > height + size) { p.y = -size; p.x = Math.random() * width; }
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(time * 0.5 * (p.life % 2 === 0 ? 1 : -1) + p.life); // Gentle spin
            ctx.globalAlpha = p.alpha * depth * 1.5;
            
            if (snowflakeImg.complete && snowflakeImg.naturalWidth > 0) {
                ctx.drawImage(snowflakeImg, -size/2, -size/2, size, size);
            }
            
            ctx.restore();
            return;
          }
          else if (theme === 'theme-halloween') {
            // Falling pumpkins
            const size = p.radius * 4 + 18; // 22 to 34px
             
            p.y += (Math.abs(p.vy) + 1.0) * (size * 0.08); 
            p.x += Math.sin(time * 1.5 + p.life) * 1.5; 
            
            if (p.y > height + size) {
                p.y = -size;
                p.x = Math.random() * width;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(time * 2 + p.life) * 0.15);
            ctx.globalAlpha = p.alpha;
            
            if (pumpkinImg.complete && pumpkinImg.naturalWidth > 0) {
                ctx.drawImage(pumpkinImg, -size/2, -size/2, size, size);
            }

            ctx.restore();
            return;
          }
          else if (theme === 'theme-stpatricks') {
             // Falling pots of gold
             const size = p.radius * 4 + 18; // Pot size (22 to 34px)
             
             // Falling physics with gentle sway
             p.y += (Math.abs(p.vy) + 1.0) * (size * 0.08); 
             p.x += Math.sin(time * 1.5 + p.life) * 1.5; 
             
             if (p.y > height + size) {
                 p.y = -size;
                 p.x = Math.random() * width;
             }

             ctx.save();
             ctx.translate(p.x, p.y);
             // Slight rocking motion as they fall
             ctx.rotate(Math.sin(time * 2 + p.life) * 0.15);
             ctx.globalAlpha = p.alpha;
             
             // Draw the SVG image
             if (potImg.complete && potImg.naturalWidth > 0) {
                 ctx.drawImage(potImg, -size/2, -size/2, size, size);
             }

             ctx.restore();
             return;
          }
          else if (theme === 'theme-matrix') {
             // Matrix digital rain
             p.y += p.vy;
             if (p.y > height + p.fontSize * 6) {
                 p.y = -p.fontSize * 6;
                 p.x = Math.floor(Math.random() * width / p.fontSize) * p.fontSize;
             }
             
             ctx.font = `bold ${p.fontSize}px monospace`;
             ctx.textAlign = 'center';
             
             const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
             if (Math.random() < 0.1 || !p.char) p.char = chars[Math.floor(Math.random() * chars.length)];
             
             // Draw trailing characters
             for (let j = 0; j < 6; j++) {
                 if (j === 0) {
                     ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`; // White leading character
                 } else {
                     ctx.fillStyle = `rgba(0, 255, 65, ${p.alpha * (1 - j/6)})`; // Fading green trail
                 }
                 const charToDraw = j === 0 ? p.char : chars[Math.floor(Math.random() * chars.length)];
                 ctx.fillText(charToDraw, p.x, p.y - j * p.fontSize);
             }
             return;
          }
          else if (theme === 'theme-july4th') {
            // Synchronized firework bursts
            if (!p.fireworkInit) {
               p.fireworkInit = true;
               p.burstGroup = Math.floor(Math.random() * 15); // 15 simultaneous bursts
               p.angle = Math.random() * Math.PI * 2;
               p.speed = Math.random() * 6 + 2;
            }
            
            const burstDuration = 1.8; // Seconds
            const cycleTime = (time + p.burstGroup * 0.15) % burstDuration;
            
            // Explode when a new cycle starts
            if (cycleTime < 0.02) {
               const cycleIndex = Math.floor((time + p.burstGroup * 0.15) / burstDuration);
               p.ox = Math.abs(Math.sin(p.burstGroup * 13 + cycleIndex * 7)) * width;
               p.oy = Math.abs(Math.cos(p.burstGroup * 17 + cycleIndex * 11)) * (height * 0.6); // Top 60%
               p.x = p.ox;
               p.y = p.oy;
               p.vx = Math.cos(p.angle) * p.speed;
               p.vy = Math.sin(p.angle) * p.speed;
            }
            
            // Physics
            p.vy += 0.04; // Gravity
            p.vx *= 0.97; // Drag
            p.vy *= 0.97;
            p.x += p.vx;
            p.y += p.vy;
            
            const alpha = Math.max(0, 1 - (cycleTime / (burstDuration * 0.7)));
            const rwb = p.colorType < 0.33 ? '255, 50, 50' : p.colorType < 0.66 ? '255, 255, 255' : '50, 100, 255';
            fillStyle = `rgba(${rwb}, ${alpha * p.alpha * 1.5})`;
          }
          else if (theme === 'theme-thanksgiving') {
            // Realistic falling autumn leaves
            const leafSize = p.radius * 3 + 6; // Scale up from the tiny default radius (9 to 18px)
            
            // Physics: sway and fall
            p.y += Math.abs(p.vy) * 0.5 + 1.0 + (leafSize * 0.05); // Larger leaves fall slightly faster
            p.x += Math.sin(time * 1.2 + p.life) * 1.5; // Natural swaying
            if (p.y > height + leafSize) { p.y = -leafSize; p.x = Math.random() * width; }
            
            // Colors: rich autumn palette
            const colors = ['191, 87, 0', '240, 165, 0', '139, 69, 19', '178, 34, 34']; // Orange, Gold, SaddleBrown, Firebrick
            const leafColor = colors[Math.floor(p.colorType * colors.length)];
            
            ctx.save();
            ctx.translate(p.x, p.y);
            // Simulate 3D tumbling by scaling and rotating
            const flip = Math.sin(time * 2 + p.life); 
            ctx.scale(flip, 1);
            ctx.rotate(Math.sin(time * 0.5 + p.life) * 0.5 + p.life);
            
            // Draw a beautiful pointed leaf shape using bezier curves
            ctx.beginPath();
            ctx.moveTo(0, -leafSize); // Tip
            ctx.quadraticCurveTo(leafSize * 0.7, 0, 0, leafSize); // Right side
            ctx.quadraticCurveTo(-leafSize * 0.7, 0, 0, -leafSize); // Left side
            
            ctx.fillStyle = `rgba(${leafColor}, ${p.alpha * 1.5})`;
            ctx.fill();
            ctx.restore();
            return; // Skip the default arc/ellipse draw below
          }
          else {
            // Default dark/blue stars
            p.x += p.vx * 0.2;
            p.y += p.vy * 0.2;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
            const color = theme === 'theme-dark' ? '255, 255, 255' : '150, 200, 255';
            const currentAlpha = Math.max(0, p.alpha + Math.sin(time * 2 + p.x) * 0.3);
            fillStyle = `rgba(${color}, ${currentAlpha})`;
          }

          ctx.beginPath();
          if (theme === 'theme-thanksgiving') {
            // Draw oval/leaf shape
            ctx.ellipse(p.x, p.y, Math.max(1, p.currentRadius || p.radius), p.radius, Math.sin(time + p.life), 0, Math.PI * 2);
          } else {
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          }
          ctx.fillStyle = fillStyle;
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
        opacity: 0.8
      }}
    />
  );
}
