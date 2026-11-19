import type { CSSProperties } from 'react';
import {
  LiterarySubcategory,
  PoemFontStyle,
  PoemOrnamentKind,
  PoemPageTemplate,
  PoemPaperBg,
  PoemPresentationStyle,
  PostRecord,
} from '../types/thinklive';

export const LITERARY_SUBCATEGORIES: LiterarySubcategory[] = [
  'Poesias',
  'Cartas',
  'Crônicas',
  'Diários',
  'Microcontos',
  'Fragmentos',
  'Pensamentos',
];

export const LITERARY_HIGHLIGHT_QUOTES: { quote: string; author: string }[] = [
  {
    quote: 'Escrever é procurar entender, é procurar reproduzir o irreproduzível.',
    author: 'Clarice Lispector',
  },
  {
    quote: 'A poesia não quer seguidores apressados; ela pede um café morno e uma janela entreaberta.',
    author: 'Caderno Editorial Thinklive',
  },
  {
    quote: 'Guardo palavras como quem seca flores entre páginas de livros emprestados.',
    author: 'Arquivo de Outono',
  },
  {
    quote: 'Rende-te, como eu me rendi. Mergulha no que não conheces como eu mergulhei.',
    author: 'Clarice Lispector',
  },
  {
    quote: 'Todo poema é uma carta dobrada à espera de alguém que leia na mesma respiração.',
    author: 'Revista Literária Thinklive',
  },
];

export const POEM_TEMPLATE_OPTIONS: {
  id: PoemPageTemplate;
  label: string;
  description: string;
}[] = [
  { id: 'livro', label: 'Página de Livro', description: 'Margem clássica, fólio e respiro literário' },
  { id: 'manuscrito', label: 'Manuscrito', description: 'Folha pautada de caderno e tinta quente' },
  { id: 'editorial', label: 'Folheto de Revista', description: 'Título amplo e composição contemporânea' },
  { id: 'carta', label: 'Carta Dobrada', description: 'Folha epistolar com dobra e selo de lacre' },
];

export const POEM_PAPER_OPTIONS: {
  id: PoemPaperBg;
  label: string;
  swatch: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  borderColor: string;
  isDark?: boolean;
}[] = [
  {
    id: 'creme',
    label: 'Papel Creme',
    swatch: '#FAF5EC',
    bgColor: '#FAF5EC',
    textColor: '#4A3124',
    mutedColor: '#765A49',
    accentColor: '#98512F',
    borderColor: 'rgba(86, 58, 44, 0.16)',
  },
  {
    id: 'pergaminho',
    label: 'Pergaminho',
    swatch: '#EFE2CD',
    bgColor: '#EFE2CD',
    textColor: '#472E20',
    mutedColor: '#725341',
    accentColor: '#98512F',
    borderColor: 'rgba(120, 74, 42, 0.22)',
  },
  {
    id: 'areia',
    label: 'Linho Bege',
    swatch: '#E7D7C2',
    bgColor: '#E7D7C2',
    textColor: '#482F21',
    mutedColor: '#705343',
    accentColor: '#98512F',
    borderColor: 'rgba(86, 58, 44, 0.2)',
  },
  {
    id: 'terracota_suave',
    label: 'Rubor Terracota',
    swatch: '#F4E5DC',
    bgColor: '#F4E5DC',
    textColor: '#4B2B22',
    mutedColor: '#7C5145',
    accentColor: '#98512F',
    borderColor: 'rgba(152, 81, 47, 0.22)',
  },
  {
    id: 'noite_tinta',
    label: 'Tinta & Noite',
    swatch: '#3D281E',
    bgColor: '#3D281E',
    textColor: '#FAF5EC',
    mutedColor: '#DFC7AE',
    accentColor: '#E59A62',
    borderColor: 'rgba(243, 235, 221, 0.22)',
    isDark: true,
  },
];

export const POEM_FONT_OPTIONS: {
  id: PoemFontStyle;
  label: string;
  cssFamily: string;
  hint: string;
}[] = [
  { id: 'cormorant', label: 'Cormorant Garamond', cssFamily: "'Cormorant Garamond', Georgia, serif", hint: 'Lírica clássica' },
  { id: 'lora', label: 'Lora Literária', cssFamily: "'Lora', Georgia, serif", hint: 'Leitura de livro' },
  { id: 'playfair', label: 'Playfair Display', cssFamily: "'Playfair Display', Georgia, serif", hint: 'Revista moderna' },
  { id: 'fraunces', label: 'Fraunces', cssFamily: "'Fraunces', Georgia, serif", hint: 'Editorial orgânica' },
  { id: 'caveat', label: 'Caveat Manuscrita', cssFamily: "'Caveat', cursive", hint: 'Letra à mão' },
];

