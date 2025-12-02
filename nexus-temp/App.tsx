import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/Hero';
import AppCard from './components/AppCard';
import AppDetail from './components/AppDetail';
import GenericPage from './components/GenericPage';
import NebulaBackground from './components/NebulaBackground';
import { APPS_DATA } from './constants';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const Home: React.FC = () => {
  const { language, t } = useLanguage();
  const currentApps = APPS_DATA[language];

  return (
    <>
      <Hero />
      <section id="apps" className="py-32 relative">
        {/* Background Gradients/Separators */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cosmic-gold/30 to-transparent"></div>

        <div className="container mx-auto px-6 relative z-10">
          
          {/* Section Header */}
          <div className="text-center mb-20">
             <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {t.home.modulesTitle}
             </h2>
             <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-px bg-cosmic-gold/50"></div>
                <div className="w-2 h-2 rotate-45 border border-cosmic-gold animate-spin-slow"></div>
                <div className="w-12 h-px bg-cosmic-gold/50"></div>
             </div>
             <p className="mt-4 text-cosmic-teal font-bold tracking-widest text-sm uppercase">
                {t.home.selectApp}
             </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 auto-rows-[450px]">
            {currentApps.map((app, index) => (
              <AppCard key={app.id} app={app} index={index} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

const AppRoutes: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen text-white selection:bg-cosmic-gold selection:text-black">
      <NebulaBackground />
      <Navbar />
      <div className="relative z-10">
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app/:id" element={<AppDetail />} />
            <Route 
            path="/status" 
            element={
                <GenericPage 
                title={t.footer.links.status}
                subtitle="Real-time ethereal analytics" 
                code="ORB-01" 
                />
            } 
            />
            <Route 
            path="/privacy" 
            element={
                <GenericPage 
                title={t.footer.links.privacy}
                subtitle="Sacred protection scrolls" 
                code="KEY-09" 
                />
            } 
            />
            <Route 
            path="/contact" 
            element={
                <GenericPage 
                title={t.footer.links.contact} 
                subtitle="Open a channel to the void" 
                code="MSG-X" 
                />
            } 
            />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <Router>
        <AppRoutes />
      </Router>
    </LanguageProvider>
  );
};

export default App;