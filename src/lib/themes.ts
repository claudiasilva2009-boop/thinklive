import type { CSSProperties } from 'react';
import {
  BannerFilterMode,
  ProfileBackgroundTexture,
  ProfileCustomization,
  ProfileSectionId,
  ProfileTheme,
  SeasonId,
  ShelfBackdropTone,
  ShelfVisualConfig,
  ShelfWoodTone,
} from '../types/thinklive';

export interface FontOption {
  id: string;
  label: string;
  group: 'Serifada' | 'Moderna' | 'Minimalista' | 'Manuscrita';
  cssFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'cormorant', label: 'Cormorant Garamond', group: 'Serifada', cssFamily: "'Cormorant Garamond', Georgia, serif" },
  { id: 'playfair', label: 'Playfair Display', group: 'Serifada', cssFamily: "'Playfair Display', Georgia, serif" },
  { id: 'lora', label: 'Lora Literária', group: 'Serifada', cssFamily: "'Lora', Georgia, serif" },
  { id: 'fraunces', label: 'Fraunces Editorial', group: 'Serifada', cssFamily: "'Fraunces', Georgia, serif" },
  { id: 'jakarta', label: 'Plus Jakarta Sans', group: 'Moderna', cssFamily: "'Plus Jakarta Sans', sans-serif" },
  { id: 'dm-sans', label: 'DM Sans', group: 'Moderna', cssFamily: "'DM Sans', sans-serif" },
  { id: 'manrope', label: 'Manrope', group: 'Minimalista', cssFamily: "'Manrope', sans-serif" },
  { id: 'bricolage', label: 'Bricolage', group: 'Moderna', cssFamily: "'Bricolage Grotesque', sans-serif" },
  { id: 'caveat', label: 'Caveat Manuscrita', group: 'Manuscrita', cssFamily: "'Caveat', cursive" },
];

export function getFontCss(fontId: string): string {
  return FONT_OPTIONS.find((f) => f.id === fontId)?.cssFamily ?? "'Cormorant Garamond', Georgia, serif";
}

export function getButtonShapeClasses(buttonStyle?: ProfileTheme['buttonStyle']): string {
  if (buttonStyle === 'editorial') return 'rounded-lg tracking-wide';
  if (buttonStyle === 'minimal') return 'rounded-sm border border-current/25';
  return 'rounded-full';
}

export interface SeasonThemeConfig {
  id: SeasonId;
  name: string;
  editionLabel: string;
  tagline: string;
  animationLabel: string;
  animationHint: string;
  bannerUrl: string;
  swatches: [string, string, string];
  profileTheme: ProfileTheme;
}