export const POEM_ORNAMENT_OPTIONS: {
  id: PoemOrnamentKind;
  label: string;
}[] = [
  { id: 'folha', label: 'Folha seca' },
  { id: 'flor_seca', label: 'Flor prensada' },
  { id: 'tinteiro', label: 'Pena & tinta' },
  { id: 'livro_aberto', label: 'Livro aberto' },
  { id: 'nenhum', label: 'Sem ornamento' },
];

export const DEFAULT_POEM_STYLE: PoemPresentationStyle = {
  template: 'livro',
  paperBg: 'creme',
  fontFamily: 'lora',
  ornament: 'folha',
  alignment: 'left',
};

export function inferLiteraryCategory(post: Pick<PostRecord, 'literaryCategory' | 'type'>): LiterarySubcategory {
  if (post.literaryCategory && LITERARY_SUBCATEGORIES.includes(post.literaryCategory)) {
    return post.literaryCategory;
  }
  if (post.type === 'cronica') return 'Crônicas';
  if (post.type === 'diario') return 'Diários';
  return 'Poesias';
}

export function resolvePoemStyle(post?: Partial<PostRecord> | null): PoemPresentationStyle {
  if (post?.poemStyle) {
    return {
      template: post.poemStyle.template || 'livro',
      paperBg: post.poemStyle.paperBg || 'creme',
      fontFamily: post.poemStyle.fontFamily || 'lora',
      ornament: post.poemStyle.ornament || 'folha',
      alignment: post.poemStyle.alignment === 'center' ? 'center' : 'left',
    };
  }
  const cat = post ? inferLiteraryCategory({ literaryCategory: post.literaryCategory, type: post.type || 'poema' }) : 'Poesias';
  if (cat === 'Cartas') {
    return { template: 'carta', paperBg: 'pergaminho', fontFamily: 'cormorant', ornament: 'tinteiro', alignment: 'left' };
  }
  if (cat === 'Diários' || cat === 'Fragmentos') {
    return { template: 'manuscrito', paperBg: 'areia', fontFamily: 'lora', ornament: 'flor_seca', alignment: 'left' };
  }
  if (cat === 'Crônicas' || cat === 'Microcontos') {
    return { template: 'editorial', paperBg: 'creme', fontFamily: 'playfair', ornament: 'livro_aberto', alignment: 'left' };
  }
  if (cat === 'Pensamentos') {
    return { template: 'livro', paperBg: 'terracota_suave', fontFamily: 'fraunces', ornament: 'folha', alignment: 'center' };
  }
  return DEFAULT_POEM_STYLE;
}

export function getPoemFontCss(fontId?: PoemFontStyle): string {
  return (
    POEM_FONT_OPTIONS.find((f) => f.id === fontId)?.cssFamily ??
    "'Lora', Georgia, serif"
  );
}

export function getPoemPaperTheme(paperId?: PoemPaperBg) {
  return (
    POEM_PAPER_OPTIONS.find((p) => p.id === paperId) ??
    POEM_PAPER_OPTIONS[0]
  );
}

export function getPoemSurfaceTexture(
  template: PoemPageTemplate,
  paperId: PoemPaperBg
): CSSProperties {
  const paper = getPoemPaperTheme(paperId);
  const grainAlpha = paper.isDark ? 'rgba(250, 245, 236, 0.045)' : 'rgba(86, 58, 44, 0.045)';
  const ruleAlpha = paper.isDark ? 'rgba(250, 245, 236, 0.08)' : 'rgba(152, 81, 47, 0.1)';

  if (template === 'manuscrito') {
    return {
      backgroundColor: paper.bgColor,
      backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 31px, ${ruleAlpha} 31px, ${ruleAlpha} 32px)`,
    };
  }

  return {
    backgroundColor: paper.bgColor,
    backgroundImage: `radial-gradient(${grainAlpha} 1px, transparent 0), radial-gradient(${grainAlpha} 1px, transparent 0)`,
    backgroundSize: '24px 24px, 15px 15px',
    backgroundPosition: '0 0, 7px 9px',
  };
}

export function estimateReadingTimeLabel(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 160));
  return `${mins} min de leitura`;
}
