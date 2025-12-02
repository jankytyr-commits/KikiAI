import React from 'react';

const NebulaBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#020410]">
      {/* 
         Static Background Image 
         Using a high-quality Unsplash image that matches the "Galaxy/Nebula" aesthetic.
      */}
      <img 
        src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048&auto=format&fit=crop" 
        alt="Cosmic Background" 
        className="w-full h-full object-cover opacity-80"
      />
      
      {/* 
         Vignette Overlay 
         Darkens the edges to frame the content and keep the center legible.
      */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,4,16,0.9)_100%)]"></div>
      
      {/* 
         Subtle Noise Texture 
         Adds a bit of film grain to blend the image with the UI 
      */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>
    </div>
  );
};

export default NebulaBackground;