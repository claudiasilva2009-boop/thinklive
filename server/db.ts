import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import {
  CommentRecord,
  CommentWithAuthor,
  CulturalItem,
  DiaryEntry,
  DiaryEntryEnriched,
  FavoriteCategory,
  FavoriteCollection,
  MediaCommentEnriched,
  MediaCommentRecord,
  MediaReviewEnriched,
  MediaReviewRecord,
  MediaShelfEntry,
  MusicLibrary,
  NotificationEnriched,
  NotificationRecord,
  PostRecord,
  PostWithAuthor,
  ProfileCustomization,
  ReportRecord,
  SavedItemEnriched,
  SavedItemRecord,
  Shelf,
  SiteConfigPublic,
  UserPodcastState,
  UserPublic,
  UserRecord,
} from '../src/types/thinklive';

export interface SiteConfigRecord extends SiteConfigPublic {
  developerUserId?: string | null;
  developerEmail?: string | null;
  developerPasscodeHash?: string | null;
}

export interface DatabaseSchema {
  users: UserRecord[];
  posts: PostRecord[];
  likes: { userId: string; postId: string; createdAt: string }[];
  comments: CommentRecord[];
  follows: { followerId: string; followingId: string; createdAt: string }[];
  blocks: { blockerId: string; blockedId: string; createdAt: string }[];
  reports: ReportRecord[];
  culturalItems: CulturalItem[];
  shelves: Shelf[];
  favoriteCollections: FavoriteCollection[];
  savedItems: SavedItemRecord[];
  notifications: NotificationRecord[];
  resetTokens: { email: string; code: string; expiresAt: number }[];
  mediaReviews: MediaReviewRecord[];
  mediaComments: MediaCommentRecord[];
  mediaShelfEntries: MediaShelfEntry[];
  diaryEntries: DiaryEntry[];
  diaryLikes: { userId: string; entryId: string; createdAt: string }[];
  podcastStates: UserPodcastState[];
  siteConfig?: SiteConfigRecord;
}

export const IS_VERCEL = Boolean(process.env.VERCEL || process.env.NOW_REGION);
export const BUNDLED_DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'thinklive-data') : BUNDLED_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'thinklive-db.json');
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, 'thinklive-db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const BUNDLED_UPLOADS_DIR = path.join(BUNDLED_DATA_DIR, 'uploads');

export function ensureDataDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // Ignore directory creation errors on read-only environments
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}

