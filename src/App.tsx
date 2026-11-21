import { useCallback, useEffect, useState } from 'react';
import { ActivityView } from './components/ActivityView';
import { AmbientSoundProvider } from './components/AmbientSoundContext';
import { ArtCultureHubView } from './components/ArtCultureHubView';
import { AuthAccountModal } from './components/AuthAccountModal';
import { BooksHubView } from './components/BooksHubView';
import { BottomNav, MainTab } from './components/BottomNav';
import { CulturalHubView } from './components/CulturalHubView';
import { CustomizeSpaceModal } from './components/CustomizeSpaceModal';
import { DeveloperAdminModal } from './components/DeveloperAdminModal';
import { DiaryHubView } from './components/DiaryHubView';
import { ExploreSearchView } from './components/ExploreSearchView';
import { FavoritesView } from './components/FavoritesView';
import { FeedView } from './components/FeedView';
import { GlobalAmbientSoundWidget } from './components/GlobalAmbientSoundWidget';
import { MoviesSeriesHubView } from './components/MoviesSeriesHubView';
import { NewsHubView } from './components/NewsHubView';
import { PhotographyHubView } from './components/PhotographyHubView';
import { PodcastsHubView } from './components/PodcastsHubView';
import { PoemasHubView } from './components/PoemasHubView';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileView } from './components/ProfileView';
import { PublishEditorModal } from './components/PublishEditorModal';
import { ReportModal } from './components/ReportModal';
import { SeasonalAtmosphereBackground } from './components/SeasonalAtmosphereBackground';
import { SiteConfigProvider, useSiteConfig } from './components/SiteConfigContext';
import { TopBar } from './components/TopBar';
import { WorkDetailView } from './components/WorkDetailView';
import { api } from './lib/api';
import {
  readGuestBookShelves,
  syncGuestBookShelvesToAccount,
} from './lib/bookLibrary';
import { initAutumnHoverGlow } from './lib/hoverGlow';
import { applySeasonToDocument, getStoredSeason, normalizeSeasonId } from './lib/themes';
import { NotificationEnriched, PostWithAuthor, SeasonId, TopCategory, UserPublic } from './types/thinklive';

function sanitizeBannerHref(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return trimmed;
  } catch {
    return null;
  }
  return null;
}

type AppPage =
  | { kind: 'feed'; category: TopCategory }
  | { kind: 'poemas'; category: 'Poemas' }
  | { kind: 'news'; category: 'Notícias' }
  | { kind: 'fotografia'; category: 'Fotografia' }
  | { kind: 'podcasts'; category: 'Podcasts' }
  | { kind: 'diarios'; category: 'Diários' }
  | { kind: 'arte_cultura'; category: 'Arte e cultura' }
  | { kind: 'cultural'; area: 'filmes' | 'livros' | 'musicas'; category: TopCategory }
  | { kind: 'work'; workId: string; returnTo: AppPage; backLabel: string }
  | { kind: 'favorites' }
  | { kind: 'activity' }
  | { kind: 'profile'; username: string }
  | { kind: 'explore'; mode: 'explore' | 'search'; initialQuery?: string };

