
import { AppData, Language } from './types';
import config from './appConfig';

const getAppUrl = (id: string): string => {
  const urls = config.urls as Record<string, string>;
  return urls[id] || urls.default;
};

const CS_APPS: AppData[] = [
  {
    id: 'kicommander',
    name: 'KiKimmander',
    shortDescription: 'Futuristický webový průzkumník souborů a dimenzí.',
    fullDescription: 'KiKimmander je pokročilé rozhraní pro správu datových toků inspirované klasickými dvoupanelovými manažery. Umožňuje manipulaci se soubory napříč cloudovými úložišti i lokálními systémy v jediném, kyberneticky zabezpečeném okně. Podporuje drag&drop, hromadné přejmenování a okamžitý náhled obsahu.',
    icon: '💾',
    // Cyberpunk / Data Center / High Tech
    heroImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1920&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop', // Data dashboard
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop', // Matrix code
      'https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=800&auto=format&fit=crop', // Coding screen
    ],
    features: [
      { title: 'Dual-Pane Rozhraní', description: 'Klasický dvoupanelový pohled pro maximální efektivitu.' },
      { title: 'Cloud Sync', description: 'Okamžitá synchronizace s cloudovými dimenzemi.' },
      { title: 'Terminál', description: 'Integrovaná příkazová řádka pro pokročilé operace.' },
    ],
    themeColor: 'cyan',
    url: getAppUrl('kicommander'),
  },
  {
    id: 'kiki-ai',
    name: 'KikiAi',
    shortDescription: 'Specializovaný chatbot a Vědma Prázdnoty.',
    fullDescription: 'KikiAi není jen algoritmus. Je to entita s osobností, navržená pro hluboké konverzace, kreativní psaní a analýzu složitých problémů. Vaše digitální průvodkyně v chaosu informací, která se učí z každé interakce a nabízí unikátní vhledy.',
    icon: '🔮',
    // AI / Neural Network / Purple
    heroImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1920&auto=format&fit=crop', 
    galleryImages: [
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop', // Neural network
      'https://images.unsplash.com/photo-1617791160505-6f00504e3caf?q=80&w=800&auto=format&fit=crop', // Abstract purple tech
      'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=800&auto=format&fit=crop', // Robot eye
    ],
    features: [
      { title: 'Hluboký Kontext', description: 'Pamatuje si celou historii konverzace.' },
      { title: 'Kreativní Režim', description: 'Generování příběhů a básní z jiných světů.' },
      { title: 'Emoční Analýza', description: 'Rozpozná náladu a přizpůsobí tón odpovědi.' },
    ],
    themeColor: 'purple',
    url: getAppUrl('kiki-ai'),
  },
  {
    id: 'aetheria-adventures',
    name: 'Aetheria Adventures',
    shortDescription: 'Puzzle hra na motivy 4 elementů.',
    fullDescription: 'Ponořte se do světa Aetherie, kde rovnováha Země, Vzduchu, Ohně a Vody byla narušena. Řešte logické hádanky, kombinujte elementy a obnovte harmonii v této vizuálně podmanivé hře. Každá úroveň představuje novou výzvu pro vaši mysl.',
    icon: '🧩',
    // Fantasy / Elements / Nature / Emerald
    heroImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop', 
    galleryImages: [
      'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&auto=format&fit=crop', // Nebula/Magic
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=800&auto=format&fit=crop', // Mystical landscape
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop', // Deep forest
    ],
    features: [
      { title: 'Elementální Fyzika', description: 'Interaktivní prostředí reagující na živly.' },
      { title: 'Logické Výzvy', description: 'Stovky úrovní s rostoucí obtížností.' },
      { title: 'Příběhový Mód', description: 'Odhalte tajemství starověké civilizace.' },
    ],
    themeColor: 'emerald',
    url: getAppUrl('aetheria-adventures'),
  },
  {
    id: 'nebula-weaver',
    name: 'Nebula Weaver',
    shortDescription: 'Generativní audiovizuální syntezátor.',
    fullDescription: 'Tkejte hvězdné světlo do zvuku. Nebula Weaver je nástroj pro relaxaci a tvorbu, který převádí vaše pohyby a vizuální vzorce na unikátní zvukové krajiny v reálném čase. Vytvořte si vlastní vesmírnou symfonii.',
    icon: '✨',
    // Abstract / Light / Gold / Audio
    heroImage: 'https://images.unsplash.com/photo-1506318137071-a8bcbf67cc77?q=80&w=1920&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop', // Light painting
      'https://images.unsplash.com/photo-1614730341194-75c60764b5a7?q=80&w=800&auto=format&fit=crop', // Golden fluid
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop', // Gold glitter
    ],
    features: [
      { title: 'Synestezie', description: 'Převod obrazu na zvuk v reálném čase.' },
      { title: 'Nekonečné Variace', description: 'Procedurální generování obsahu.' },
      { title: 'Export', description: 'Uložte si své výtvory jako video či audio.' },
    ],
    themeColor: 'amber',
    url: getAppUrl('nebula-weaver'),
  },
];