export const SEASON_THEMES: Record<SeasonId, SeasonThemeConfig> = {
  outono: {
    id: 'outono',
    name: 'Outono',
    editionLabel: 'Edição de Outono',
    tagline: 'Papel creme, terracota e tardes douradas',
    animationLabel: 'Folhas ao vento',
    animationHint: 'Folhas secas caindo e respondendo à brisa do cursor',
    bannerUrl: '/src/assets/images/autumn_library_hero_1794870054293.jpg',
    swatches: ['#E7D7C2', '#C47743', '#563A2C'],
    profileTheme: {
      id: 'outono-literario',
      name: 'Outono Literário',
      backgroundColor: '#E7D7C2',
      surfaceColor: '#F3EBDD',
      textColor: '#563A2C',
      mutedColor: '#765A49',
      buttonBg: '#C47743',
      buttonText: '#F3EBDD',
      accentColor: '#98512F',
      nameFont: 'cormorant',
      bioFont: 'lora',
      fontSize: 'md',
      buttonStyle: 'rounded',
    },
  },
  inverno: {
    id: 'inverno',
    name: 'Inverno',
    editionLabel: 'Edição de Inverno',
    tagline: 'Névoa de papel, azul invernal e silêncio',
    animationLabel: 'Flocos de neve',
    animationHint: 'Cristais de neve caindo em redemoinho ao passar o mouse',
    bannerUrl: '/src/assets/images/winter_reading_window_1794873273458.jpg',
    swatches: ['#DFE8F1', '#3C6B92', '#1D3042'],
    profileTheme: {
      id: 'inverno-neve',
      name: 'Inverno & Silêncio',
      backgroundColor: '#DFE8F1',
      surfaceColor: '#F4F8FC',
      textColor: '#1D3042',
      mutedColor: '#4A6075',
      buttonBg: '#3C6B92',
      buttonText: '#F4F8FC',
      accentColor: '#264B6B',
      nameFont: 'cormorant',
      bioFont: 'lora',
      fontSize: 'md',
      buttonStyle: 'editorial',
    },
  },
  primavera: {
    id: 'primavera',
    name: 'Primavera',
    editionLabel: 'Edição de Primavera',
    tagline: 'Marfim rosado, flores e manhã leve',
    animationLabel: 'Pétalas em brisa',
    animationHint: 'Pétalas e brotos flutuando com giro floral no hover',
    bannerUrl: '/src/assets/images/spring_botanical_desk_1794873273741.jpg',
    swatches: ['#F1E3E7', '#B0536E', '#422631'],
    profileTheme: {
      id: 'primavera-botanica',
      name: 'Primavera Botânica',
      backgroundColor: '#F1E3E7',
      surfaceColor: '#FBF5F6',
      textColor: '#422631',
      mutedColor: '#6B4B57',
      buttonBg: '#B0536E',
      buttonText: '#FBF5F6',
      accentColor: '#86384F',
      nameFont: 'playfair',
      bioFont: 'lora',
      fontSize: 'md',
      buttonStyle: 'rounded',
    },
  },
  verao: {
    id: 'verao',
    name: 'Verão',
    editionLabel: 'Edição de Verão',
    tagline: 'Linho dourado, sol quente e entardecer',
    animationLabel: 'Vagalumes & luz solar',
    animationHint: 'Partículas douradas e vagalumes subindo com brilho no cursor',
    bannerUrl: '/src/assets/images/summer_sunlit_terrace_1794873274888.jpg',
    swatches: ['#F3E3C2', '#B86A14', '#463014'],
    profileTheme: {
      id: 'verao-dourado',
      name: 'Verão Solar',
      backgroundColor: '#F3E3C2',
      surfaceColor: '#FEF9EC',
      textColor: '#463014',
      mutedColor: '#6D5330',
      buttonBg: '#B86A14',
      buttonText: '#FEF9EC',
      accentColor: '#874A0A',
      nameFont: 'fraunces',
      bioFont: 'jakarta',
      fontSize: 'md',
      buttonStyle: 'rounded',
    },
  },
};

export const SEASON_THEME_LIST: SeasonThemeConfig[] = [
  SEASON_THEMES.outono,
  SEASON_THEMES.inverno,
  SEASON_THEMES.primavera,
  SEASON_THEMES.verao,
];

export const SEASON_STORAGE_KEY = 'thinklive_active_season';

export function normalizeSeasonId(season?: string | null): SeasonId {
  if (season === 'inverno' || season === 'primavera' || season === 'verao' || season === 'outono') {
    return season;
  }
  return 'outono';
}

export function getSeasonTheme(season?: string | null): SeasonThemeConfig {
  return SEASON_THEMES[normalizeSeasonId(season)];
}

export function applySeasonToDocument(season?: string | null): SeasonId {
  const valid = normalizeSeasonId(season);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-season', valid);
  }
  try {
    localStorage.setItem(SEASON_STORAGE_KEY, valid);
  } catch {
    // ignore storage failures
  }
  return valid;
}

export function getStoredSeason(): SeasonId {
  try {
    return normalizeSeasonId(localStorage.getItem(SEASON_STORAGE_KEY));
  } catch {
    return 'outono';
  }
}

export interface ProfileThemePreset {
  id: string;
  name: string;
  subtitle: string;
  theme: ProfileTheme;
  recommendedWood: ShelfWoodTone;
  recommendedBackdrop: ShelfBackdropTone;
  recommendedBanner?: string;
}

