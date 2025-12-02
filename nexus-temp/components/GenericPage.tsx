import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

interface GenericPageProps {
  title: string;
  subtitle: string;
  code: string;
}

const GenericPage: React.FC<GenericPageProps> = ({ title, subtitle, code }) => {
  const { t } = useLanguage();
  useEffect(() => { window.scrollTo(0, 0); }, [title]);

  return (
    <div className="min-h-screen pt-32 pb-20 relative bg-[#020410]">
        <div className="container mx-auto px-6 max-w-3xl">
            <div className="glass-panel p-12 rounded-[3rem]">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 font-display">{title}</h1>
                        <p className="text-indigo-400 text-xs tracking-widest uppercase font-display">{subtitle}</p>
                    </div>
                    <span className="px-3 py-1 bg-white/5 rounded text-xs text-gray-500 font-mono">{code}</span>
                </div>
                
                <div className="prose prose-invert prose-p:text-gray-300 prose-lg">
                    <p className="font-serif text-xl leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.</p>
                    <p className="font-serif text-xl leading-relaxed">Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.</p>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5">
                    <Link to="/" className="text-xs font-bold uppercase tracking-widest text-white hover:text-indigo-400 transition-colors font-display">
                        ← {t.generic.return}
                    </Link>
                </div>
            </div>
        </div>
    </div>
  );
};

export default GenericPage;