export function makeDefaultCustomization(overrides?: Partial<ProfileCustomization>): ProfileCustomization {
  return {
    seasonTheme: 'outono',
    bannerUrl: '/src/assets/images/autumn_library_hero_1794870054293.jpg',
    epigraph: 'Escrevendo entre livros sublinhados, cinema silencioso e tardes de outono.',
    links: [],
    theme: {
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
    savedThemes: [],
    sectionOrder: ['bio', 'links', 'cultural', 'music_library', 'shelves', 'posts'],
    hiddenSections: [],
    showCulturalStats: true,
    showFollowerCount: true,
    ...overrides,
  };
}

export function makeDefaultMusicLibrary(): MusicLibrary {
  return {
    favoriteTrack: null,
    favoriteArtists: [],
    favoriteAlbums: [],
    playlists: [],
    collections: [],
  };
}

export function createDefaultShelvesForUser(userId: string): Shelf[] {
  const now = new Date().toISOString();
  const baseCategories = [
    { title: 'Poemas', category: 'Poemas', description: 'Versos guardados para releituras silenciosas.', coverUrl: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg' },
    { title: 'Artigos', category: 'Artigos', description: 'Ensaios, crônicas e artigos de referência.', coverUrl: '' },
    { title: 'Músicas', category: 'Músicas', description: 'Álbuns inteiros, discos de vinil e trilhas sonoras.', coverUrl: '/src/assets/images/music_vinyl_cover_1794860652366.jpg' },
    { title: 'Filmes e séries', category: 'Filmes e séries', description: 'Cinema de autor, ensaios visuais e séries marcantes.', coverUrl: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg' },
    { title: 'Livros', category: 'Livros', description: 'Romances, contos, ensaios e cadernos de cabeceira.', coverUrl: '/src/assets/images/book_archive_cover_1794860653200.jpg' },
    { title: 'Fotografias', category: 'Fotografias', description: 'Luz natural, retratos urbanos e registros em 35mm.', coverUrl: '/src/assets/images/street_photography_demo_1794860653458.jpg' },
    { title: 'Favoritos', category: 'Favoritos', description: 'Seleção essencial de referências e descobertas.', coverUrl: '' },
  ];

  return baseCategories.map((item, index) => ({
    id: `shelf_${userId}_${index + 1}`,
    userId,
    title: item.title,
    category: item.category,
    description: item.description,
    coverUrl: item.coverUrl,
    isPublic: true,
    order: index,
    items: [],
    createdAt: now,
  }));
}

function createSeedDatabase(): DatabaseSchema {
  const now = Date.now();
  const iso = (hoursAgo: number) => new Date(now - hoursAgo * 3600 * 1000).toISOString();

  const demoUser1: UserRecord = {
    id: 'demo_user_clara',
    username: 'caderno_atlantico',
    email: 'demo@thinklive.app',
    passwordHash: hashPassword('thinklive123'),
    passwordHint: 'Nome da plataforma em minúsculas + 123 (thinklive123)',
    displayName: 'Clara Vasconcelos (Demo)',
    bio: 'Ensaísta fictícia de demonstração. Escreve sobre literatura contemporânea, cinema lento e fotografia analógica.',
    avatarUrl: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg',
    isPrivate: false,
    isDemo: true,
    preferences: { favoriteCategories: ['Poemas', 'Artigos', 'Livros'], emailNotifications: true },
    customization: makeDefaultCustomization({
      bannerUrl: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg',
      epigraph: '“Toda biblioteca é um retrato inacabado de quem a reúne.” — Perfil de demonstração',
      links: [
        { id: 'lnk_1', label: 'Ensaios de Outono (Demo)', url: 'https://thinklive.example/ensaios' },
      ],
    }),
    createdAt: iso(240),
  };

  const demoUser2: UserRecord = {
    id: 'demo_user_mateus',
    username: 'sala_de_projecao',
    email: 'cinema.demo@thinklive.app',
    passwordHash: hashPassword('thinklive123'),
    passwordHint: 'Nome da plataforma em minúsculas + 123 (thinklive123)',
    displayName: 'Mateus Nogueira (Demo)',
    bio: 'Crítico cultural fictício para demonstração da Thinklive. Diários de cinema, discos de jazz e crônicas noturnas.',
    avatarUrl: '/src/assets/images/street_photography_demo_1794860653458.jpg',
    isPrivate: false,
    isDemo: true,
    preferences: { favoriteCategories: ['Filmes & Séries', 'Músicas', 'Fotografia'], emailNotifications: true },
    customization: makeDefaultCustomization({
      bannerUrl: '/src/assets/images/street_photography_demo_1794860653458.jpg',
      epigraph: 'Anotações de cabine de projeção e cadernos de vinil. (Perfil de demonstração)',
      theme: {
        id: 'estudio-sepia',
        name: 'Estúdio Sépia',
        backgroundColor: '#F6EFE6',
        surfaceColor: '#EADFD1',
        textColor: '#2B2118',
        mutedColor: '#695544',
        buttonBg: '#6B4226',
        buttonText: '#FAF5EE',
        accentColor: '#8B5A2B',
        nameFont: 'playfair',
        bioFont: 'manrope',
        fontSize: 'md',
      },
    }),
    createdAt: iso(220),
  };

  const demoUser3: UserRecord = {
    id: 'demo_user_arquivo',
    username: 'arquivo_sonoro',
    email: 'musica.demo@thinklive.app',
    passwordHash: hashPassword('thinklive123'),
    passwordHint: 'Nome da plataforma em minúsculas + 123 (thinklive123)',
    displayName: 'Helena Prado (Demo)',
    bio: 'Curadoria musical e resenhas literárias fictícias de demonstração editorial na Thinklive.',
    avatarUrl: '/src/assets/images/music_vinyl_cover_1794860652366.jpg',
    isPrivate: false,
    isDemo: true,
    preferences: { favoriteCategories: ['Músicas', 'Livros', 'Arte e cultura'], emailNotifications: false },
    customization: makeDefaultCustomization({
      bannerUrl: '/src/assets/images/music_vinyl_cover_1794860652366.jpg',
      epigraph: 'Lado A para a manhã, Lado B para a chuva. (Perfil de demonstração)',
      theme: {
        id: 'caderno-campo',
        name: 'Caderno de Campo',
        backgroundColor: '#F5F5F0',
        surfaceColor: '#E9EAE0',
        textColor: '#1F241D',
        mutedColor: '#51594D',
        buttonBg: '#2F422B',
        buttonText: '#F5F5F0',
        accentColor: '#3E5B37',
        nameFont: 'fraunces',
        bioFont: 'jakarta',
        fontSize: 'md',
      },
    }),
    createdAt: iso(200),
  };

  const posts: PostRecord[] = [
    {
      id: 'post_demo_1',
      authorId: demoUser1.id,
      type: 'artigo',
      category: 'Artigos',
      title: 'A arquitetura da leitura lenta em tempos de rolagem infinita',
      subtitle: 'Por que voltar ao ritmo da revista impressa transforma a maneira como pensamos e dialogamos online.',
      content:
        'Entrar em uma sala de leitura silenciosa tem algo de contracultural. Quando abrimos uma revista literária ou nos sentamos diante de uma estante bem cuidada, o tempo deixa de ser fragmentado por notificações apressadas e recupera sua espessura.\n\nNa escrita contemporânea, o ensaio breve e a crônica cotidiana cumprem um papel precioso: permitem que ideias amadureçam entre uma xícara de café e uma anotação à margem. Não escrevemos apenas para responder ao instante, mas para construir memória compartilhada.\n\nAo reunir poemas, resenhas de cinema, cadernos de música e ensaios visuais em um mesmo espaço, recuperamos a antiga convivência das livrarias independentes: lugares onde um livro puxa um filme, que desperta a lembrança de um disco.',
      coverImage: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg',
      imageCaption: 'Fig. 1 — Sala de leitura à tarde (imagem ilustrativa de demonstração).',
      status: 'published',
      isDemo: true,
      sharesCount: 14,
      createdAt: iso(6),
      updatedAt: iso(6),
    },
    {
      id: 'post_demo_2',
      authorId: demoUser1.id,
      type: 'poema',
      category: 'Poemas',
      title: 'Inventário da tarde sobre a mesa de calcário',
      subtitle: 'Caderno de versos breves',
      content:
        'Resta na folha aberta\no traço quase invisível da janela,\num ramo de oliveira colhido antes da chuva\ne o peso calmo do latão sobre o papel.\n\nNada pede pressa quando a luz inclina:\naté as palavras aprendem\na descansar entre duas linhas\ncomo quem dobra um mapa depois da viagem.',
      coverImage: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg',
      imageCaption: 'Caderno aberto — demonstração poética.',
      ambientSoundId: 'piano',
      status: 'published',
      isDemo: true,
      sharesCount: 9,
      createdAt: iso(14),
      updatedAt: iso(14),
    },
    {
      id: 'post_demo_3',
      authorId: demoUser2.id,
      type: 'fotografia',
      category: 'Fotografia',
      title: 'Depois da chuva no Café du Soir',
      subtitle: 'Registro em 35mm em preto e branco sobre pedras molhadas.',
      content:
        'Há momentos na cidade em que o asfalto funciona como espelho de memória. A vitrine embaçada do café ao fundo contrasta com o passo solitário sob o guarda-chuva, criando um quadro que parece suspenso fora do calendário.\n\nFotografado com lente 35mm, priorizando a textura das pedras úmidas e a luz difusa do entardecer.',
      coverImage: '/src/assets/images/street_photography_demo_1794860653458.jpg',
      imageCaption: 'Série Noturnos Urbanos — Fotografia de demonstração.',
      status: 'published',
      isDemo: true,
      sharesCount: 11,
      createdAt: iso(20),
      updatedAt: iso(20),
    },
    {
      id: 'post_demo_4',
      authorId: demoUser2.id,
      type: 'resenha',
      category: 'Filmes & Séries',
      title: 'Dias Perfeitos (Perfect Days): a poesia dos gestos mínimos',
      subtitle: 'Uma meditação luminosa de Wim Wenders sobre rotina, fitas cassete e atenção.',
      content:
        'Poucos filmes recentes conseguem transformar a repetição cotidiana em experiência transcendente sem recorrer a artifícios melodramáticos. Acompanhando Hirayama pelas manhãs de Tóquio, aprendemos a observar a luz filtrada pelas copas das árvores — komorebi — como um acontecimento único a cada dia.\n\nA trilha em fitas cassete funciona como extensão da memória afetiva do protagonista, enquanto os livros de bolso comprados em sebos ancoram suas noites em uma serenidade rara no cinema atual.',
      coverImage: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg',
      reviewMeta: {
        mediaType: 'filme',
        workTitle: 'Perfect Days',
        creator: 'Wim Wenders',
        year: '2023',
        rating: 5,
      },
      status: 'published',
      isDemo: true,
      sharesCount: 18,
      createdAt: iso(32),
      updatedAt: iso(32),
    },
    {
      id: 'post_demo_5',
      authorId: demoUser3.id,
      type: 'resenha',
      category: 'Músicas',
      title: 'Escuta atenta: discos que pedem o álbum inteiro sem pular faixas',
      subtitle: 'Notas sobre o álbum Autumn Vibrations e o retorno do formato Lado A / Lado B.',
      content:
        'Ouvir um disco do início ao fim hoje exige uma pequena decisão arquitetônica: afastar o telefone, escolher um fone confortável e aceitar a sequência pensada pelo artista.\n\nAs texturas acústicas ganham respiração própria quando não são interrompidas por playlists algorítmicas. Há silêncios entre a terceira e a quarta faixa que fazem parte da composição tanto quanto os acordes de violão e piano.',
      coverImage: '/src/assets/images/music_vinyl_cover_1794860652366.jpg',
      reviewMeta: {
        mediaType: 'album',
        workTitle: 'Autumn Vibrations (Demo)',
        creator: 'Quarteto Atlântico (Fictício)',
        year: '2025',
        rating: 4.5,
      },
      status: 'published',
      isDemo: true,
      sharesCount: 7,
      createdAt: iso(44),
      updatedAt: iso(44),
    },
    {
      id: 'post_demo_6',
      authorId: demoUser3.id,
      type: 'resenha',
      category: 'Livros',
      title: 'Reler Ao Farol em edições de pano e margens anotadas',
      subtitle: 'Notas de releitura sobre tempo interior, memória familiar e o ritmo das frases de Virginia Woolf.',
      content:
        'Certos romances mudam completamente conforme a estação da vida em que os reabrimos. Na primeira leitura, buscamos a trama; na segunda ou terceira, passamos a escutar a cadência das vírgulas e o modo como um único almoço à beira-mar contém décadas inteiras.\n\nOrganizar a própria estante com edições que permitem anotações a lápis transforma cada livro em conversa prolongada com nossa versão anterior.',
      coverImage: '/src/assets/images/book_archive_cover_1794860653200.jpg',
      reviewMeta: {
        mediaType: 'livro',
        workTitle: 'Ao Farol (To the Lighthouse)',
        creator: 'Virginia Woolf',
        year: '1927',
        rating: 5,
      },
      status: 'published',
      isDemo: true,
      sharesCount: 16,
      createdAt: iso(56),
      updatedAt: iso(56),
    },
    {
      id: 'post_demo_7',
      authorId: demoUser1.id,
      type: 'noticia',
      category: 'Notícias',
      title: 'Mostras independentes de livrarias de bairro ampliam clubes de leitura presenciais',
      subtitle: 'Panorama cultural de iniciativas que unem pequenas editoras, cineclubes e saraus literários.',
      content:
        'Ao longo dos últimos meses, livrarias independentes e centros culturais de médio porte têm apostado em programações híbridas que misturam lançamentos de poesia, exibições comentadas de cinema clássico e oficinas de encadernação artesanal.\n\nO público jovem tem buscado espaços onde a conversa continue depois da última página, sem a pressa das redes convencionais.',
      status: 'published',
      isDemo: true,
      sharesCount: 6,
      createdAt: iso(72),
      updatedAt: iso(72),
    },
    {
      id: 'post_demo_8',
      authorId: demoUser1.id,
      type: 'diario',
      category: 'Diários',
      title: 'Notas de fim de tarde sobre silêncio e cadernos em branco',
      content:
        'Abri a janela às cinco e meia e o vento trouxe cheiro de terra molhada antes mesmo da primeira gota. Às vezes basta anotar três frases honestas antes de fechar o dia para devolver contorno ao que parecia disperso.',
      status: 'published',
      isDemo: true,
      sharesCount: 5,
      createdAt: iso(10),
      updatedAt: iso(10),
    },
    {
      id: 'post_demo_9',
      authorId: demoUser2.id,
      type: 'fotografia',
      category: 'Fotografia',
      title: 'Última luz no terraço em filme instantâneo',
      subtitle: 'Retrato espontâneo entre amigas ao pôr do sol.',
      content:
        'Sem posar nem repetir o clique: a luz alaranjada durou menos de quatro minutos antes de o céu virar índigo.',
      coverImage: '/src/assets/images/polaroid_rooftop_friends_1794866428102.jpg',
      imageCaption: 'Filme instantâneo 600 — Arquivo de demonstração.',
      status: 'published',
      isDemo: true,
      sharesCount: 13,
      createdAt: iso(17),
      updatedAt: iso(17),
    },
    {
      id: 'post_demo_10',
      authorId: demoUser3.id,
      type: 'poema',
      category: 'Poemas',
      title: 'Geografia mínima da chuva na vidraça',
      content:
        'Cada gota inventa um rio breve\nque não sabe o nome do mar,\ne ainda assim desce o vidro\ncomo quem cumpre uma promessa inteira\nno intervalo de um suspiro.',
      ambientSoundId: 'chuva_janela',
      status: 'published',
      isDemo: true,
      sharesCount: 15,
      createdAt: iso(24),
      updatedAt: iso(24),
    },
    {
      id: 'post_demo_11',
      authorId: demoUser2.id,
      type: 'resenha',
      category: 'Filmes & Séries',
      title: 'Normal People e a coreografia do não dito',
      subtitle: 'Como enquadramentos próximos transformam hesitações em linguagem cinematográfica.',
      content:
        'Mais do que uma história sobre desencontros entre Dublin e Sligo, a série observa o modo como dois jovens aprendem a respirar no mesmo cômodo sem conseguir nomear o próprio afeto.',
      coverImage: '/src/assets/images/cinema_projector_night_1794866429083.jpg',
      reviewMeta: {
        mediaType: 'serie',
        workTitle: 'Normal People',
        creator: 'Lenny Abrahamson & Hettie Macdonald',
        year: '2020',
        rating: 4.5,
      },
      status: 'published',
      isDemo: true,
      sharesCount: 12,
      createdAt: iso(38),
      updatedAt: iso(38),
    },
    {
      id: 'post_demo_12',
      authorId: demoUser3.id,
      type: 'arte_cultura',
      category: 'Arte e cultura',
      title: 'Ateliês independentes, zines e a volta da risografia artesanal',
      subtitle: 'Por que publicações impressas em duas cores seguem fascinando leitores jovens.',
      content:
        'Entre papéis texturizados, tintas vegetais e tiragens numeradas, o zine continua sendo um território livre para experimentar imagem e palavra fora da padronização digital.',
      coverImage: '/src/assets/images/zine_art_studio_1794866430762.jpg',
      imageCaption: 'Mesa de estúdio e zines — demonstração cultural.',
      status: 'published',
      isDemo: true,
      sharesCount: 8,
      createdAt: iso(50),
      updatedAt: iso(50),
    },
  ];

  const comments: CommentRecord[] = [
    {
      id: 'cmt_demo_1',
      postId: 'post_demo_1',
      authorId: demoUser2.id,
      parentId: null,
      content: 'Essa comparação com a convivência das livrarias independentes resume exatamente o que faltava na web cultural.',
      createdAt: iso(4),
    },
    {
      id: 'cmt_demo_2',
      postId: 'post_demo_1',
      authorId: demoUser1.id,
      parentId: 'cmt_demo_1',
      content: 'Obrigada, Mateus! Quando um filme conversa com um livro na mesma tarde, tudo fica mais vivo.',
      createdAt: iso(3),
    },
    {
      id: 'cmt_demo_3',
      postId: 'post_demo_2',
      authorId: demoUser3.id,
      parentId: null,
      content: 'A imagem do mapa dobrado depois da viagem ficou reverberando por aqui.',
      createdAt: iso(10),
    },
  ];

  const culturalItems: CulturalItem[] = [
    {
      id: 'cult_1',
      userId: demoUser1.id,
      mediaType: 'livro',
      subType: 'obra',
      title: 'Ao Farol',
      creator: 'Virginia Woolf',
      year: '1927',
      coverUrl: '/src/assets/images/book_archive_cover_1794860653200.jpg',
      status: 'completed',
      rating: 5,
      review: 'Prosa luminosa sobre o tempo e a passagem das estações.',
      listName: 'Clássicos de Cabeceira',
      isFavorite: true,
      isDemo: true,
      createdAt: iso(100),
    },
    {
      id: 'cult_2',
      userId: demoUser1.id,
      mediaType: 'livro',
      subType: 'obra',
      title: 'A Paixão Segundo G.H.',
      creator: 'Clarice Lispector',
      year: '1964',
      coverUrl: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg',
      status: 'in_progress',
      rating: 4.5,
      review: 'Leitura lenta, duas páginas por noite.',
      listName: 'Literatura Brasileira',
      isFavorite: true,
      isDemo: true,
      createdAt: iso(40),
    },
    {
      id: 'cult_3',
      userId: demoUser2.id,
      mediaType: 'filme',
      subType: 'obra',
      title: 'Perfect Days',
      creator: 'Wim Wenders',
      year: '2023',
      coverUrl: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg',
      status: 'completed',
      rating: 5,
      review: 'Obra-prima de delicadeza visual e atenção ao cotidiano.',
      listName: 'Cinema Contemplativo',
      isFavorite: true,
      isDemo: true,
      createdAt: iso(35),
    },
    {
      id: 'cult_4',
      userId: demoUser2.id,
      mediaType: 'serie',
      subType: 'obra',
      title: 'Dekalog',
      creator: 'Krzysztof Kieślowski',
      year: '1989',
      coverUrl: '/src/assets/images/street_photography_demo_1794860653458.jpg',
      status: 'planned',
      rating: 0,
      review: 'Na fila para maratona de domingo.',
      listName: 'Para Assistir no Inverno',
      isFavorite: false,
      isDemo: true,
      createdAt: iso(15),
    },
    {
      id: 'cult_5',
      userId: demoUser3.id,
      mediaType: 'musica',
      subType: 'album',
      title: 'Construção',
      creator: 'Chico Buarque',
      year: '1971',
      coverUrl: '/src/assets/images/music_vinyl_cover_1794860652366.jpg',
      status: 'completed',
      rating: 5,
      review: 'Arquitetura poética e arranjos impecáveis do início ao fim.',
      listName: 'Discos Essenciais',
      isFavorite: true,
      isDemo: true,
      createdAt: iso(60),
    },
  ];

  const shelvesClara = createDefaultShelvesForUser(demoUser1.id);
  shelvesClara[0].items.push({
    id: 'shitem_1',
    title: 'Inventário da tarde sobre a mesa de calcário',
    subtitle: 'Poema autoral (Demonstração)',
    kind: 'poema',
    coverUrl: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg',
    refId: 'post_demo_2',
    addedAt: iso(12),
  });
  shelvesClara[3].items.push({
    id: 'shitem_2',
    title: 'Ao Farol',
    subtitle: 'Virginia Woolf · 1927',
    kind: 'livro',
    coverUrl: '/src/assets/images/book_archive_cover_1794860653200.jpg',
    addedAt: iso(24),
  });

  const shelvesMateus = createDefaultShelvesForUser(demoUser2.id);
  shelvesMateus[2].items.push({
    id: 'shitem_3',
    title: 'Perfect Days',
    subtitle: 'Wim Wenders · 2023',
    kind: 'filme',
    coverUrl: '/src/assets/images/editorial_cinema_cover_1794860652401.jpg',
    addedAt: iso(20),
  });

  const shelvesHelena = createDefaultShelvesForUser(demoUser3.id);
  shelvesHelena[1].items.push({
    id: 'shitem_4',
    title: 'Construção',
    subtitle: 'Chico Buarque · 1971',
    kind: 'musica',
    coverUrl: '/src/assets/images/music_vinyl_cover_1794860652366.jpg',
    addedAt: iso(30),
  });

  const favoriteCollections: FavoriteCollection[] = [
    {
      id: 'favcol_demo_1',
      userId: demoUser1.id,
      name: 'Referências para o próximo ensaio',
      description: 'Coleção privada de leitura e cinema.',
      isPrivate: true,
      createdAt: iso(50),
    },
  ];

  const savedItems: SavedItemRecord[] = [
    {
      id: 'saved_demo_1',
      userId: demoUser1.id,
      postId: 'post_demo_4',
      category: 'Filmes',
      collectionId: 'favcol_demo_1',
      savedAt: iso(12),
    },
    {
      id: 'saved_demo_2',
      userId: demoUser1.id,
      postId: 'post_demo_3',
      category: 'Fotografias',
      collectionId: null,
      savedAt: iso(8),
    },
  ];

  const follows = [
    { followerId: demoUser1.id, followingId: demoUser2.id, createdAt: iso(100) },
    { followerId: demoUser1.id, followingId: demoUser3.id, createdAt: iso(90) },
    { followerId: demoUser2.id, followingId: demoUser1.id, createdAt: iso(80) },
    { followerId: demoUser3.id, followingId: demoUser1.id, createdAt: iso(70) },
  ];

  const likes = [
    { userId: demoUser2.id, postId: 'post_demo_1', createdAt: iso(5) },
    { userId: demoUser3.id, postId: 'post_demo_1', createdAt: iso(4) },
    { userId: demoUser1.id, postId: 'post_demo_3', createdAt: iso(18) },
    { userId: demoUser3.id, postId: 'post_demo_4', createdAt: iso(25) },
  ];

  const notifications: NotificationRecord[] = [
    {
      id: 'notif_demo_1',
      userId: demoUser1.id,
      actorId: demoUser2.id,
      type: 'comment',
      postId: 'post_demo_1',
      message: 'comentou no seu artigo "A arquitetura da leitura lenta"',
      read: false,
      createdAt: iso(4),
    },
    {
      id: 'notif_demo_2',
      userId: demoUser1.id,
      actorId: demoUser3.id,
      type: 'like',
      postId: 'post_demo_1',
      message: 'curtiu o seu artigo',
      read: false,
      createdAt: iso(4),
    },
    {
      id: 'notif_demo_3',
      userId: demoUser1.id,
      actorId: demoUser3.id,
      type: 'follow',
      message: 'começou a acompanhar suas publicações',
      read: true,
      createdAt: iso(70),
    },
  ];

  const diaryEntries: DiaryEntry[] = [
    {
      id: 'diary_demo_1',
      userId: demoUser1.id,
      title: 'Notas sobre o silêncio depois da chuva',
      content:
        'Passei a tarde relendo cartas antigas perto da janela. Há dias em que escrever sem nenhuma obrigação de concluir um argumento devolve o fôlego inteiro da semana. Percebi que minhas melhores estrofes nascem quando paro de tentar explicá-las.',
      visibility: 'public',
      mood: 'Serenidade',
      createdAt: iso(9),
      updatedAt: iso(9),
    },
    {
      id: 'diary_demo_2',
      userId: demoUser2.id,
      title: 'Saindo da última sessão do cineclube',
      content:
        'Caminhei quatro quarteirões sem olhar o relógio depois do filme. O cinema bom tem esse efeito curioso: reorganiza a luz dos postes e faz a gente prestar atenção em detalhes que passariam despercebidos numa terça comum.',
      visibility: 'public',
      mood: 'Contemplação',
      createdAt: iso(28),
      updatedAt: iso(28),
    },
    {
      id: 'diary_demo_3',
      userId: demoUser1.id,
      title: 'Caderno fechado — lembretes só para mim',
      content:
        'Guardar um tempo na sexta para revisar os versos inacabados do caderno verde antes de publicar qualquer coisa. Não apressar o ritmo das revisões.',
      visibility: 'private',
      mood: 'Íntimo',
      createdAt: iso(5),
      updatedAt: iso(5),
    },
  ];

  return {
    users: [demoUser1, demoUser2, demoUser3],
    posts,
    likes,
    comments,
    follows,
    blocks: [],
    reports: [],
    culturalItems,
    shelves: [...shelvesClara, ...shelvesMateus, ...shelvesHelena],
    favoriteCollections,
    savedItems,
    notifications,
    resetTokens: [],
    mediaReviews: [],
    mediaComments: [],
    mediaShelfEntries: [],
    diaryEntries,
    diaryLikes: [],
    podcastStates: [],
  };
}

export function makeDefaultSiteConfig(preserveAuth?: {
  developerUserId?: string | null;
  developerEmail?: string | null;
  developerPasscodeHash?: string | null;
}): SiteConfigRecord {
  return {
    brandName: 'Thinklive',
    brandTagline: '',
    defaultSeason: 'outono',
    announcement: {
      enabled: false,
      message: '',
      linkLabel: '',
      linkUrl: '',
      tone: 'warm',
    },
    homeHero: {},
    tabHeroes: {},
    hiddenCategories: [],
    pinnedPostIds: [],
    verifiedUserIds: [],
    updatedAt: new Date().toISOString(),
    developerUserId: preserveAuth?.developerUserId ?? null,
    developerEmail: preserveAuth?.developerEmail ?? null,
    developerPasscodeHash: preserveAuth?.developerPasscodeHash ?? null,
  };
}

export function toPublicSiteConfig(cfg?: SiteConfigRecord): SiteConfigPublic {
  const safe = cfg || makeDefaultSiteConfig();
  return {
    brandName: safe.brandName || 'Thinklive',
    brandTagline: safe.brandTagline || '',
    defaultSeason: safe.defaultSeason || 'outono',
    announcement: safe.announcement,
    homeHero: safe.homeHero || {},
    tabHeroes: safe.tabHeroes || {},
    hiddenCategories: Array.isArray(safe.hiddenCategories) ? safe.hiddenCategories : [],
    pinnedPostIds: Array.isArray(safe.pinnedPostIds) ? safe.pinnedPostIds : [],
    verifiedUserIds: Array.isArray(safe.verifiedUserIds) ? safe.verifiedUserIds : [],
    updatedAt: safe.updatedAt || new Date().toISOString(),
  };
}

export function getOrCreateSiteConfig(): SiteConfigRecord {
  const db = getDb();
  if (!db.siteConfig) {
    db.siteConfig = makeDefaultSiteConfig();
    saveDb();
  }
  return db.siteConfig;
}

export function isUserDeveloperAdmin(user?: UserRecord | null): boolean {
  if (!user) return false;
  const envEmail = (process.env.DEVELOPER_EMAIL || '').trim().toLowerCase();
  if (envEmail && user.email.toLowerCase() === envEmail) return true;
  if (user.role === 'developer') return true;
  const cfg = dbCache?.siteConfig;
  if (cfg?.developerUserId && cfg.developerUserId === user.id) return true;
  if (cfg?.developerEmail && cfg.developerEmail.toLowerCase() === user.email.toLowerCase()) return true;
  return false;
}

let dbCache: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;
  ensureDataDirs();
  const sourceDbFile = fs.existsSync(DB_FILE)
    ? DB_FILE
    : fs.existsSync(BUNDLED_DB_FILE)
      ? BUNDLED_DB_FILE
      : null;

  if (sourceDbFile) {
    try {
      const raw = fs.readFileSync(sourceDbFile, 'utf-8');
      dbCache = JSON.parse(raw) as DatabaseSchema;
      let changed = false;
      if (!Array.isArray(dbCache.mediaReviews)) {
        dbCache.mediaReviews = [];
        changed = true;
      }
      if (!Array.isArray(dbCache.mediaComments)) {
        dbCache.mediaComments = [];
        changed = true;
      }
      if (!Array.isArray(dbCache.mediaShelfEntries)) {
        dbCache.mediaShelfEntries = [];
        changed = true;
      }
      if (!Array.isArray(dbCache.diaryEntries)) {
        dbCache.diaryEntries = [];
        changed = true;
      }
      if (!Array.isArray(dbCache.diaryLikes)) {
        dbCache.diaryLikes = [];
        changed = true;
      }
      if (!Array.isArray(dbCache.podcastStates)) {
        dbCache.podcastStates = [];
        changed = true;
      }
      if (!dbCache.siteConfig) {
        dbCache.siteConfig = makeDefaultSiteConfig();
        changed = true;
      }
      for (const u of dbCache.users) {
        if (u.isDemo && !u.passwordHint) {
          u.passwordHint = 'Nome da plataforma em minúsculas + 123 (thinklive123)';
          changed = true;
        }
        if (!u.musicLibrary) {
          u.musicLibrary = makeDefaultMusicLibrary();
          changed = true;
        }
        if (!u.customization.sectionOrder.includes('music_library')) {
          const idx = u.customization.sectionOrder.indexOf('cultural');
          if (idx >= 0) u.customization.sectionOrder.splice(idx + 1, 0, 'music_library');
          else u.customization.sectionOrder.push('music_library');
          changed = true;
        }
      }
      const extraDemoPosts: PostRecord[] = [
        {
          id: 'post_demo_8',
          authorId: 'demo_user_clara',
          type: 'diario',
          category: 'Diários',
          title: 'Notas de fim de tarde sobre silêncio e cadernos em branco',
          content:
            'Abri a janela às cinco e meia e o vento trouxe cheiro de terra molhada antes mesmo da primeira gota. Às vezes basta anotar três frases honestas antes de fechar o dia para devolver contorno ao que parecia disperso.',
          status: 'published',
          isDemo: true,
          sharesCount: 5,
          createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        },
        {
          id: 'post_demo_9',
          authorId: 'demo_user_mateus',
          type: 'fotografia',
          category: 'Fotografia',
          title: 'Última luz no terraço em filme instantâneo',
          subtitle: 'Retrato espontâneo entre amigas ao pôr do sol.',
          content:
            'Sem posar nem repetir o clique: a luz alaranjada durou menos de quatro minutos antes de o céu virar índigo.',
          coverImage: '/src/assets/images/polaroid_rooftop_friends_1794866428102.jpg',
          imageCaption: 'Filme instantâneo 600 — Arquivo de demonstração.',
          status: 'published',
          isDemo: true,
          sharesCount: 13,
          createdAt: new Date(Date.now() - 17 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 17 * 3600 * 1000).toISOString(),
        },
        {
          id: 'post_demo_10',
          authorId: 'demo_user_arquivo',
          type: 'poema',
          category: 'Poemas',
          title: 'Geografia mínima da chuva na vidraça',
          content:
            'Cada gota inventa um rio breve\nque não sabe o nome do mar,\ne ainda assim desce o vidro\ncomo quem cumpre uma promessa inteira\nno intervalo de um suspiro.',
          ambientSoundId: 'chuva_janela',
          status: 'published',
          isDemo: true,
          sharesCount: 15,
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'post_demo_11',
          authorId: 'demo_user_mateus',
          type: 'resenha',
          category: 'Filmes & Séries',
          title: 'Normal People e a coreografia do não dito',
          subtitle: 'Como enquadramentos próximos transformam hesitações em linguagem cinematográfica.',
          content:
            'Mais do que uma história sobre desencontros entre Dublin e Sligo, a série observa o modo como dois jovens aprendem a respirar no mesmo cômodo sem conseguir nomear o próprio afeto.',
          coverImage: '/src/assets/images/cinema_projector_night_1794866429083.jpg',
          reviewMeta: {
            mediaType: 'serie',
            workTitle: 'Normal People',
            creator: 'Lenny Abrahamson & Hettie Macdonald',
            year: '2020',
            rating: 4.5,
          },
          status: 'published',
          isDemo: true,
          sharesCount: 12,
          createdAt: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
        },
        {
          id: 'post_demo_12',
          authorId: 'demo_user_arquivo',
          type: 'arte_cultura',
          category: 'Arte e cultura',
          title: 'Ateliês independentes, zines e a volta da risografia artesanal',
          subtitle: 'Por que publicações impressas em duas cores seguem fascinando leitores jovens.',
          content:
            'Entre papéis texturizados, tintas vegetais e tiragens numeradas, o zine continua sendo um território livre para experimentar imagem e palavra fora da padronização digital.',
          coverImage: '/src/assets/images/zine_art_studio_1794866430762.jpg',
          imageCaption: 'Mesa de estúdio e zines — demonstração cultural.',
          status: 'published',
          isDemo: true,
          sharesCount: 8,
          createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
        },
      ];
      for (const extra of extraDemoPosts) {
        if (!dbCache.posts.some((p) => p.id === extra.id)) {
          dbCache.posts.push(extra);
          changed = true;
        }
      }
      const demoPoem2 = dbCache.posts.find((p) => p.id === 'post_demo_2');
      if (demoPoem2 && !demoPoem2.ambientSoundId) {
        demoPoem2.ambientSoundId = 'piano';
        if (demoPoem2.spotifyItem) delete demoPoem2.spotifyItem;
        changed = true;
      }
      if (changed) saveDb();
      return dbCache;
    } catch {
      // Fallback to fresh seed if corrupted
    }
  }
  dbCache = createSeedDatabase();
  saveDb();
  return dbCache;
}

export function saveDb(): void {
  ensureDataDirs();
  if (!dbCache) return;
  try {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(dbCache, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch {
    // Keep in-memory state alive even if disk write fails on serverless
  }
}

export function toPublicUser(user: UserRecord, viewerId?: string | null): UserPublic {
  const db = getDb();
  const followersCount = db.follows.filter((f) => f.followingId === user.id).length;
  const followingCount = db.follows.filter((f) => f.followerId === user.id).length;
  const isFollowing = viewerId ? db.follows.some((f) => f.followerId === viewerId && f.followingId === user.id) : false;
  const isBlocked = viewerId ? db.blocks.some((b) => b.blockerId === viewerId && b.blockedId === user.id) : false;
  const isSelf = viewerId === user.id;
  const canViewFullProfile = !user.isPrivate || isSelf || isFollowing;
  const verifiedIds = db.siteConfig?.verifiedUserIds || [];

  const base: UserPublic = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isPrivate: user.isPrivate,
    isDemo: user.isDemo,
    isVerifiedBadge: verifiedIds.includes(user.id),
    customization: user.customization,
    createdAt: user.createdAt,
    followersCount,
    followingCount,
    isFollowing,
    isBlocked,
    canViewFullProfile,
    musicLibrary: canViewFullProfile ? user.musicLibrary || makeDefaultMusicLibrary() : undefined,
  };

  if (isSelf) {
    base.email = user.email;
    base.passwordHint = user.passwordHint || '';
    base.preferences = user.preferences;
    base.isDeveloperAdmin = isUserDeveloperAdmin(user);
  }

  return base;
}

export function enrichPost(post: PostRecord, viewerId?: string | null): PostWithAuthor {
  const db = getDb();
  const authorRecord = db.users.find((u) => u.id === post.authorId) ?? db.users[0];
  const likesCount = db.likes.filter((l) => l.postId === post.id).length;
  const commentsCount = db.comments.filter((c) => c.postId === post.id).length;
  const isLiked = viewerId ? db.likes.some((l) => l.postId === post.id && l.userId === viewerId) : false;
  const isSaved = viewerId ? db.savedItems.some((s) => s.postId === post.id && s.userId === viewerId) : false;

  return {
    ...post,
    author: toPublicUser(authorRecord, viewerId),
    likesCount,
    commentsCount,
    isLiked,
    isSaved,
  };
}

export function buildCommentTree(postId: string, viewerId?: string | null): CommentWithAuthor[] {
  const db = getDb();
  const blockedIds = viewerId
    ? new Set(db.blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId))
    : new Set<string>();

  const postComments = db.comments
    .filter((c) => c.postId === postId && !blockedIds.has(c.authorId))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const map = new Map<string, CommentWithAuthor>();
  for (const c of postComments) {
    const author = db.users.find((u) => u.id === c.authorId) ?? db.users[0];
    map.set(c.id, {
      ...c,
      author: toPublicUser(author, viewerId),
      replies: [],
    });
  }

  const roots: CommentWithAuthor[] = [];
  for (const c of map.values()) {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export function getSavedItemsEnriched(userId: string): SavedItemEnriched[] {
  const db = getDb();
  return db.savedItems
    .filter((s) => s.userId === userId)
    .map((s) => {
      const post = db.posts.find((p) => p.id === s.postId);
      if (!post) return null;
      return {
        ...s,
        post: enrichPost(post, userId),
      };
    })
    .filter((item): item is SavedItemEnriched => item !== null)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

export function getNotificationsEnriched(userId: string): NotificationEnriched[] {
  const db = getDb();
  return db.notifications
    .filter((n) => n.userId === userId)
    .map((n) => {
      const actor = db.users.find((u) => u.id === n.actorId) ?? db.users[0];
      const post = n.postId ? db.posts.find((p) => p.id === n.postId) : undefined;
      return {
        ...n,
        actor: toPublicUser(actor, userId),
        postTitle: post?.title,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function mapPostCategoryToFavoriteCategory(category: string, type: string): FavoriteCategory {
  if (type === 'poema' || category === 'Poemas') return 'Poemas';
  if (type === 'fotografia' || category === 'Fotografia') return 'Fotografias';
  if (category === 'Livros') return 'Livros';
  if (category === 'Filmes & Séries') return 'Filmes';
  if (category === 'Músicas') return 'Músicas';
  if (type === 'artigo' || category === 'Artigos' || type === 'cronica') return 'Artigos';
  return 'Outros';
}

export function getWorkCommunityStats(workId: string): { average: number | null; count: number } {
  const db = getDb();
  const reviews = db.mediaReviews.filter((r) => r.workId === workId);
  if (reviews.length === 0) return { average: null, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return {
    average: Number((sum / reviews.length).toFixed(1)),
    count: reviews.length,
  };
}

export function getWorkReviewsEnriched(workId: string, viewerId?: string | null): MediaReviewEnriched[] {
  const db = getDb();
  const blockedIds = viewerId
    ? new Set(db.blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId))
    : new Set<string>();

  return db.mediaReviews
    .filter((r) => r.workId === workId && !blockedIds.has(r.userId))
    .map((r) => {
      const author = db.users.find((u) => u.id === r.userId) ?? db.users[0];
      return {
        ...r,
        author: toPublicUser(author, viewerId),
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getWorkCommentsEnriched(workId: string, viewerId?: string | null): MediaCommentEnriched[] {
  const db = getDb();
  const blockedIds = viewerId
    ? new Set(db.blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId))
    : new Set<string>();

  return db.mediaComments
    .filter((c) => c.workId === workId && !blockedIds.has(c.userId))
    .map((c) => {
      const author = db.users.find((u) => u.id === c.userId) ?? db.users[0];
      return {
        ...c,
        author: toPublicUser(author, viewerId),
      };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function normalizeBookShelfKey(title?: string, creator?: string): string {
  const clean = (value?: string) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const t = clean(title);
  const c = clean(creator);
  return t ? `${t}::${c}` : '';
}

export function getUserMediaLibrary(userId: string, viewerId?: string | null): {
  reviews: MediaReviewEnriched[];
  shelfEntries: MediaShelfEntry[];
} {
  const db = getDb();
  const owner = db.users.find((u) => u.id === userId) ?? db.users[0];
  const publicOwner = toPublicUser(owner, viewerId);

  const reviews: MediaReviewEnriched[] = db.mediaReviews
    .filter((r) => r.userId === userId)
    .map((r) => ({
      ...r,
      author: publicOwner,
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const sortedShelves = db.mediaShelfEntries
    .filter((s) => s.userId === userId && (Boolean(s.status) || Boolean(s.isFavorite)))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const seenWorkIds = new Set<string>();
  const seenBookKeys = new Set<string>();
  const shelfEntries: MediaShelfEntry[] = [];

  for (const entry of sortedShelves) {
    if (seenWorkIds.has(entry.workId)) continue;
    if (entry.mediaKind === 'livro') {
      const bookKey = normalizeBookShelfKey(entry.workSnapshot?.title, entry.workSnapshot?.creator);
      if (bookKey && seenBookKeys.has(bookKey)) continue;
      if (bookKey) seenBookKeys.add(bookKey);
    }
    seenWorkIds.add(entry.workId);
    shelfEntries.push(entry);
  }

  return { reviews, shelfEntries };
}

export function enrichDiaryEntry(entry: DiaryEntry, viewerId?: string | null): DiaryEntryEnriched {
  const db = getDb();
  const author = db.users.find((u) => u.id === entry.userId) ?? db.users[0];
  const likesCount = db.diaryLikes.filter((l) => l.entryId === entry.id).length;
  const isLiked = viewerId
    ? db.diaryLikes.some((l) => l.entryId === entry.id && l.userId === viewerId)
    : false;
  return {
    ...entry,
    author: toPublicUser(author, viewerId),
    likesCount,
    isLiked,
  };
}

export function getOrCreatePodcastState(userId: string): UserPodcastState {
  const db = getDb();
  let existing = db.podcastStates.find((s) => s.userId === userId);
  if (!existing) {
    existing = {
      userId,
      favoriteGenres: ['Literatura e poesia', 'Filosofia'],
      favoriteEpisodeIds: [],
      favoriteEpisodes: [],
      progressMap: {},
    };
    db.podcastStates.push(existing);
    saveDb();
  }
  return existing;
}
