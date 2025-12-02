
import React from 'react';
import { Link } from 'react-router-dom';
import { AppData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AppCardProps {
  app: AppData;
  index: number;
}

const AppCard: React.FC<AppCardProps> = ({ app, index }) => {
  const { t } = useLanguage();

  const getDelayClass = (idx: number) => {
      const ms = idx * 150;
      if (ms === 0) return 'delay-0';
      if (ms <= 150) return 'delay-150';
      if (ms <= 300) return 'delay-300';
      if (ms <= 450) return 'delay-450';
      if (ms <= 600) return 'delay-600';
      return 'delay-600';
  };

  return (
    <Link
      to={`/app/${app.id}`}
      className={`group relative block w-full h-[480px] ${getDelayClass(index)} animate-fadeIn`}
    >
      <div className="
        relative w-full h-full rounded-[2rem] overflow-hidden
        glass-card bg-white/5
        border border-white/20
        transition-all duration-500 ease-out
        group-hover:scale-[1.02] group-hover:shadow-[0_10px_50px_rgba(255,255,255,0.15)]
        group-hover:border-white/40 group-hover:bg-white/10
      ">
        
        {/* Background Image - Bright and Colorful */}
        <div className="absolute inset-0">
             <img 
                src={app.heroImage} 
                alt="" 
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700" 
             />
             {/* Gradient for text readability, but lighter at top */}
             <div className="absolute inset-0 bg-gradient-to-t from-[#020410] via-[#020410]/50 to-transparent"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 h-full p-8 flex flex-col justify-end items-start">
          
          {/* Icon */}
          <div className="mb-auto p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md group-hover:bg-white/20 transition-colors shadow-lg">
            <span className="text-3xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                {app.icon}
            </span>
          </div>

          <h3 
            className="text-3xl text-white mb-3 drop-shadow-md group-hover:translate-x-1 transition-transform duration-300 font-display"
            style={{ fontFamily: "'Cinzel Decorative', cursive" }}
          >
            {app.name}
          </h3>

          <p className="text-gray-100 text-lg leading-relaxed mb-6 line-clamp-3 group-hover:text-white transition-colors font-serif font-medium text-shadow-sm">
            {app.shortDescription}
          </p>

          <div className="w-full h-[1px] bg-white/30 mb-6 group-hover:bg-white/50 transition-colors"></div>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white group-hover:text-cyan-200 transition-colors drop-shadow-sm font-display">
             {t.appCard.enter} 
             <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AppCard;
