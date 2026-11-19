export type PostType =
  | 'poema'
  | 'artigo'
  | 'cronica'
  | 'fotografia'
  | 'resenha'
  | 'noticia'
  | 'diario'
  | 'teatro'
  | 'arte_cultura'
  | 'podcast';

export type TopCategory =
  | 'Início'
  | 'Poemas'
  | 'Notícias'
  | 'Filmes & Séries'
  | 'Artigos'
  | 'Músicas'
  | 'Livros'
  | 'Fotografia'
  | 'Arte e cultura'
  | 'Teatro'
  | 'Podcasts'
  | 'Diários';

export type SeasonId = 'outono' | 'inverno' | 'primavera' | 'verao';

export type LiterarySubcategory =
  | 'Poesias'
  | 'Cartas'
  | 'Crônicas'
  | 'Diários'
  | 'Microcontos'
  | 'Fragmentos'
  | 'Pensamentos';

export type PoemPageTemplate = 'livro' | 'manuscrito' | 'editorial' | 'carta';
export type PoemPaperBg = 'creme' | 'pergaminho' | 'areia' | 'terracota_suave' | 'noite_tinta';
export type PoemFontStyle = 'cormorant' | 'lora' | 'playfair' | 'fraunces' | 'caveat';
export type PoemOrnamentKind = 'folha' | 'flor_seca' | 'tinteiro' | 'livro_aberto' | 'nenhum';

export interface PoemPresentationStyle {
  template: PoemPageTemplate;
  paperBg: PoemPaperBg;
  fontFamily: PoemFontStyle;
  ornament: PoemOrnamentKind;
  alignment: 'left' | 'center';
}

export type ProfileSectionId =
  | 'bio'
  | 'quote'
  | 'links'
  | 'shelves'
  | 'custom_collections'
  | 'books'
  | 'movies_series'
  | 'favorites'
  | 'reviews'
  | 'cultural'
  | 'music_library'
  | 'posts';

export type ProfileCardStyle = 'editorial' | 'diary' | 'glass' | 'classic';
export type ProfileBackgroundTexture = 'smooth' | 'paper' | 'linen' | 'ruled' | 'marble';
export type ProfileOrnamentStyle =
  | 'none'
  | 'pressed_flowers'
  | 'wax_seal'
  | 'gold_leaf'
  | 'ribbon';
export type BannerFilterMode = 'none' | 'vintage' | 'sepia' | 'soft' | 'bw' | 'rose';
export type AvatarPositionMode = 'left' | 'center' | 'overlap';

export type ShelfWoodTone = 'clara' | 'escura' | 'envelhecida' | 'branca' | 'marrom';
export type ShelfBackdropTone = 'escuro' | 'marfim' | 'rosa_antigo' | 'verde_salvia' | 'vinho';
export type ShelfBookSize = 'compacto' | 'medio' | 'grande';
export type ShelfSpacing = 'junto' | 'equilibrado' | 'arejado';
export type ShelfDisplayMode = 'capas_3d' | 'misto' | 'lombadas';

export interface ShelfVisualConfig {
  woodTone: ShelfWoodTone;
  backdropTone: ShelfBackdropTone;
  bookSize: ShelfBookSize;
  spacing: ShelfSpacing;
  displayMode: ShelfDisplayMode;
  itemsPerRow: number; // 0 = auto, or 4, 6, 8, 10
  categoryLabels?: {
    livros?: string;
    filmes?: string;
    series?: string;
    animes?: string;
    favoritos?: string;
    poemas?: string;
    artigos?: string;
  };
}

export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export interface ProfileTheme {
  id: string;
  name: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  buttonBg: string;
  buttonText: string;
  accentColor: string;
  nameFont: string;
  bioFont: string;
  fontSize: 'sm' | 'md' | 'lg';
  buttonStyle?: 'rounded' | 'editorial' | 'minimal';
  cardStyle?: ProfileCardStyle;
  backgroundTexture?: ProfileBackgroundTexture;
  ornamentStyle?: ProfileOrnamentStyle;
}

export interface ProfileCustomization {
  seasonTheme?: SeasonId;
  bannerUrl: string;
  bannerColor?: string;
  bannerPositionY?: number;
  bannerFilter?: BannerFilterMode;
  bannerQuote?: string;
  avatarPosition?: AvatarPositionMode;
  epigraph: string;
  favoriteQuoteAuthor?: string;
  links: ProfileLink[];
  theme: ProfileTheme;
  savedThemes: ProfileTheme[];
  sectionOrder: ProfileSectionId[];
  hiddenSections: ProfileSectionId[];
  showCulturalStats: boolean;
  showFollowerCount: boolean;
  shelfConfig?: ShelfVisualConfig;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordHint?: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isPrivate: boolean;
  isDemo?: boolean;
  preferences: {
    favoriteCategories: string[];
    emailNotifications: boolean;
  };
  customization: ProfileCustomization;
  musicLibrary?: MusicLibrary;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isPrivate: boolean;
  isDemo?: boolean;
  customization: ProfileCustomization;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
  canViewFullProfile?: boolean;
  email?: string;
  passwordHint?: string;
  preferences?: UserRecord['preferences'];
  musicLibrary?: MusicLibrary;
}

