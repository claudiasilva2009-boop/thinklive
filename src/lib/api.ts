import {
  ArtCultureItem,
  ArtCultureTheme,
  CatalogMediaKind,
  CatalogWork,
  CatalogWorkSnapshot,
  CommentWithAuthor,
  CulturalItem,
  DiaryEntryEnriched,
  DiaryVisibility,
  FavoriteCategory,
  FavoriteCollection,
  MediaCommentEnriched,
  MediaReviewEnriched,
  MediaShelfEntry,
  MediaShelfStatus,
  MusicLibrary,
  NewsArticle,
  NewsSourceStatus,
  NotificationEnriched,
  PodcastEpisode,
  PodcastGenre,
  PostRecord,
  PostWithAuthor,
  ProfileCustomization,
  SavedItemEnriched,
  Shelf,
  ShelfItem,
  SpotifyItemRef,
  UserPodcastState,
  UserPublic,
} from '../types/thinklive';

const TOKEN_KEY = 'thinklive_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Ocorreu um erro na requisição.');
  }
  return data as T;
}

export const api = {
  // Auth
  me: () => request<{ user: UserPublic | null }>('/api/auth/me'),
  register: (payload: { username: string; email: string; password: string; displayName: string; passwordHint?: string }) =>
    request<{ user: UserPublic; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { identifier: string; password: string }) =>
    request<{ user: UserPublic; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  demoLogin: () => request<{ user: UserPublic; token: string }>('/api/auth/demo', { method: 'POST' }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  getPasswordHint: (identifier: string) =>
    request<{ hint: string | null }>('/api/auth/password-hint', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string; recoveryCode: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: { email: string; code: string; newPassword: string }) =>
    request<{ ok: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAccount: (payload: {
    displayName?: string;
    username?: string;
    bio?: string;
    avatarUrl?: string;
    isPrivate?: boolean;
    passwordHint?: string;
    preferences?: { favoriteCategories: string[]; emailNotifications: boolean };
  }) => request<{ user: UserPublic }>('/api/account', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Upload
  uploadImage: (dataUrl: string, filename?: string) =>
    request<{ url: string }>('/api/upload', { method: 'POST', body: JSON.stringify({ dataUrl, filename }) }),

  // Posts
  getPosts: (params?: { category?: string; type?: string; filter?: string; authorId?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.type) sp.set('type', params.type);
    if (params?.filter) sp.set('filter', params.filter);
    if (params?.authorId) sp.set('authorId', params.authorId);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return request<{ posts: PostWithAuthor[] }>(`/api/posts${qs ? `?${qs}` : ''}`);
  },
  getPost: (id: string) => request<{ post: PostWithAuthor; comments: CommentWithAuthor[] }>(`/api/posts/${id}`),
  createPost: (payload: Partial<PostRecord>) =>
    request<{ post: PostWithAuthor }>('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  updatePost: (id: string, payload: Partial<PostRecord>) =>
    request<{ post: PostWithAuthor }>(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePost: (id: string) => request<{ ok: boolean }>(`/api/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id: string) => request<{ post: PostWithAuthor }>(`/api/posts/${id}/like`, { method: 'POST' }),
  sharePost: (id: string) => request<{ post: PostWithAuthor }>(`/api/posts/${id}/share`, { method: 'POST' }),

  // Comments
  addComment: (postId: string, content: string, parentId?: string | null) =>
    request<{ comments: CommentWithAuthor[] }>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId: parentId || null }),
    }),
  deleteComment: (commentId: string) =>
    request<{ comments: CommentWithAuthor[] }>(`/api/comments/${commentId}`, { method: 'DELETE' }),

  // Users & Profiles
  getUsers: (q?: string) => request<{ users: UserPublic[] }>(`/api/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getProfile: (username: string) =>
    request<{
      user: UserPublic;
      shelves: Shelf[];
      posts: PostWithAuthor[];
      culturalItems: CulturalItem[];
      mediaReviews: MediaReviewEnriched[];
      mediaShelfEntries: MediaShelfEntry[];
    }>(`/api/users/${encodeURIComponent(username)}`),
  saveCustomization: (payload: {
    displayName?: string;
    username?: string;
    bio?: string;
    avatarUrl?: string;
    customization: ProfileCustomization;
  }) => request<{ user: UserPublic }>('/api/profile/customization', { method: 'PATCH', body: JSON.stringify(payload) }),
  toggleFollow: (userId: string) => request<{ user: UserPublic }>(`/api/users/${userId}/follow`, { method: 'POST' }),
  getFollowers: (userId: string) => request<{ users: UserPublic[] }>(`/api/users/${userId}/followers`),
  getFollowing: (userId: string) => request<{ users: UserPublic[] }>(`/api/users/${userId}/following`),

  // Moderation
  getBlockedUsers: () => request<{ users: UserPublic[] }>('/api/blocks'),
  toggleBlock: (userId: string) => request<{ blocked: boolean }>(`/api/users/${userId}/block`, { method: 'POST' }),
  submitReport: (payload: { targetType: 'post' | 'user' | 'comment'; targetId: string; reason: string; details?: string }) =>
    request<{ ok: boolean; message: string }>('/api/reports', { method: 'POST', body: JSON.stringify(payload) }),

  // Cultural Hub
  getCultural: (params?: { mediaType?: string; userId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.mediaType) sp.set('mediaType', params.mediaType);
    if (params?.userId) sp.set('userId', params.userId);
    const qs = sp.toString();
    return request<{ items: (CulturalItem & { ownerName?: string; ownerUsername?: string })[] }>(
      `/api/cultural${qs ? `?${qs}` : ''}`
    );
  },
  addCultural: (payload: Partial<CulturalItem>) =>
    request<{ item: CulturalItem }>('/api/cultural', { method: 'POST', body: JSON.stringify(payload) }),
  updateCultural: (id: string, payload: Partial<CulturalItem>) =>
    request<{ item: CulturalItem }>(`/api/cultural/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCultural: (id: string) => request<{ ok: boolean }>(`/api/cultural/${id}`, { method: 'DELETE' }),

  // Shelves
  getShelves: (userId?: string) =>
    request<{ shelves: Shelf[] }>(`/api/shelves${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
  createShelf: (payload: { title: string; category?: string; description?: string; coverUrl?: string; isPublic?: boolean }) =>
    request<{ shelf: Shelf }>('/api/shelves', { method: 'POST', body: JSON.stringify(payload) }),
  updateShelf: (id: string, payload: Partial<Shelf>) =>
    request<{ shelf: Shelf }>(`/api/shelves/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteShelf: (id: string) => request<{ ok: boolean }>(`/api/shelves/${id}`, { method: 'DELETE' }),
  reorderShelves: (orderedIds: string[]) =>
    request<{ shelves: Shelf[] }>('/api/shelves/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) }),
  addShelfItem: (shelfId: string, item: Partial<ShelfItem>) =>
    request<{ shelf: Shelf }>(`/api/shelves/${shelfId}/items`, { method: 'POST', body: JSON.stringify(item) }),
  updateShelfItem: (shelfId: string, itemId: string, item: Partial<ShelfItem>) =>
    request<{ shelf: Shelf }>(`/api/shelves/${shelfId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(item) }),
  reorderShelfItems: (shelfId: string, orderedItemIds: string[]) =>
    request<{ shelf: Shelf }>(`/api/shelves/${shelfId}/items/reorder`, { method: 'POST', body: JSON.stringify({ orderedItemIds }) }),
  removeShelfItem: (shelfId: string, itemId: string) =>
    request<{ shelf: Shelf }>(`/api/shelves/${shelfId}/items/${itemId}`, { method: 'DELETE' }),

  // Favorites
  getFavorites: () => request<{ items: SavedItemEnriched[]; collections: FavoriteCollection[] }>('/api/favorites'),
  toggleFavorite: (postId: string, category?: FavoriteCategory, collectionId?: string | null) =>
    request<{ saved: boolean; post: PostWithAuthor }>('/api/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ postId, category, collectionId }),
    }),
  assignFavorite: (savedId: string, payload: { category?: FavoriteCategory; collectionId?: string | null }) =>
    request<{ items: SavedItemEnriched[] }>('/api/favorites/assign', {
      method: 'PATCH',
      body: JSON.stringify({ savedId, ...payload }),
    }),
  createCollection: (payload: { name: string; description?: string; isPrivate?: boolean }) =>
    request<{ collection: FavoriteCollection }>('/api/favorites/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteCollection: (id: string) =>
    request<{ ok: boolean }>(`/api/favorites/collections/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationEnriched[] }>('/api/notifications'),
  markAllNotificationsRead: () =>
    request<{ notifications: NotificationEnriched[] }>('/api/notifications/read-all', { method: 'POST' }),
  markNotificationRead: (id: string) =>
    request<{ notifications: NotificationEnriched[] }>(`/api/notifications/${id}/read`, { method: 'POST' }),

  // Search & Explore
  search: (q: string) =>
    request<{
      users: UserPublic[];
      posts: PostWithAuthor[];
      cultural: CulturalItem[];
      shelves: (Shelf & { ownerName: string; ownerUsername: string })[];
    }>(`/api/search?q=${encodeURIComponent(q)}`),
  explore: () =>
    request<{
      popularPosts: PostWithAuthor[];
      recommendedAuthors: UserPublic[];
      publicShelves: (Shelf & { ownerName: string; ownerUsername: string })[];
      culturalHighlights: CulturalItem[];
    }>('/api/explore'),

  // News (Módulo 1)
  getNews: (params?: { source?: string; category?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.source && params.source !== 'Todos') sp.set('source', params.source);
    if (params?.category && params.category !== 'Todas') sp.set('category', params.category);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    const qs = sp.toString();
    return request<{
      articles: NewsArticle[];
      lastSyncedAt: string | null;
      sourceStatuses: NewsSourceStatus[];
      isSyncing: boolean;
    }>(`/api/news${qs ? `?${qs}` : ''}`);
  },
  syncNews: () =>
    request<{
      articles: NewsArticle[];
      lastSyncedAt: string | null;
      sourceStatuses: NewsSourceStatus[];
    }>('/api/news/sync', { method: 'POST' }),

  // Spotify & Thinklive Music (Módulo 2)
  getSpotifyStatus: () =>
    request<{
      configured: boolean;
      redirectUri: string;
      connected: boolean;
      account: { displayName?: string; spotifyUserId?: string; spotifyUrl?: string } | null;
    }>('/api/spotify/status'),
  getSpotifyAuthUrl: () => request<{ url: string }>('/api/spotify/auth-url'),
  disconnectSpotify: () => request<{ ok: boolean }>('/api/spotify/disconnect', { method: 'POST' }),
  searchSpotify: (q: string, type = 'track,artist,album,playlist') =>
    request<{
      tracks: SpotifyItemRef[];
      artists: SpotifyItemRef[];
      albums: SpotifyItemRef[];
      playlists: SpotifyItemRef[];
    }>(`/api/spotify/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`),
  getSpotifyDiscoveries: () =>
    request<{
      connected: boolean;
      topTracks: SpotifyItemRef[];
      topArtists: SpotifyItemRef[];
      playlists: SpotifyItemRef[];
    }>('/api/spotify/discoveries'),

  // Profile Music Library (Módulo 3)
  getMusicLibrary: () => request<{ musicLibrary: MusicLibrary }>('/api/music-library'),
  updateMusicLibrary: (payload: {
    favoriteTrack?: SpotifyItemRef | null;
    addArtist?: SpotifyItemRef;
    removeArtistId?: string;
    addAlbum?: SpotifyItemRef;
    removeAlbumId?: string;
    addPlaylist?: SpotifyItemRef;
    removePlaylistId?: string;
  }) =>
    request<{ musicLibrary: MusicLibrary; user: UserPublic }>('/api/music-library', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  createMusicCollection: (payload: { name: string; description?: string; initialItem?: SpotifyItemRef }) =>
    request<{ musicLibrary: MusicLibrary }>('/api/music-library/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addItemToMusicCollection: (collectionId: string, item: SpotifyItemRef) =>
    request<{ musicLibrary: MusicLibrary }>(`/api/music-library/collections/${collectionId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  deleteMusicCollection: (collectionId: string) =>
    request<{ musicLibrary: MusicLibrary }>(`/api/music-library/collections/${collectionId}`, {
      method: 'DELETE',
    }),

  // Catálogo Filmes, Séries e Livros
  getMoviesCatalog: (params?: {
    kind?: string;
    genre?: string;
    year?: string;
    sort?: string;
    q?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.kind && params.kind !== 'todos') sp.set('kind', params.kind);
    if (params?.genre && params.genre !== 'Todos') sp.set('genre', params.genre);
    if (params?.year && params.year !== 'Todos') sp.set('year', params.year);
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    const qs = sp.toString();
    return request<{
      provider: 'tmdb' | 'imdb_tvmaze';
      featuredReleases: CatalogWork[];
      suggestions: CatalogWork[];
      items: CatalogWork[];
      genres: string[];
    }>(`/api/catalog/movies${qs ? `?${qs}` : ''}`);
  },

  getBooksCatalog: (params?: {
    genre?: string;
    sort?: string;
    q?: string;
    mode?: 'all' | 'title' | 'author';
  }) => {
    const sp = new URLSearchParams();
    if (params?.genre && params.genre !== 'Todos') sp.set('genre', params.genre);
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    if (params?.mode) sp.set('mode', params.mode);
    const qs = sp.toString();
    return request<{
      provider: 'google_books' | 'open_library' | 'apple_books';
      featured: CatalogWork[];
      items: CatalogWork[];
      genres: string[];
    }>(`/api/catalog/books${qs ? `?${qs}` : ''}`);
  },

  getCatalogWork: (workId: string) =>
    request<{
      work: CatalogWork;
      reviews: MediaReviewEnriched[];
      comments: MediaCommentEnriched[];
      myReview: MediaReviewEnriched | null;
      myShelf: MediaShelfEntry | null;
    }>(`/api/catalog/work/${encodeURIComponent(workId)}`),

  saveWorkReview: (
    workId: string,
    payload: { rating: number; review: string; workSnapshot: CatalogWorkSnapshot }
  ) =>
    request<{
      reviews: MediaReviewEnriched[];
      myReview: MediaReviewEnriched | null;
      communityAverage: number | null;
      communityReviewCount: number;
    }>(`/api/catalog/work/${encodeURIComponent(workId)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteWorkReview: (workId: string) =>
    request<{
      reviews: MediaReviewEnriched[];
      myReview: null;
      communityAverage: number | null;
      communityReviewCount: number;
    }>(`/api/catalog/work/${encodeURIComponent(workId)}/reviews`, {
      method: 'DELETE',
    }),

  addWorkComment: (workId: string, content: string, mediaKind: CatalogMediaKind) =>
    request<{ comments: MediaCommentEnriched[] }>(
      `/api/catalog/work/${encodeURIComponent(workId)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ content, mediaKind }),
      }
    ),

  deleteWorkComment: (commentId: string) =>
    request<{ comments: MediaCommentEnriched[] }>(
      `/api/catalog/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' }
    ),

  updateWorkShelf: (
    workId: string,
    payload: {
      status?: MediaShelfStatus | null;
      isFavorite?: boolean;
      workSnapshot: CatalogWorkSnapshot;
    }
  ) =>
    request<{ myShelf: MediaShelfEntry | null }>(
      `/api/catalog/work/${encodeURIComponent(workId)}/shelf`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  getMyMediaLibrary: () =>
    request<{ reviews: MediaReviewEnriched[]; shelfEntries: MediaShelfEntry[] }>(
      '/api/catalog/my-library'
    ),

  // Diário
  getPublicDiary: (params?: { sort?: 'newest' | 'oldest'; q?: string; month?: string }) => {
    const sp = new URLSearchParams();
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    if (params?.month) sp.set('month', params.month);
    const qs = sp.toString();
    return request<{ entries: DiaryEntryEnriched[] }>(`/api/diary/public${qs ? `?${qs}` : ''}`);
  },
  getMyDiary: (params?: {
    sort?: 'newest' | 'oldest';
    visibility?: 'all' | DiaryVisibility;
    q?: string;
    month?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.visibility) sp.set('visibility', params.visibility);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    if (params?.month) sp.set('month', params.month);
    const qs = sp.toString();
    return request<{ entries: DiaryEntryEnriched[] }>(`/api/diary/mine${qs ? `?${qs}` : ''}`);
  },
  createDiaryEntry: (payload: {
    title: string;
    content: string;
    visibility: DiaryVisibility;
    mood?: string;
  }) => request<{ entry: DiaryEntryEnriched }>('/api/diary', { method: 'POST', body: JSON.stringify(payload) }),
  updateDiaryEntry: (
    id: string,
    payload: { title?: string; content?: string; visibility?: DiaryVisibility; mood?: string }
  ) =>
    request<{ entry: DiaryEntryEnriched }>(`/api/diary/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteDiaryEntry: (id: string) =>
    request<{ ok: boolean }>(`/api/diary/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  toggleDiaryLike: (id: string) =>
    request<{ entry: DiaryEntryEnriched }>(`/api/diary/${encodeURIComponent(id)}/like`, {
      method: 'POST',
    }),

  // Podcasts
  getPodcastCatalog: (params?: { genre?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.genre && params.genre !== 'Todos') sp.set('genre', params.genre);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    const qs = sp.toString();
    return request<{
      genres: PodcastGenre[];
      items: PodcastEpisode[];
      recent: PodcastEpisode[];
      recommended: PodcastEpisode[];
      userState: UserPodcastState | null;
    }>(`/api/podcasts/catalog${qs ? `?${qs}` : ''}`);
  },
  savePodcastPreferences: (favoriteGenres: PodcastGenre[]) =>
    request<{ userState: UserPodcastState }>('/api/podcasts/preferences', {
      method: 'PUT',
      body: JSON.stringify({ favoriteGenres }),
    }),
  togglePodcastFavorite: (episode: PodcastEpisode) =>
    request<{ userState: UserPodcastState; isFavorite: boolean }>('/api/podcasts/favorites', {
      method: 'POST',
      body: JSON.stringify({ episode }),
    }),
  savePodcastProgress: (payload: {
    episodeId: string;
    positionSec: number;
    durationSec: number;
    episodeSnapshot?: PodcastEpisode;
  }) =>
    request<{ userState: UserPodcastState }>('/api/podcasts/progress', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Arte e Cultura
  getArtCulture: (params?: { theme?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.theme && params.theme !== 'Todos') sp.set('theme', params.theme);
    if (params?.q?.trim()) sp.set('q', params.q.trim());
    const qs = sp.toString();
    return request<{ themes: ArtCultureTheme[]; items: ArtCultureItem[] }>(
      `/api/art-culture${qs ? `?${qs}` : ''}`
    );
  },
};

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

export async function readImageFileOptimized(file: File, maxDimension = 1600): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  // Keep animated GIFs or very small files (< 250KB) untouched
  if (file.type === 'image/gif' || file.size < 250 * 1024) {
    return rawDataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', 0.84);
        resolve(compressed.startsWith('data:image/') ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