// Helper to create translated versions efficiently
const createLocalizedApps = (lang: Language): AppData[] => {
    if (lang === 'cs') return CS_APPS;

    const dict: any = {
        en: {
            'kicommander': { name: 'KiKimmander', short: 'Futuristic web file and dimension explorer.', full: 'KiKimmander is an advanced data flow management interface inspired by classic dual-pane managers.', features: ['Dual-Pane Interface', 'Cloud Sync', 'Terminal'] },
            'kiki-ai': { name: 'KikiAi', short: 'Specialized chatbot and Void Oracle.', full: 'KikiAi is not just an algorithm. It is an entity with personality, designed for deep conversations.', features: ['Deep Context', 'Creative Mode', 'Emotional Analysis'] },
            'aetheria-adventures': { name: 'Aetheria Adventures', short: 'Puzzle game based on 4 elements.', full: 'Dive into the world of Aetheria, where the balance of Earth, Air, Fire, and Water has been disturbed.', features: ['Elemental Physics', 'Logic Challenges', 'Story Mode'] },
            'nebula-weaver': { name: 'Nebula Weaver', short: 'Generative audiovisual synthesizer.', full: 'Weave starlight into sound. Nebula Weaver is a tool for relaxation and creation.', features: ['Synesthesia', 'Infinite Variations', 'Export'] }
        },
        de: {
            'kicommander': { name: 'KiKimmander', short: 'Futuristischer Web-Datei-Explorer.', full: 'KiKimmander ist eine fortschrittliche Schnittstelle zur Verwaltung von Datenströmen.', features: ['Zweifenster-Ansicht', 'Cloud Sync', 'Terminal'] },
            'kiki-ai': { name: 'KikiAi', short: 'Spezialisierter Chatbot und Leere-Orakel.', full: 'KikiAi ist nicht nur ein Algorithmus. Es ist eine Entität mit Persönlichkeit.', features: ['Tiefer Kontext', 'Kreativmodus', 'Emotionsanalyse'] },
            'aetheria-adventures': { name: 'Aetheria Adventures', short: 'Puzzlespiel basierend auf 4 Elementen.', full: 'Tauchen Sie ein in die Welt von Aetheria, wo das Gleichgewicht der Elemente gestört wurde.', features: ['Elementarphysik', 'Logik-Herausforderungen', 'Story-Modus'] },
            'nebula-weaver': { name: 'Nebula Weaver', short: 'Generativer audiovisueller Synthesizer.', full: 'Weben Sie Sternenlicht in Klang. Nebula Weaver ist ein Werkzeug zur Entspannung.', features: ['Synästhesie', 'Unendliche Variationen', 'Export'] }
        },
        es: {
             'kicommander': { name: 'KiKimmander', short: 'Explorador de archivos web futurista.', full: 'KiKimmander es una interfaz avanzada de gestión de flujo de datos.', features: ['Interfaz de Doble Panel', 'Sincronización en la Nube', 'Terminal'] },
            'kiki-ai': { name: 'KikiAi', short: 'Chatbot especializado y Oráculo del Vacío.', full: 'KikiAi no es solo un algoritmo. Es una entidad con personalidad.', features: ['Contexto Profundo', 'Modo Creativo', 'Análisis Emocional'] },
            'aetheria-adventures': { name: 'Aetheria Adventures', short: 'Juego de rompecabezas basado en 4 elementos.', full: 'Sumérgete en el mundo de Aetheria, donde el equilibrio de los elementos ha sido perturbado.', features: ['Física Elemental', 'Desafíos Lógicos', 'Modo Historia'] },
            'nebula-weaver': { name: 'Nebula Weaver', short: 'Sintetizador audiovisual generativo.', full: 'Teje luz estelar en sonido. Nebula Weaver es una herramienta para la relajación.', features: ['Sinestesia', 'Variaciones Infinitas', 'Exportar'] }
        }
    };

    return CS_APPS.map(app => {
        const trans = dict[lang]?.[app.id] || {};
        return {
            ...app,
            name: trans.name || app.name,
            shortDescription: trans.short || app.shortDescription,
            fullDescription: trans.full || app.fullDescription,
            features: app.features.map((f, i) => ({
                ...f,
                title: trans.features?.[i] || f.title
            }))
        };
    });
};

export const APPS_DATA: Record<Language, AppData[]> = {
  cs: CS_APPS,
  en: createLocalizedApps('en'),
  de: createLocalizedApps('de'),
  es: createLocalizedApps('es'),
};