export interface ReviewMeta {
  mediaType: 'filme' | 'serie' | 'livro' | 'album';
  workTitle: string;
  creator: string;
  year: string;
  rating: number; // 0.5 to 5
}

export interface PostRecord {
  id: string;
  authorId: string;
  type: PostType;
  category: TopCategory;
  literaryCategory?: LiterarySubcategory;
  poemStyle?: PoemPresentationStyle;
  title: string;
  subtitle?: string;
  content: string;
  coverImage?: string;
  imageCaption?: string;
  reviewMeta?: ReviewMeta;
  spotifyItem?: SpotifyItemRef;
  ambientSoundId?: AmbientSoundId;
  status: 'published' | 'draft';
  isDemo?: boolean;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostWithAuthor extends PostRecord {
  author: UserPublic;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

export interface CommentRecord {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
}

export interface CommentWithAuthor extends CommentRecord {
  author: UserPublic;
  replies: CommentWithAuthor[];
}

export interface CulturalItem {
  id: string;
  userId: string;
  mediaType: 'filme' | 'serie' | 'livro' | 'musica';
  subType?: 'album' | 'artista' | 'playlist' | 'obra';
  title: string;
  creator: string;
  year: string;
  coverUrl?: string;
  status: 'completed' | 'in_progress' | 'planned' | 'favorite';
  rating: number;
  review: string;
  listName: string;
  isFavorite: boolean;
  isDemo?: boolean;
  createdAt: string;
}

export interface ShelfItem {
  id: string;
  title: string;
  subtitle: string;
  kind:
    | 'poema'
    | 'artigo'
    | 'musica'
    | 'filme'
    | 'serie'
    | 'anime'
    | 'livro'
    | 'fotografia'
    | 'publicacao'
    | 'outro';
  coverUrl?: string;
  refId?: string;
  note?: string;
  year?: string;
  isFavorite?: boolean;
  rating?: number;
  addedAt: string;
}

export interface Shelf {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string;
  coverUrl?: string;
  isPublic: boolean;
  order: number;
  items: ShelfItem[];
  createdAt: string;
}

export type FavoriteCategory =
  | 'Poemas'
  | 'Artigos'
  | 'Fotografias'
  | 'Livros'
  | 'Filmes'
  | 'Músicas'
  | 'Outros';

export interface FavoriteCollection {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface SavedItemRecord {
  id: string;
  userId: string;
  postId: string;
  category: FavoriteCategory;
  collectionId: string | null;
  savedAt: string;
}

export interface SavedItemEnriched extends SavedItemRecord {
  post: PostWithAuthor;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  actorId: string;
  type: 'follow' | 'like' | 'comment' | 'reply' | 'new_post';
  postId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationEnriched extends NotificationRecord {
  actor: UserPublic;
  postTitle?: string;
}

export interface ReportRecord {
  id: string;
  reporterId: string;
  targetType: 'post' | 'user' | 'comment';
  targetId: string;
  reason: string;
  details: string;
  createdAt: string;
}

export type NewsCategory =
  | 'Brasil'
  | 'Mundo'
  | 'Política'
  | 'Educação'
  | 'Tecnologia'
  | 'Cultura'
  | 'Entretenimento'
  | 'Ciência'
  | 'Economia';

export type NewsSourceName =
  | 'G1'
  | 'UOL Notícias'
  | 'CNN Brasil'
  | 'BBC News Brasil'
  | 'Agência Brasil';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: NewsSourceName;
  category: NewsCategory;
  publishedAt: string;
  imageUrl: string;
  author?: string;
}

export interface NewsSourceStatus {
  source: NewsSourceName;
  feedUrl: string;
  ok: boolean;
  itemCount: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  error: string | null;
}

export interface SpotifyItemRef {
  id: string;
  type: 'track' | 'artist' | 'album' | 'playlist';
  name: string;
  subtitle: string;
  imageUrl: string;
  spotifyUrl: string;
  embedUrl: string;
  durationMs?: number;
  releaseDate?: string;
}

export interface MusicCollection {
  id: string;
  name: string;
  description: string;
  items: SpotifyItemRef[];
  createdAt: string;
}

export interface MusicLibrary {
  favoriteTrack: SpotifyItemRef | null;
  favoriteArtists: SpotifyItemRef[];
  favoriteAlbums: SpotifyItemRef[];
  playlists: SpotifyItemRef[];
  collections: MusicCollection[];
}

export type CatalogMediaKind = 'filme' | 'serie' | 'livro';

export type MovieShelfStatus = 'quero_assistir' | 'ja_assistido';
export type BookShelfStatus = 'quero_ler' | 'lendo' | 'ja_li' | 'abandonado';
export type MediaShelfStatus = MovieShelfStatus | BookShelfStatus;

export interface CatalogWorkSnapshot {
  id: string;
  mediaKind: CatalogMediaKind;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  genres: string[];
  ageRating?: string;
}

export interface CatalogWork extends CatalogWorkSnapshot {
  sourceProvider: 'tmdb' | 'imdb_tvmaze' | 'google_books' | 'open_library' | 'apple_books';
  originalTitle?: string;
  synopsis: string;
  backdropUrl?: string;
  popularityScore: number;
  externalRating?: number | null;
  pageCount?: number | null;
  publisher?: string;
  castOrDetails?: string;
  isNewRelease?: boolean;
  communityAverage: number | null;
  communityReviewCount: number;
}

export interface MediaReviewRecord {
  id: string;
  workId: string;
  userId: string;
  mediaKind: CatalogMediaKind;
  rating: number; // 0 to 10
  review: string;
  workSnapshot: CatalogWorkSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface MediaReviewEnriched extends MediaReviewRecord {
  author: UserPublic;
}

export interface MediaCommentRecord {
  id: string;
  workId: string;
  userId: string;
  mediaKind: CatalogMediaKind;
  content: string;
  createdAt: string;
}

export interface MediaCommentEnriched extends MediaCommentRecord {
  author: UserPublic;
}

export interface MediaShelfEntry {
  id: string;
  userId: string;
  workId: string;
  mediaKind: CatalogMediaKind;
  status: MediaShelfStatus | null;
  isFavorite: boolean;
  workSnapshot: CatalogWorkSnapshot;
  updatedAt: string;
}

// ---------------- DIÁRIO ----------------
export type DiaryVisibility = 'private' | 'public';

export interface DiaryEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  visibility: DiaryVisibility;
  mood?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntryEnriched extends DiaryEntry {
  author: UserPublic;
  likesCount: number;
  isLiked: boolean;
}

// ---------------- PODCASTS ----------------
export type PodcastGenre =
  | 'Literatura e poesia'
  | 'Filosofia'
  | 'Psicologia e comportamento'
  | 'História e cultura'
  | 'Música e arte'
  | 'Desenvolvimento pessoal'
  | 'Conversas e reflexões'
  | 'Mistérios e histórias';

export interface PodcastEpisode {
  id: string;
  showTitle: string;
  title: string;
  description: string;
  genre: PodcastGenre;
  coverUrl: string;
  audioUrl: string;
  durationSec: number;
  durationLabel: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl?: string;
}

export interface PodcastProgressEntry {
  episodeId: string;
  positionSec: number;
  durationSec: number;
  updatedAt: string;
  episodeSnapshot?: PodcastEpisode;
}

export interface UserPodcastState {
  userId: string;
  favoriteGenres: PodcastGenre[];
  favoriteEpisodeIds: string[];
  favoriteEpisodes: PodcastEpisode[];
  progressMap: Record<string, PodcastProgressEntry>;
}

// ---------------- ARTE E CULTURA ----------------
export type ArtCultureTheme =
  | 'Obras de arte famosas'
  | 'Pinturas e ilustrações'
  | 'Fotografias artísticas'
  | 'Literatura e domínio público'
  | 'Curiosidades sobre artistas'
  | 'História da arte'
  | 'Movimentos artísticos'
  | 'Cinema e fotografia'
  | 'Arquitetura'
  | 'Exposições e manifestações'
  | 'Textos reflexivos';

export interface ArtCultureItem {
  id: string;
  theme: ArtCultureTheme;
  title: string;
  artistOrAuthor: string;
  year: string;
  mediumOrOrigin: string;
  imageUrl: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  summary: string;
  curiosityOrExcerpt: string;
  movementOrContext?: string;
}

// ---------------- SOM AMBIENTE ----------------
export type AmbientSoundId =
  | 'piano'
  | 'violao'
  | 'cordas'
  | 'chuva_janela'
  | 'chuva'
  | 'biblioteca'
  | 'floresta'
  | 'mar'
  | 'vento'
  | 'natureza';
