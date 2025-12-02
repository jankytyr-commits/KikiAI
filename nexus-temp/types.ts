export type Language = 'cs' | 'en' | 'de' | 'es';

export interface AppFeature {
  title: string;
  description: string;
}

export interface AppData {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  icon: string; // Emoji or SVG string
  heroImage: string;
  galleryImages: string[];
  features: AppFeature[];
  themeColor: string; // Tailwind class prefix like 'blue', 'purple'
  url: string; // External link to the app
}