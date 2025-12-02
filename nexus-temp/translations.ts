
import { Language } from './types';

export const TRANSLATIONS: Record<Language, any> = {
  cs: {
    nav: {
      back: 'ZPĚT',
    },
    hero: {
      status: 'Harmonie Sfér: Stabilní',
      typing: ["VYVOLÁVÁNÍ SFÉR...", "LADĚNÍ AURY...", "BRÁNA OTEVŘENA."],
      desc: 'Vstupte do spirály nekonečných možností. Kde se prastará moudrost snoubí s tepem vesmíru.',
      cta: 'Prozkoumat',
      docs: 'Kniha Moudrosti',
      stats: { net: 'PULS: STABILNÍ' }
    },
    home: {
      modulesTitle: 'OBJEVENÉ SFÉRY',
      selectApp: 'ZVOLTE SVOU CESTU',
      systemStatus: 'RESONANCE: 98%',
      nodesActive: 'AKTIVNÍ HVĚZDY',
    },
    appCard: {
      enter: 'Vstoupit'
    },
    footer: {
      desc: 'Kosmický přístav pro poutníky napříč dimenzemi.',
      links: { status: 'Stav Aetheru', privacy: 'Kodex Tajemství', contact: 'Astrální Vzkaz' },
      rights: 'Všechny dimenze chráněny.'
    },
    appDetail: {
      back: 'Zpět ke Hvězdám',
      notFound: 'Sféra nenalezena v mapách.',
      version: 'Éra 9.2.1',
      overview: 'Podstata',
      features: 'Dary',
      video: 'Vize',
      launch: 'Otevřít',
      auth: (name: string) => `Vstup do ${name} vyžaduje vyšší stupeň osvícení.`,
      init: 'Započít Rituál',
      gallery: 'Výjevy'
    },
    generic: {
        root: 'POČÁTEK',
        system: 'KOSMOS',
        return: 'Opustit Kruh',
        end: 'OMEGA'
    }
  },
  en: {
    nav: {
      back: 'BACK',
    },
    hero: {
      status: 'Sphere Harmony: Stable',
      typing: ["CONJURING SPHERES...", "TUNING AURA...", "GATEWAY OPEN."],
      desc: 'Enter the spiral of infinite possibilities. Where ancient wisdom meets the pulse of the universe.',
      cta: 'Explore',
      docs: 'Book of Wisdom',
      stats: { net: 'PULSE: STABLE' }
    },
    home: {
      modulesTitle: 'DISCOVERED REALMS',
      selectApp: 'CHOOSE YOUR PATH',
      systemStatus: 'RESONANCE: 98%',
      nodesActive: 'ACTIVE STARS',
    },
    appCard: {
      enter: 'Enter'
    },
    footer: {
      desc: 'A cosmic harbor for travelers across dimensions.',
      links: { status: 'Aether Status', privacy: 'Codex of Secrets', contact: 'Astral Message' },
      rights: 'All dimensions guarded.'
    },
    appDetail: {
      back: 'Back to Stars',
      notFound: 'Realm not found in star charts.',
      version: 'Era 9.2.1',
      overview: 'Essence',
      features: 'Gifts',
      video: 'Vision',
      launch: 'Open',
      auth: (name: string) => `Entry to ${name} requires higher enlightenment.`,
      init: 'Begin Ritual',
      gallery: 'Visions'
    },
    generic: {
        root: 'ORIGIN',
        system: 'COSMOS',
        return: 'Leave Circle',
        end: 'OMEGA'
    }
  },
  de: {
    nav: {
      back: 'ZURÜCK',
    },
    hero: {
      status: 'Sphärenharmonie: Stabil',
      typing: ["SPHÄREN BESCHWÖREN...", "AURA ABSTIMMEN...", "TOR GEÖFFNET."],
      desc: 'Betreten Sie die Spirale der unendlichen Möglichkeiten. Wo alte Weisheit auf den Puls des Universums trifft.',
      cta: 'Erkunden',
      docs: 'Buch der Weisheit',
      stats: { net: 'PULS: STABIL' }
    },
    home: {
      modulesTitle: 'ENTDECKTE REICHE',
      selectApp: 'WÄHLE DEINEN PFAD',
      systemStatus: 'RESONANZ: 98%',
      nodesActive: 'AKTIVE STERNE',
    },
    appCard: {
      enter: 'Eintreten'
    },
    footer: {
      desc: 'Ein kosmischer Hafen für Reisende durch die Dimensionen.',
      links: { status: 'Aether Status', privacy: 'Kodex der Geheimnisse', contact: 'Astrale Nachricht' },
      rights: 'Alle Dimensionen geschützt.'
    },
    appDetail: {
      back: 'Zurück zu den Sternen',
      notFound: 'Reich nicht in Sternenkarten gefunden.',
      version: 'Ära 9.2.1',
      overview: 'Essenz',
      features: 'Gaben',
      video: 'Vision',
      launch: 'Öffnen',
      auth: (name: string) => `Zugang zu ${name} erfordert höhere Erleuchtung.`,
      init: 'Ritual Beginnen',
      gallery: 'Visionen'
    },
    generic: {
        root: 'URSPRUNG',
        system: 'KOSMOS',
        return: 'Kreis Verlassen',
        end: 'OMEGA'
    }
  },
  es: {
    nav: {
      back: 'ATRÁS',
    },
    hero: {
      status: 'Armonía de Esferas: Estable',
      typing: ["CONVOCANDO ESFERAS...", "AFINANDO AURA...", "PUERTA ABIERTA."],
      desc: 'Entra en la espiral de infinitas posibilidades. Donde la antigua sabiduría se encuentra con el pulso del universo.',
      cta: 'Explorar',
      docs: 'Libro de Sabiduría',
      stats: { net: 'PULSO: ESTABLE' }
    },
    home: {
      modulesTitle: 'REINOS DESCUBIERTOS',
      selectApp: 'ELIGE TU CAMINO',
      systemStatus: 'RESONANCIA: 98%',
      nodesActive: 'ESTRELLAS ACTIVAS',
    },
    appCard: {
      enter: 'Entrar'
    },
    footer: {
      desc: 'Un puerto cósmico para viajeros a través de dimensiones.',
      links: { status: 'Estado del Éter', privacy: 'Códice de Secretos', contact: 'Mensaje Astral' },
      rights: 'Todas las dimensiones protegidas.'
    },
    appDetail: {
      back: 'Volver a las Estrellas',
      notFound: 'Reino no encontrado en cartas estelares.',
      version: 'Era 9.2.1',
      overview: 'Esencia',
      features: 'Dones',
      video: 'Visión',
      launch: 'Abrir',
      auth: (name: string) => `La entrada a ${name} requiere una iluminación superior.`,
      init: 'Comenzar Ritual',
      gallery: 'Visiones'
    },
    generic: {
        root: 'ORIGEN',
        system: 'COSMOS',
        return: 'Dejar el Círculo',
        end: 'OMEGA'
    }
  }
};