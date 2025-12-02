import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { APPS_DATA } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

const AppDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  
  const currentApps = APPS_DATA[language];
  const app = currentApps.find((a) => a.id === id);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!app) return <div className="min-h-screen text-white flex items-center justify-center font-serif text-2xl">404</div>;

  return (
    <div className="min-h-screen pt-24 pb-20 relative overflow-hidden bg-[#020410]">
      
      <div className="container mx-auto px-6 max-w-4xl relative z-10">
        
        {/* Main Glass Container */}
        <div className="glass-panel rounded-[3rem] p-8 md:p-14 relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>

            {/* 1. TEXTOVÝ POPIS (Hlavička) */}
            <div className="relative z-10 flex flex-col items-center text-center mb-12">
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-6 shadow-2xl backdrop-blur-md">
                    {app.icon}
                </div>
                
                {/* Title */}
                <h1 className="text-4xl md:text-6xl text-white mb-6 tracking-tight font-display">
                    {app.name}
                </h1>
                
                {/* Short Description */}
                <p className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8 max-w-2xl font-serif font-medium italic opacity-90">
                    {app.shortDescription}
                </p>

                {/* Launch Button */}
                <a 
                    href={app.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black hover:bg-gray-200 transition-colors font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,255,255,0.3)] font-display"
                >
                    {t.appDetail.launch} ↗
                </a>
            </div>

            {/* 2. OBRÁZEK */}
            <div className="relative z-10 w-full aspect-video rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl mb-12 group">
                <img 
                    src={app.heroImage} 
                    alt={app.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
            </div>

            {/* 3. POUZE POPIS (Dlouhý text) */}
            <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-2xl text-white mb-6 text-center opacity-80 font-display">{t.appDetail.overview}</h2>
                <p className="text-gray-200 leading-loose text-xl text-justify opacity-90 font-serif">
                    {app.fullDescription}
                </p>
            </div>

            {/* Back Link */}
            <div className="mt-16 text-center border-t border-white/5 pt-8">
                 <Link to="/" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-display">
                    ← {t.appDetail.back}
                 </Link>
            </div>

        </div>
      </div>
    </div>
  );
};

export default AppDetail;