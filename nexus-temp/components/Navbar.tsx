
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { Language } from '../types';

const Navbar: React.FC = () => {
    const location = useLocation();
    const { language, setLanguage, t } = useLanguage();
    const { user, logout, isAuthenticated } = useAuth();
    const [langOpen, setLangOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);

    const isHome = location.pathname === '/';
    const languages: { code: Language; label: string }[] = [
        { code: 'cs', label: 'CZ' },
        { code: 'en', label: 'EN' },
        { code: 'de', label: 'DE' },
        { code: 'es', label: 'ES' },
    ];

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 pt-6 px-6 pointer-events-none">
                <div className="w-full max-w-7xl mx-auto flex items-start justify-between">

                    {/* Left Side: Back Button (Only on Inner Pages) */}
                    <div className="pointer-events-auto">
                        {isHome ? (
                            /* Invisible Spacer */
                            <div className="w-10 h-10 opacity-0" />
                        ) : (
                            <Link
                                to="/"
                                className="flex items-center gap-3 group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 transition-transform group-hover:scale-110">
                                    {/* Back Arrow */}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" />
                                    </svg>
                                </div>

                                <span className="font-bold text-sm tracking-widest text-white/90 group-hover:text-white transition-colors uppercase shadow-black drop-shadow-md">
                                    {t.nav.back}
                                </span>
                            </Link>
                        )}
                    </div>

                    {/* Right Side: Auth & Language */}
                    <div className="pointer-events-auto flex items-center gap-4">

                        {/* Auth Button */}
                        {isAuthenticated && user ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-purple-200 hidden md:block">
                                    {user.userName}
                                </span>
                                <button
                                    onClick={logout}
                                    className="px-5 py-2.5 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold text-red-200 transition-all shadow-lg"
                                >
                                    Odhlásit
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setAuthOpen(true)}
                                className="px-5 py-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-bold text-indigo-200 transition-all shadow-lg"
                            >
                                Přihlásit / Registrovat
                            </button>
                        )}

                        {/* Language Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setLangOpen(!langOpen)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md text-xs font-bold text-gray-200 hover:text-white transition-all shadow-lg"
                            >
                                {language.toUpperCase()}
                            </button>
                            {langOpen && (
                                <div className="absolute top-full right-0 mt-2 w-24 py-1 glass-panel bg-[#020410]/90 rounded-xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
                                    {languages.map(l => (
                                        <button
                                            key={l.code}
                                            onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                                            className="px-4 py-2 text-left text-xs font-bold hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {langOpen && <div className="fixed inset-0 pointer-events-auto z-[-1]" onClick={() => setLangOpen(false)}></div>}
            </nav>
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        </>
    );
};

export default Navbar;
```
