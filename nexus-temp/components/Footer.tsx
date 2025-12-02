
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="relative z-10 pt-20 pb-10 border-t border-white/5 bg-[#020410]">
      <div className="container mx-auto px-6 text-center">
        <h2 className="font-bold text-2xl text-white mb-8 tracking-widest opacity-80 font-display">KIKI CROSS ROAD</h2>
        
        <div className="flex justify-center gap-8 mb-12">
            <Link to="/status" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-display">{t.footer.links.status}</Link>
            <Link to="/privacy" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-display">{t.footer.links.privacy}</Link>
            <Link to="/contact" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-display">{t.footer.links.contact}</Link>
        </div>

        <div className="text-[10px] text-gray-700 font-serif">
             © 2077 // SYSTEM_SECURE
        </div>
      </div>
    </footer>
  );
};

export default Footer;