export const PROFILE_THEME_PRESETS: ProfileThemePreset[] = [
  {
    id: 'pink-diary',
    name: 'Pink Diary',
    subtitle: 'Rosa antigo, marfim e vinho romântico',
    recommendedWood: 'clara',
    recommendedBackdrop: 'rosa_antigo',
    recommendedBanner: '/src/assets/images/spring_botanical_desk_1794873273741.jpg',
    theme: {
      id: 'pink-diary',
      name: 'Pink Diary',
      backgroundColor: '#F5E9E8',
      surfaceColor: '#FFF9F5',
      textColor: '#493039',
      mutedColor: '#7B5A65',
      buttonBg: '#B65B76',
      buttonText: '#FFF9F5',
      accentColor: '#803C50',
      nameFont: 'cormorant',
      bioFont: 'jakarta',
      fontSize: 'md',
      buttonStyle: 'rounded',
      cardStyle: 'diary',
      backgroundTexture: 'paper',
      ornamentStyle: 'pressed_flowers',
    },
  },
  {
    id: 'dark-academia',
    name: 'Dark Academia',
    subtitle: 'Mogno profundo, veludo vinho e bronze',
    recommendedWood: 'escura',
    recommendedBackdrop: 'escuro',
    recommendedBanner: '/src/assets/images/autumn_library_hero_1794870054293.jpg',
    theme: {
      id: 'dark-academia',
      name: 'Dark Academia',
      backgroundColor: '#24191D',
      surfaceColor: '#322328',
      textColor: '#FFF9F5',
      mutedColor: '#D9B8C0',
      buttonBg: '#803C50',
      buttonText: '#FFF9F5',
      accentColor: '#D9B8C0',
      nameFont: 'cormorant',
      bioFont: 'lora',
      fontSize: 'md',
      buttonStyle: 'editorial',
      cardStyle: 'classic',
      backgroundTexture: 'paper',
      ornamentStyle: 'wax_seal',
    },
  },
  {
    id: 'editorial-vintage',
    name: 'Editorial Vintage',
    subtitle: 'Revista impressa, creme e rosa queimado',
    recommendedWood: 'envelhecida',
    recommendedBackdrop: 'marfim',
    recommendedBanner: '/src/assets/images/autumn_poetry_notebook_1794870054621.jpg',
    theme: {
      id: 'editorial-vintage',
      name: 'Editorial Vintage',
      backgroundColor: '#F7EFEA',
      surfaceColor: '#FFF9F5',
      textColor: '#493039',
      mutedColor: '#7A5B63',
      buttonBg: '#803C50',
      buttonText: '#FFF9F5',
      accentColor: '#B65B76',
      nameFont: 'playfair',
      bioFont: 'jakarta',
      fontSize: 'md',
      buttonStyle: 'editorial',
      cardStyle: 'editorial',
      backgroundTexture: 'linen',
      ornamentStyle: 'gold_leaf',
    },
  },
  {
    id: 'biblioteca-classica',
    name: 'Biblioteca Clássica',
    subtitle: 'Pergaminho, nogueira e tradição americana',
    recommendedWood: 'marrom',
    recommendedBackdrop: 'escuro',
    recommendedBanner: '/src/assets/images/book_archive_cover_1794860653200.jpg',
    theme: {
      id: 'biblioteca-classica',
      name: 'Biblioteca Clássica',
      backgroundColor: '#EFE4DA',
      surfaceColor: '#FFF9F5',
      textColor: '#493039',
      mutedColor: '#72565E',
      buttonBg: '#493039',
      buttonText: '#FFF9F5',
      accentColor: '#803C50',
      nameFont: 'fraunces',
      bioFont: 'lora',
      fontSize: 'md',
      buttonStyle: 'editorial',
      cardStyle: 'classic',
      backgroundTexture: 'paper',
      ornamentStyle: 'wax_seal',
    },
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    subtitle: 'Marfim puro, respiro e linhas suaves',
    recommendedWood: 'branca',
    recommendedBackdrop: 'marfim',
    recommendedBanner: '/src/assets/images/winter_reading_window_1794873273458.jpg',
    theme: {
      id: 'minimalista',
      name: 'Minimalista',
      backgroundColor: '#FFF9F5',
      surfaceColor: '#FFFFFF',
      textColor: '#3A262D',
      mutedColor: '#7C656D',
      buttonBg: '#493039',
      buttonText: '#FFF9F5',
      accentColor: '#B65B76',
      nameFont: 'playfair',
      bioFont: 'manrope',
      fontSize: 'md',
      buttonStyle: 'minimal',
      cardStyle: 'editorial',
      backgroundTexture: 'smooth',
      ornamentStyle: 'none',
    },
  },
  {
    id: 'cinema-retro',
    name: 'Cinema Retrô',
    subtitle: 'Sala escura, veludo vinho e película 35mm',
    recommendedWood: 'escura',
    recommendedBackdrop: 'vinho',
    recommendedBanner: '/src/assets/images/autumn_cinema_vinyl_1794870056332.jpg',
    theme: {
      id: 'cinema-retro',
      name: 'Cinema Retrô',
      backgroundColor: '#2A1B20',
      surfaceColor: '#39252C',
      textColor: '#FFF9F5',
      mutedColor: '#D9B8C0',
      buttonBg: '#B65B76',
      buttonText: '#FFF9F5',
      accentColor: '#E5B2BF',
      nameFont: 'fraunces',
      bioFont: 'dm-sans',
      fontSize: 'md',
      buttonStyle: 'editorial',
      cardStyle: 'glass',
      backgroundTexture: 'marble',
      ornamentStyle: 'gold_leaf',
    },
  },
  {
    id: 'jardim-literario',
    name: 'Jardim Literário',
    subtitle: 'Flores prensadas, linho e caderno botânico',
    recommendedWood: 'clara',
    recommendedBackdrop: 'verde_salvia',
    recommendedBanner: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg',
    theme: {
      id: 'jardim-literario',
      name: 'Jardim Literário',
      backgroundColor: '#F3ECE8',
      surfaceColor: '#FFFDFB',
      textColor: '#422C34',
      mutedColor: '#735962',
      buttonBg: '#803C50',
      buttonText: '#FFF9F5',
      accentColor: '#B65B76',
      nameFont: 'cormorant',
      bioFont: 'lora',
      fontSize: 'md',
      buttonStyle: 'rounded',
      cardStyle: 'diary',
      backgroundTexture: 'linen',
      ornamentStyle: 'pressed_flowers',
    },
  },
  {
    id: 'cafe-parisiense',
    name: 'Café Parisiense',
    subtitle: 'Mesas de bistrô, creme, café e papel pautado',
    recommendedWood: 'marrom',
    recommendedBackdrop: 'marfim',
    recommendedBanner: '/src/assets/images/street_photography_demo_1794860653458.jpg',
    theme: {
      id: 'cafe-parisiense',
      name: 'Café Parisiense',
      backgroundColor: '#F3E8E3',
      surfaceColor: '#FFF9F5',
      textColor: '#493039',
      mutedColor: '#785B63',
      buttonBg: '#803C50',
      buttonText: '#FFF9F5',
      accentColor: '#B65B76',
      nameFont: 'playfair',
      bioFont: 'jakarta',
      fontSize: 'md',
      buttonStyle: 'rounded',
      cardStyle: 'diary',
      backgroundTexture: 'ruled',
      ornamentStyle: 'ribbon',
    },
  },
];