function AppContent() {
  const { siteConfig, adminStatus, refreshSiteConfig, refreshAdminStatus, activateDevToken } =
    useSiteConfig();
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [page, setPage] = useState<AppPage>({ kind: 'feed', category: 'Início' });
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [authors, setAuthors] = useState<UserPublic[]>([]);
  const [notifications, setNotifications] = useState<NotificationEnriched[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Modals & Overlays
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithAuthor | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [devAdminOpen, setDevAdminOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'post' | 'user' | 'comment';
    id: string;
    label: string;
  } | null>(null);

  const [profileRefreshSignal, setProfileRefreshSignal] = useState(0);
  const [activeSeason, setActiveSeason] = useState<SeasonId>(() => getStoredSeason());
  const [viewedProfileSeason, setViewedProfileSeason] = useState<SeasonId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const loadFeedData = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const [postsRes, usersRes] = await Promise.all([api.getPosts(), api.getUsers()]);
      setPosts(postsRes.posts);
      setAuthors(usersRes.users);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const loadNotifications = useCallback(async (user: UserPublic | null) => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    api.me().then(async (res) => {
      setCurrentUser(res.user);
      if (res.user?.customization?.seasonTheme) {
        setActiveSeason(normalizeSeasonId(res.user.customization.seasonTheme));
      }
      if (res.user && readGuestBookShelves().length > 0) {
        try {
          const lib = await api.getMyMediaLibrary();
          await syncGuestBookShelvesToAccount(
            lib.shelfEntries.filter((s) => s.mediaKind === 'livro')
          );
          setProfileRefreshSignal((s) => s + 1);
        } catch {
          // ignore
        }
      }
      loadNotifications(res.user);
    });
    loadFeedData();
  }, [loadFeedData, loadNotifications]);

  useEffect(() => {
    applySeasonToDocument(activeSeason);
  }, [activeSeason]);

  useEffect(() => {
    if (page.kind !== 'profile') {
      setViewedProfileSeason(null);
    }
  }, [page.kind]);

  useEffect(() => {
    return initAutumnHoverGlow();
  }, []);

  // Secret developer triggers: URL hash (#dev-adm) & keyboard shortcut (Ctrl+Shift+D / Cmd+Shift+D)
  useEffect(() => {
    function checkHash() {
      if (window.location.hash === '#dev-adm') {
        setDevAdminOpen(true);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
    function handleShortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDevAdminOpen(true);
      }
    }
    checkHash();
    window.addEventListener('hashchange', checkHash);
    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('hashchange', checkHash);
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  // Apply siteConfig default season for visitors who haven't customized their personal season
  useEffect(() => {
    if (!currentUser?.customization?.seasonTheme && siteConfig.defaultSeason) {
      setActiveSeason(normalizeSeasonId(siteConfig.defaultSeason));
    }
  }, [currentUser?.customization?.seasonTheme, siteConfig.defaultSeason]);

  function handleSelectCategory(cat: TopCategory) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (cat === 'Poemas') {
      setPage({ kind: 'poemas', category: 'Poemas' });
    } else if (cat === 'Notícias') {
      setPage({ kind: 'news', category: 'Notícias' });
    } else if (cat === 'Fotografia') {
      setPage({ kind: 'fotografia', category: 'Fotografia' });
    } else if (cat === 'Podcasts') {
      setPage({ kind: 'podcasts', category: 'Podcasts' });
    } else if (cat === 'Diários') {
      setPage({ kind: 'diarios', category: 'Diários' });
    } else if (cat === 'Arte e cultura') {
      setPage({ kind: 'arte_cultura', category: 'Arte e cultura' });
    } else if (cat === 'Filmes & Séries') {
      setPage({ kind: 'cultural', area: 'filmes', category: cat });
    } else if (cat === 'Livros') {
      setPage({ kind: 'cultural', area: 'livros', category: cat });
    } else if (cat === 'Músicas') {
      setPage({ kind: 'cultural', area: 'musicas', category: cat });
    } else {
      setPage({ kind: 'feed', category: cat });
    }
  }

  function handleBottomTab(tab: MainTab) {
    if (tab === 'publicar') {
      setEditingPost(null);
      setPublishOpen(true);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tab === 'inicio') {
      setPage({ kind: 'feed', category: 'Início' });
    } else if (tab === 'explorar') {
      setPage({ kind: 'explore', mode: 'explore' });
    } else if (tab === 'favoritos') {
      setPage({ kind: 'favorites' });
    } else if (tab === 'perfil') {
      if (!currentUser) {
        setAuthModalOpen(true);
      } else {
        setPage({ kind: 'profile', username: currentUser.username });
      }
    }
  }

  async function handleToggleLike(postId: string) {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    const res = await api.toggleLike(postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
  }

  async function handleToggleFavorite(postId: string) {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    const res = await api.toggleFavorite(postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
    showToast(res.saved ? 'Salvo nos seus Favoritos.' : 'Removido dos Favoritos.');
  }

  async function handleToggleFollow(userId: string) {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    const res = await api.toggleFollow(userId);
    setAuthors((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
    setPosts((prev) =>
      prev.map((p) => (p.authorId === userId ? { ...p, author: res.user } : p))
    );
    showToast(res.user.isFollowing ? `Você seguiu ${res.user.displayName}.` : `Deixou de seguir ${res.user.displayName}.`);
  }

  async function handleShare(post: PostWithAuthor) {
    const res = await api.sharePost(post.id);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? res.post : p)));
    const shareUrl = `${window.location.origin}/#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link da publicação copiado para compartilhar.');
    } catch {
      showToast('Compartilhamento registrado.');
    }
  }

  async function handleDeletePost(postId: string) {
    await api.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setProfileRefreshSignal((s) => s + 1);
    showToast('Publicação excluída.');
  }

  async function handleBlockUser(userId: string, name: string) {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    const res = await api.toggleBlock(userId);
    if (res.blocked) {
      setPosts((prev) => prev.filter((p) => p.authorId !== userId));
      setAuthors((prev) => prev.filter((u) => u.id !== userId));
      showToast(`${name} foi bloqueado.`);
      if (page.kind === 'profile') {
        setPage({ kind: 'feed', category: 'Início' });
      }
    }
  }

  function handleOpenAuthor(username: string) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage({ kind: 'profile', username });
  }

  function handleOpenWork(workId: string, backLabel?: string) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const returnTo = page;
    const label =
      backLabel ||
      (page.kind === 'cultural' && page.area === 'livros'
        ? 'Voltar para Livros'
        : page.kind === 'cultural' && page.area === 'filmes'
        ? 'Voltar para Filmes & Séries'
        : page.kind === 'profile'
        ? 'Voltar ao perfil'
        : 'Voltar ao catálogo');
    setPage({ kind: 'work', workId, returnTo, backLabel: label });
  }

  const activeCategory: TopCategory =
    page.kind === 'feed' ||
    page.kind === 'poemas' ||
    page.kind === 'cultural' ||
    page.kind === 'news' ||
    page.kind === 'fotografia' ||
    page.kind === 'podcasts' ||
    page.kind === 'diarios' ||
    page.kind === 'arte_cultura'
      ? page.category
      : page.kind === 'work' && page.returnTo.kind === 'cultural'
      ? page.returnTo.category
      : 'Início';

  const activeBottomTab: MainTab =
    page.kind === 'explore'
      ? 'explorar'
      : page.kind === 'favorites'
      ? 'favoritos'
      : page.kind === 'profile'
      ? 'perfil'
      : 'inicio';

  const unreadCount = notifications.filter((n) => !n.read).length;

  const pageTransitionKey =
    page.kind === 'feed'
      ? `feed-${page.category}`
      : page.kind === 'cultural'
      ? `cultural-${page.area}`
      : page.kind === 'work'
      ? `work-${page.workId}`
      : page.kind === 'profile'
      ? `profile-${page.username}`
      : page.kind;

  const effectiveAtmosphereSeason =
    page.kind === 'profile' && viewedProfileSeason ? viewedProfileSeason : activeSeason;

  const isDeveloperSession = adminStatus.unlocked || Boolean(currentUser?.isDeveloperAdmin);
  const announcement = siteConfig.announcement;
  const safeBannerLink = sanitizeBannerHref(announcement?.linkUrl);

  return (
    <AmbientSoundProvider>
    <div className="min-h-screen autumn-paper-canvas text-tl-marrom flex flex-col relative">
      {/* Interactive Seasonal Atmosphere Layer (pointer-events-none, interactive on cursor hover) */}
      <SeasonalAtmosphereBackground season={effectiveAtmosphereSeason} />

      <div className="relative flex flex-col flex-1">
        <TopBar
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          onOpenSearch={() => setPage({ kind: 'explore', mode: 'search' })}
          onOpenExplore={() => setPage({ kind: 'explore', mode: 'explore' })}
          onOpenActivity={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setPage({ kind: 'activity' });
            loadNotifications(currentUser);
          }}
          unreadNotifications={unreadCount}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenOwnProfile={() => currentUser && handleOpenAuthor(currentUser.username)}
          currentUser={currentUser}
          isExploreActive={page.kind === 'explore'}
          isActivityActive={page.kind === 'activity'}
          transparentHome={page.kind === 'feed' && page.category === 'Início'}
          hiddenCategories={siteConfig.hiddenCategories}
          brandName={siteConfig.brandName}
          brandTagline={siteConfig.brandTagline}
          showDeveloperButton={isDeveloperSession}
          onOpenDeveloperAdmin={() => setDevAdminOpen(true)}
        />

        {announcement?.enabled && announcement.message?.trim() && (
          <div
            role="region"
            aria-label="Aviso editorial"
            className={`w-full border-b px-4 py-2 text-center text-xs md:text-[13px] ${
              announcement.tone === 'terracota'
                ? 'bg-tl-terracota text-[#FAF5EC] border-tl-marrom/20'
                : announcement.tone === 'dark'
                ? 'bg-tl-marrom text-[#FAF5EC] border-[#F2B880]/25'
                : 'bg-tl-areia/75 text-tl-marrom border-tl-marrom/15'
            }`}
          >
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className="font-literary">{announcement.message}</span>
              {safeBannerLink && announcement.linkLabel?.trim() && (
                <a
                  href={safeBannerLink}
                  target={safeBannerLink.startsWith('http') ? '_blank' : undefined}
                  rel={safeBannerLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="underline underline-offset-4 font-semibold hover:opacity-85"
                >
                  {announcement.linkLabel}
                </a>
              )}
            </div>
          </div>
        )}

        <main key={pageTransitionKey} className="flex-1 animate-page-enter">
          {page.kind === 'feed' && (
            <FeedView
              category={page.category}
              activeSeason={activeSeason}
              posts={posts}
              authors={authors}
              currentUser={currentUser}
              loading={loadingPosts}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onToggleFollow={handleToggleFollow}
              onShare={handleShare}
              onEditPost={(p) => {
                setEditingPost(p);
                setPublishOpen(true);
              }}
              onDeletePost={handleDeletePost}
              onReport={(type, id, label) => {
                if (!currentUser) setAuthModalOpen(true);
                else setReportTarget({ type, id, label });
              }}
              onBlockUser={handleBlockUser}
              onOpenPublish={() => {
                setEditingPost(null);
                setPublishOpen(true);
              }}
              onNavigateCategory={handleSelectCategory}
              onSearchSubmit={(query) => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setPage({ kind: 'explore', mode: 'search', initialQuery: query });
              }}
            />
          )}

          {page.kind === 'poemas' && (
            <PoemasHubView
              poems={posts.filter((p) => p.category === 'Poemas' || p.type === 'poema')}
              currentUser={currentUser}
              loading={loadingPosts}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onEditPost={(p) => {
                setEditingPost(p);
                setPublishOpen(true);
              }}
              onDeletePost={handleDeletePost}
              onReport={(type, id, label) => {
                if (!currentUser) setAuthModalOpen(true);
                else setReportTarget({ type, id, label });
              }}
              onBlockUser={handleBlockUser}
              onOpenPublishPoem={() => {
                setEditingPost(null);
                setPublishOpen(true);
              }}
            />
          )}

          {page.kind === 'news' && (
            <NewsHubView
              communityPosts={posts.filter((p) => p.category === 'Notícias')}
              currentUser={currentUser}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onEditPost={(p) => {
                setEditingPost(p);
                setPublishOpen(true);
              }}
              onDeletePost={handleDeletePost}
              onOpenPublish={() => {
                setEditingPost(null);
                setPublishOpen(true);
              }}
            />
          )}

          {page.kind === 'fotografia' && (
            <PhotographyHubView
              photos={posts.filter((p) => p.category === 'Fotografia' || p.type === 'fotografia')}
              currentUser={currentUser}
              onCreated={(created) => {
                setPosts((prev) => [created, ...prev]);
                setProfileRefreshSignal((s) => s + 1);
              }}
              onUpdated={(updated) => {
                setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              }}
              onDeleted={handleDeletePost}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onRequireAuth={() => setAuthModalOpen(true)}
              onNotify={showToast}
            />
          )}

          {page.kind === 'podcasts' && (
            <PodcastsHubView
              currentUser={currentUser}
              relatedPosts={posts.filter((p) => p.category === 'Podcasts' || p.type === 'podcast')}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onRequireAuth={() => setAuthModalOpen(true)}
              onOpenPublish={() => {
                setEditingPost(null);
                setPublishOpen(true);
              }}
              onNotify={showToast}
            />
          )}

          {page.kind === 'diarios' && (
            <DiaryHubView
              currentUser={currentUser}
              onOpenAuthor={handleOpenAuthor}
              onRequireAuth={() => setAuthModalOpen(true)}
              onNotify={showToast}
            />
          )}

          {page.kind === 'arte_cultura' && (
            <ArtCultureHubView
              currentUser={currentUser}
              relatedPosts={posts.filter((p) => p.category === 'Arte e cultura' || p.type === 'arte_cultura')}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onRequireAuth={() => setAuthModalOpen(true)}
              onOpenPublish={() => {
                setEditingPost(null);
                setPublishOpen(true);
              }}
              onShelfUpdated={() => setProfileRefreshSignal((s) => s + 1)}
              onNotify={showToast}
            />
          )}

          {page.kind === 'cultural' && page.area === 'filmes' && (
            <MoviesSeriesHubView
              currentUser={currentUser}
              relatedPosts={posts.filter((p) => p.category === 'Filmes & Séries')}
              onOpenWork={(workId) => handleOpenWork(workId, 'Voltar para Filmes & Séries')}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onRequireAuth={() => setAuthModalOpen(true)}
              onNotify={showToast}
              libraryRefreshSignal={profileRefreshSignal}
            />
          )}

          {page.kind === 'cultural' && page.area === 'livros' && (
            <BooksHubView
              currentUser={currentUser}
              relatedPosts={posts.filter((p) => p.category === 'Livros')}
              onOpenWork={(workId) => handleOpenWork(workId, 'Voltar para Livros')}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onRequireAuth={() => setAuthModalOpen(true)}
              onNotify={showToast}
              libraryRefreshSignal={profileRefreshSignal}
            />
          )}

          {page.kind === 'cultural' && page.area === 'musicas' && (
            <CulturalHubView
              area={page.area}
              currentUser={currentUser}
              relatedPosts={posts.filter((p) => p.category === page.category)}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onRequireAuth={() => setAuthModalOpen(true)}
            />
          )}

          {page.kind === 'work' && (
            <WorkDetailView
              workId={page.workId}
              backLabel={page.backLabel}
              currentUser={currentUser}
              onBack={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setPage(page.returnTo);
              }}
              onOpenAuthor={handleOpenAuthor}
              onRequireAuth={() => setAuthModalOpen(true)}
              onNotify={showToast}
              onLibraryChanged={() => setProfileRefreshSignal((s) => s + 1)}
            />
          )}

          {page.kind === 'favorites' && (
            <FavoritesView
              currentUser={currentUser}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onRequireAuth={() => setAuthModalOpen(true)}
            />
          )}

          {page.kind === 'activity' && (
            <ActivityView
              currentUser={currentUser}
              notifications={notifications}
              onMarkAllRead={async () => {
                const res = await api.markAllNotificationsRead();
                setNotifications(res.notifications);
              }}
              onMarkRead={async (id) => {
                const res = await api.markNotificationRead(id);
                setNotifications(res.notifications);
              }}
              onOpenPostId={(id) => setOpenPostId(id)}
              onOpenAuthor={handleOpenAuthor}
              onRequireAuth={() => setAuthModalOpen(true)}
            />
          )}

          {page.kind === 'profile' && (
            <ProfileView
              username={page.username}
              currentUser={currentUser}
              onProfileSeasonChange={setViewedProfileSeason}
              onProfileUpdated={(updated) => {
                if (currentUser?.id === updated.id) setCurrentUser(updated);
              }}
              onOpenWork={(workId) => handleOpenWork(workId, 'Voltar ao perfil')}
              onOpenPostId={(pid) => setOpenPostId(pid)}
              onOpenBooks={() => handleSelectCategory('Livros')}
              onOpenMovies={() => handleSelectCategory('Filmes & Séries')}
              onLibraryChanged={() => setProfileRefreshSignal((s) => s + 1)}
              onNotify={showToast}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              onEditPost={(p) => {
                setEditingPost(p);
                setPublishOpen(true);
              }}
              onDeletePost={handleDeletePost}
              onOpenCustomize={() => setCustomizeOpen(true)}
              onOpenAccountSettings={() => setAuthModalOpen(true)}
              onRequireAuth={() => setAuthModalOpen(true)}
              onReport={(type, id, label) => {
                if (!currentUser) setAuthModalOpen(true);
                else setReportTarget({ type, id, label });
              }}
              onBlockUser={handleBlockUser}
              refreshSignal={profileRefreshSignal}
            />
          )}

          {page.kind === 'explore' && (
            <ExploreSearchView
              initialMode={page.mode}
              initialQuery={page.initialQuery}
              currentUser={currentUser}
              onOpenPost={(p) => setOpenPostId(p.id)}
              onOpenAuthor={handleOpenAuthor}
              onToggleLike={handleToggleLike}
              onToggleFavorite={handleToggleFavorite}
              onToggleFollow={handleToggleFollow}
              onShare={handleShare}
            />
          )}
        </main>

        <BottomNav
          activeTab={activeBottomTab}
          onSelectTab={handleBottomTab}
        />
      </div>

      {/* Modals */}
      <PostDetailModal
        postId={openPostId}
        currentUser={currentUser}
        onClose={() => setOpenPostId(null)}
        onOpenAuthor={handleOpenAuthor}
        onToggleLike={handleToggleLike}
        onToggleFavorite={handleToggleFavorite}
        onShare={handleShare}
        onRequireAuth={() => setAuthModalOpen(true)}
        onReport={(type, id, label) => {
          if (!currentUser) setAuthModalOpen(true);
          else setReportTarget({ type, id, label });
        }}
        onShelfUpdated={() => setProfileRefreshSignal((s) => s + 1)}
      />

      <PublishEditorModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        currentUser={currentUser}
        editingPost={editingPost}
        defaultType={page.kind === 'poemas' ? 'poema' : 'artigo'}
        defaultCategory={page.kind === 'poemas' ? 'Poemas' : 'Artigos'}
        onSaved={(savedPost) => {
          if (savedPost.status === 'published') {
            setPosts((prev) => {
              const exists = prev.some((p) => p.id === savedPost.id);
              return exists ? prev.map((p) => (p.id === savedPost.id ? savedPost : p)) : [savedPost, ...prev];
            });
            showToast('Publicação no ar!');
          } else {
            showToast('Rascunho salvo com segurança.');
          }
          setProfileRefreshSignal((s) => s + 1);
        }}
        onRequireAuth={() => {
          setPublishOpen(false);
          setAuthModalOpen(true);
        }}
      />

      <AuthAccountModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthChanged={async (user) => {
          setCurrentUser(user);
          if (user?.customization?.seasonTheme) {
            setActiveSeason(normalizeSeasonId(user.customization.seasonTheme));
          }
          if (user && readGuestBookShelves().length > 0) {
            try {
              const lib = await api.getMyMediaLibrary();
              await syncGuestBookShelvesToAccount(
                lib.shelfEntries.filter((s) => s.mediaKind === 'livro')
              );
            } catch {
              // ignore
            }
          }
          loadNotifications(user);
          loadFeedData();
          refreshAdminStatus();
          setProfileRefreshSignal((s) => s + 1);
          if (user) {
            showToast(`Conectado como ${user.displayName}.`);
          } else {
            api.lockAdmin().catch(() => {});
            activateDevToken(null);
            showToast('Sessão encerrada.');
          }
        }}
      />

      {currentUser && (
        <CustomizeSpaceModal
          isOpen={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          user={currentUser}
          onSaved={(updated) => {
            const nextSeason = normalizeSeasonId(updated.customization.seasonTheme);
            setCurrentUser(updated);
            setActiveSeason(nextSeason);
            if (page.kind === 'profile' && updated.username !== page.username) {
              setPage({ kind: 'profile', username: updated.username });
            }
            setProfileRefreshSignal((s) => s + 1);
            loadFeedData();
            showToast('Personalização do perfil salva!');
          }}
        />
      )}

      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmitted={(msg) => showToast(msg)}
      />

      <DeveloperAdminModal
        isOpen={devAdminOpen}
        onClose={() => setDevAdminOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updated) => {
          setCurrentUser(updated);
          refreshAdminStatus();
        }}
        onSiteDataChanged={() => {
          refreshSiteConfig();
          loadFeedData();
          setProfileRefreshSignal((s) => s + 1);
        }}
        onNotify={showToast}
      />

      <GlobalAmbientSoundWidget />

      {/* Autumn Editorial Toast Banner */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium editorial-shadow border border-tl-areia/30"
        >
          {toast}
        </div>
      )}
    </div>
    </AmbientSoundProvider>
  );
}

export default function App() {
  return (
    <SiteConfigProvider>
      <AppContent />
    </SiteConfigProvider>
  );
}