export const PRESET_THEMES: ProfileTheme[] = [
  ...PROFILE_THEME_PRESETS.map((p) => p.theme),
  SEASON_THEMES.outono.profileTheme,
  SEASON_THEMES.inverno.profileTheme,
  SEASON_THEMES.primavera.profileTheme,
  SEASON_THEMES.verao.profileTheme,
];

export const DEFAULT_SHELF_CONFIG: ShelfVisualConfig = {
  woodTone: 'marrom',
  backdropTone: 'escuro',
  bookSize: 'medio',
  spacing: 'equilibrado',
  displayMode: 'capas_3d',
  itemsPerRow: 0,
  categoryLabels: {
    livros: 'Meus livros',
    filmes: 'Filmes',
    series: 'Séries',
    animes: 'Animes',
    favoritos: 'Favoritos',
    poemas: 'Poemas',
    artigos: 'Artigos',
  },
};

export const ALL_PROFILE_SECTIONS: ProfileSectionId[] = [
  'bio',
  'quote',
  'links',
  'shelves',
  'custom_collections',
  'books',
  'movies_series',
  'favorites',
  'reviews',
  'cultural',
  'posts',
];

export function normalizeProfileSectionOrder(order?: ProfileSectionId[]): ProfileSectionId[] {
  const base = Array.isArray(order) ? order.filter((id) => id !== 'music_library') : [];
  const seen = new Set<ProfileSectionId>();
  const normalized: ProfileSectionId[] = [];
  for (const id of base) {
    if (ALL_PROFILE_SECTIONS.includes(id) && !seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  }
  // Insert new sections in natural editorial positions if absent
  const defaultOrder: ProfileSectionId[] = ALL_PROFILE_SECTIONS;
  for (const id of defaultOrder) {
    if (!seen.has(id)) {
      seen.add(id);
      if (id === 'quote') {
        const bioIdx = normalized.indexOf('bio');
        if (bioIdx >= 0) normalized.splice(bioIdx + 1, 0, id);
        else normalized.unshift(id);
      } else if (id === 'custom_collections') {
        const shIdx = normalized.indexOf('shelves');
        if (shIdx >= 0) normalized.splice(shIdx + 1, 0, id);
        else normalized.push(id);
      } else {
        const postsIdx = normalized.indexOf('posts');
        if (postsIdx >= 0) normalized.splice(postsIdx, 0, id);
        else normalized.push(id);
      }
    }
  }
  return normalized;
}

export function getDefaultProfileCustomization(existing?: Partial<ProfileCustomization>): ProfileCustomization {
  const pinkDiary = PROFILE_THEME_PRESETS[0];
  return {
    seasonTheme: 'primavera',
    bannerUrl: existing?.bannerUrl || pinkDiary.recommendedBanner || '/src/assets/images/spring_botanical_desk_1794873273741.jpg',
    bannerColor: '',
    bannerPositionY: 50,
    bannerFilter: 'none',
    bannerQuote: '',
    avatarPosition: 'overlap',
    epigraph: existing?.epigraph || 'Escrevendo entre páginas sublinhadas, filmes antigos e tardes silenciosas.',
    favoriteQuoteAuthor: '',
    links: existing?.links || [],
    theme: { ...pinkDiary.theme },
    savedThemes: existing?.savedThemes || [],
    sectionOrder: [...ALL_PROFILE_SECTIONS],
    hiddenSections: [],
    showCulturalStats: true,
    showFollowerCount: true,
    shelfConfig: { ...DEFAULT_SHELF_CONFIG, woodTone: pinkDiary.recommendedWood, backdropTone: pinkDiary.recommendedBackdrop },
  };
}

export function getBannerFilterCss(filter?: BannerFilterMode): string {
  switch (filter) {
    case 'vintage':
      return 'sepia(0.32) contrast(1.06) brightness(0.95) saturate(0.88)';
    case 'sepia':
      return 'sepia(0.68) contrast(1.05) brightness(0.94)';
    case 'soft':
      return 'brightness(1.04) contrast(0.92) saturate(0.88)';
    case 'bw':
      return 'grayscale(1) contrast(1.1) brightness(0.96)';
    case 'rose':
      return 'sepia(0.22) hue-rotate(-24deg) saturate(1.08) brightness(0.97)';
    default:
      return 'none';
  }
}

export function getBackgroundTextureStyle(
  texture?: ProfileBackgroundTexture,
  textColor = '#493039'
): CSSProperties {
  if (!texture || texture === 'smooth') return {};
  const isLightText = (() => {
    const rgb = hexToRgb(textColor);
    return rgb ? relativeLuminance(rgb) > 0.5 : false;
  })();
  const lineAlpha = isLightText ? 'rgba(255,249,245,0.06)' : 'rgba(73,48,57,0.05)';
  const dotAlpha = isLightText ? 'rgba(255,249,245,0.05)' : 'rgba(128,60,80,0.045)';

  if (texture === 'paper') {
    return {
      backgroundImage: `radial-gradient(${dotAlpha} 1px, transparent 0), radial-gradient(${lineAlpha} 1px, transparent 0)`,
      backgroundSize: '22px 22px, 13px 13px',
      backgroundPosition: '0 0, 6px 6px',
    };
  }
  if (texture === 'linen') {
    return {
      backgroundImage: `repeating-linear-gradient(0deg, ${lineAlpha} 0px, ${lineAlpha} 1px, transparent 1px, transparent 6px), repeating-linear-gradient(90deg, ${lineAlpha} 0px, ${lineAlpha} 1px, transparent 1px, transparent 6px)`,
    };
  }
  if (texture === 'ruled') {
    return {
      backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 31px, ${lineAlpha} 31px, ${lineAlpha} 32px)`,
    };
  }
  if (texture === 'marble') {
    return {
      backgroundImage: `radial-gradient(ellipse at 20% 20%, ${dotAlpha} 0%, transparent 52%), radial-gradient(ellipse at 82% 72%, ${lineAlpha} 0%, transparent 55%)`,
    };
  }
  return {};
}

export function getShelfWoodStyle(tone: ShelfWoodTone = 'marrom') {
  switch (tone) {
    case 'clara':
      return {
        frameBg: 'linear-gradient(135deg, #E2C6A6 0%, #CFA980 42%, #BD9166 75%, #D9B893 100%)',
        frameBorder: 'rgba(145, 102, 62, 0.55)',
        plankTop: 'linear-gradient(180deg, rgba(60, 34, 15, 0.25) 0%, #E4C8A8 50%, #D2B08B 100%)',
        plankFront: 'linear-gradient(180deg, #CFA980 0%, #B88E63 55%, #9B7148 100%)',
        plaqueText: '#493039',
        isLightWood: true,
      };
    case 'escura':
      return {
        frameBg: 'linear-gradient(135deg, #402620 0%, #2C1915 45%, #1E100E 80%, #38201B 100%)',
        frameBorder: 'rgba(26, 12, 10, 0.9)',
        plankTop: 'linear-gradient(180deg, rgba(10, 5, 4, 0.65) 0%, #5B372F 48%, #462822 100%)',
        plankFront: 'linear-gradient(180deg, #432620 0%, #2E1814 52%, #1D0E0B 100%)',
        plaqueText: '#FFF9F5',
        isLightWood: false,
      };
    case 'envelhecida':
      return {
        frameBg: 'linear-gradient(135deg, #8B6E5C 0%, #6E5445 40%, #594135 72%, #7D6252 100%)',
        frameBorder: 'rgba(62, 43, 34, 0.85)',
        plankTop: 'linear-gradient(180deg, rgba(25, 16, 11, 0.5) 0%, #9E816F 48%, #826756 100%)',
        plankFront: 'linear-gradient(180deg, #7A5F4F 0%, #5E473A 55%, #443228 100%)',
        plaqueText: '#FFF9F5',
        isLightWood: false,
      };
    case 'branca':
      return {
        frameBg: 'linear-gradient(135deg, #FFFDFB 0%, #F5ECE9 46%, #EADCD8 82%, #FAF4F2 100%)',
        frameBorder: 'rgba(182, 146, 152, 0.55)',
        plankTop: 'linear-gradient(180deg, rgba(73, 48, 57, 0.14) 0%, #FFF9F5 48%, #EFE3E0 100%)',
        plankFront: 'linear-gradient(180deg, #FAF1EE 0%, #E7D6D3 58%, #D4BEC0 100%)',
        plaqueText: '#493039',
        isLightWood: true,
      };
    case 'marrom':
    default:
      return {
        frameBg: 'linear-gradient(135deg, #6B4249 0%, #523139 40%, #41252C 74%, #5C3841 100%)',
        frameBorder: 'rgba(48, 25, 31, 0.88)',
        plankTop: 'linear-gradient(180deg, rgba(24, 12, 16, 0.55) 0%, #9C6974 48%, #7F505B 100%)',
        plankFront: 'linear-gradient(180deg, #764A54 0%, #58343D 52%, #3D2128 100%)',
        plaqueText: '#FFF9F5',
        isLightWood: false,
      };
  }
}

export function getShelfBackdropStyle(backdrop: ShelfBackdropTone = 'escuro') {
  switch (backdrop) {
    case 'marfim':
      return {
        bg: 'linear-gradient(180deg, #FBF2EC 0%, #F4E6DF 55%, #EAD8D1 100%)',
        glow: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.65) 0%, transparent 70%)',
        labelBg: 'rgba(255, 249, 245, 0.88)',
        labelText: '#493039',
        labelBorder: 'rgba(128, 60, 80, 0.25)',
        emptyTitle: '#493039',
        emptyDesc: '#765862',
        isLight: true,
      };
    case 'rosa_antigo':
      return {
        bg: 'linear-gradient(180deg, #ECD5DC 0%, #DFC0C9 52%, #D4B0BA 100%)',
        glow: 'radial-gradient(ellipse at 50% 0%, rgba(255, 249, 245, 0.5) 0%, transparent 72%)',
        labelBg: 'rgba(255, 249, 245, 0.88)',
        labelText: '#493039',
        labelBorder: 'rgba(128, 60, 80, 0.28)',
        emptyTitle: '#493039',
        emptyDesc: '#684450',
        isLight: true,
      };
    case 'verde_salvia':
      return {
        bg: 'linear-gradient(180deg, #2D3D36 0%, #23312B 52%, #1B2621 100%)',
        glow: 'radial-gradient(ellipse at 50% 0%, rgba(226, 206, 175, 0.24) 0%, transparent 72%)',
        labelBg: 'rgba(255, 249, 245, 0.14)',
        labelText: '#F7EFE8',
        labelBorder: 'rgba(217, 184, 192, 0.3)',
        emptyTitle: '#FFF9F5',
        emptyDesc: '#D7DFD8',
        isLight: false,
      };
    case 'vinho':
      return {
        bg: 'linear-gradient(180deg, #552332 0%, #411925 50%, #2D1019 100%)',
        glow: 'radial-gradient(ellipse at 50% 0%, rgba(246, 210, 220, 0.24) 0%, transparent 72%)',
        labelBg: 'rgba(255, 249, 245, 0.14)',
        labelText: '#FFF9F5',
        labelBorder: 'rgba(217, 184, 192, 0.32)',
        emptyTitle: '#FFF9F5',
        emptyDesc: '#E6CDD4',
        isLight: false,
      };
    case 'escuro':
    default:
      return {
        bg: 'linear-gradient(180deg, #26161B 0%, #321E24 44%, #211217 100%)',
        glow: 'radial-gradient(ellipse at 50% 0%, rgba(240, 194, 165, 0.28) 0%, transparent 72%)',
        labelBg: 'linear-gradient(180deg, rgba(217,184,192,0.22) 0%, rgba(128,60,80,0.26) 100%)',
        labelText: '#F5E9E8',
        labelBorder: 'rgba(217, 184, 192, 0.34)',
        emptyTitle: '#FFF9F5',
        emptyDesc: '#DEC7CE',
        isLight: false,
      };
  }
}

// WCAG AA relative luminance check to keep user-customized profile themes legible
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 7;
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function ensureAccessibleTheme(theme: ProfileTheme): ProfileTheme {
  const bgRgb = hexToRgb(theme.backgroundColor);
  const isDarkBg = bgRgb ? relativeLuminance(bgRgb) < 0.25 : false;

  let textColor = theme.textColor;
  if (getContrastRatio(theme.backgroundColor, textColor) < 4.5) {
    textColor = isDarkBg ? '#FFF9F5' : '#493039';
  }

  let mutedColor = theme.mutedColor;
  if (getContrastRatio(theme.backgroundColor, mutedColor) < 3.4) {
    mutedColor = isDarkBg ? '#D9B8C0' : '#765A62';
  }

  let buttonText = theme.buttonText;
  if (getContrastRatio(theme.buttonBg, buttonText) < 4.5) {
    const btnRgb = hexToRgb(theme.buttonBg);
    const isDarkBtn = btnRgb ? relativeLuminance(btnRgb) < 0.35 : true;
    buttonText = isDarkBtn ? '#FFF9F5' : '#493039';
  }

  return {
    ...theme,
    textColor,
    mutedColor,
    buttonText,
  };
}

export const BANNER_PRESETS = [
  { id: 'salao-outono', label: 'Salão de Outono', url: '/src/assets/images/autumn_library_hero_1794870054293.jpg' },
  { id: 'inverno-janela', label: 'Janela de Inverno', url: '/src/assets/images/winter_reading_window_1794873273458.jpg' },
  { id: 'primavera-mesa', label: 'Manhã de Primavera', url: '/src/assets/images/spring_botanical_desk_1794873273741.jpg' },
  { id: 'verao-varanda', label: 'Varanda de Verão', url: '/src/assets/images/summer_sunlit_terrace_1794873274888.jpg' },
  { id: 'caderno-folhas', label: 'Caderno & Folhas', url: '/src/assets/images/autumn_poetry_notebook_1794870054621.jpg' },
  { id: 'vinil-outono', label: 'Vinil & Abajur', url: '/src/assets/images/autumn_cinema_vinyl_1794870056332.jpg' },
  { id: 'cinema-tarde', label: 'Sala de Leitura', url: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg' },
  { id: 'poesia', label: 'Caderno & Ramo', url: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg' },
  { id: 'rua', label: 'Chuva no Café', url: '/src/assets/images/street_photography_demo_1794860653458.jpg' },
  { id: 'livros', label: 'Estante Clássica', url: '/src/assets/images/book_archive_cover_1794860653200.jpg' },
  { id: 'vinil', label: 'Discos Analógicos', url: '/src/assets/images/music_vinyl_cover_1794860652366.jpg' },
];
