import {
  BookMarked,
  BookOpen,
  Camera,
  Check,
  ExternalLink,
  Film,
  Flag,
  Flower2,
  Heart,
  Image as ImageIcon,
  Lock,
  Palette,
  Plus,
  Quote,
  Settings,
  ShieldBan,
  Sparkles,
  Star,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { ChangeEvent, type CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, readImageFileOptimized } from '../lib/api';
import {
  BOOK_SHELF_LABELS,
  deduplicateBookShelves,
  isSameBookEntry,
} from '../lib/bookLibrary';
import {
  BANNER_PRESETS,
  DEFAULT_SHELF_CONFIG,
  ensureAccessibleTheme,
  getBackgroundTextureStyle,
  getBannerFilterCss,
  getButtonShapeClasses,
  getFontCss,
  normalizeProfileSectionOrder,
  normalizeSeasonId,
} from '../lib/themes';
import {
  BannerFilterMode,
  BookShelfStatus,
  CulturalItem,
  MediaReviewEnriched,
  MediaShelfEntry,
  MediaShelfStatus,
  MovieShelfStatus,
  PostWithAuthor,
  ProfileCardStyle,
  ProfileOrnamentStyle,
  SeasonId,
  Shelf,
  ShelfItem,
  ShelfVisualConfig,
  UserPublic,
} from '../types/thinklive';
import { CatalogCover } from './CatalogCover';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback, UserAvatar } from './ImageWithFallback';
import { PostCard } from './PostCard';
import {
  RealisticBookshelf,
  ShelfDetailModal,
  ShelfDisplaySelection,
  WoodenCustomShelf,
} from './RealisticBookshelf';

interface ProfileViewProps {
  username: string;
  currentUser: UserPublic | null;
  onProfileSeasonChange?: (season: SeasonId) => void;
  onProfileUpdated?: (user: UserPublic) => void;
  onOpenWork?: (workId: string) => void;
  onOpenPostId?: (postId: string) => void;
  onOpenBooks?: () => void;
  onOpenMovies?: () => void;
  onLibraryChanged?: () => void;
  onNotify?: (msg: string) => void;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onEditPost: (post: PostWithAuthor) => void;
  onDeletePost: (postId: string) => void;
  onOpenCustomize: () => void;
  onOpenAccountSettings: () => void;
  onRequireAuth: () => void;
  onReport: (targetType: 'user' | 'post', targetId: string, label: string) => void;
  onBlockUser: (userId: string, name: string) => void;
  refreshSignal: number;
}

const SHELF_STATUS_LABELS: Record<MediaShelfStatus, string> = {
  quero_assistir: 'Quero assistir',
  ja_assistido: 'Já assisti',
  quero_ler: 'Quero ler',
  lendo: 'Lendo atualmente',
  ja_li: 'Já li',
  abandonado: 'Abandonados',
};

function getCardAppearance(
  cardStyle: ProfileCardStyle | undefined,
  surfaceColor: string,
  textColor: string,
  accentColor: string
): { className: string; style: CSSProperties } {
  const mode = cardStyle ?? 'editorial';
  if (mode === 'diary') {
    return {
      className: 'rounded-[28px] border editorial-shadow backdrop-blur-[2px]',
      style: {
        backgroundColor: surfaceColor,
        borderColor: `${accentColor}30`,
        boxShadow: `0 12px 30px -16px ${textColor}24`,
      },
    };
  }
  if (mode === 'glass') {
    return {
      className: 'rounded-3xl border backdrop-blur-md',
      style: {
        backgroundColor: `${surfaceColor}D9`,
        borderColor: `${textColor}22`,
        boxShadow: `0 14px 32px -18px ${textColor}28`,
      },
    };
  }
  if (mode === 'classic') {
    return {
      className: 'rounded-xl border-2',
      style: {
        backgroundColor: surfaceColor,
        borderColor: `${accentColor}38`,
        boxShadow: `0 8px 20px -12px ${textColor}26`,
      },
    };
  }
  return {
    className: 'rounded-3xl border editorial-shadow',
    style: {
      backgroundColor: surfaceColor,
      borderColor: `${textColor}18`,
    },
  };
}

function OrnamentBadge({
  styleKind,
  accentColor,
  textColor,
}: {
  styleKind?: ProfileOrnamentStyle;
  accentColor: string;
  textColor: string;
}) {
  if (!styleKind || styleKind === 'none') return null;

  if (styleKind === 'pressed_flowers') {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border transition-transform duration-300 hover:rotate-12"
        style={{
          color: accentColor,
          borderColor: `${accentColor}38`,
          backgroundColor: `${accentColor}12`,
        }}
        title="Flores prensadas"
      >
        <Flower2 className="w-3.5 h-3.5" />
      </span>
    );
  }

  if (styleKind === 'wax_seal') {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-7 h-7 rounded-full shadow-sm font-editorial italic text-xs font-bold border transition-transform duration-300 hover:scale-105"
        style={{
          backgroundColor: accentColor,
          color: '#FFF9F5',
          borderColor: `${textColor}30`,
        }}
        title="Selo de cera editorial"
      >
        T
      </span>
    );
  }

  if (styleKind === 'gold_leaf') {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border transition-transform duration-300 hover:scale-105"
        style={{
          color: '#B5893D',
          borderColor: 'rgba(181,137,61,0.45)',
          backgroundColor: 'rgba(181,137,61,0.12)',
        }}
        title="Detalhe dourado"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </span>
    );
  }

  // ribbon
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] tracking-[0.18em] uppercase font-semibold border-y"
      style={{
        color: accentColor,
        borderColor: `${accentColor}45`,
      }}
      title="Fita de arquivo"
    >
      Ex Libris
    </span>
  );
}

export function ProfileView({
  username,
  currentUser,
  onProfileSeasonChange,
  onProfileUpdated,
  onOpenWork,
  onOpenPostId,
  onOpenBooks,
  onOpenMovies,
  onLibraryChanged,
  onNotify,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onEditPost,
  onDeletePost,
  onOpenCustomize,
  onOpenAccountSettings,
  onRequireAuth,
  onReport,
  onBlockUser,
  refreshSignal,
}: ProfileViewProps) {
  const [profileUser, setProfileUser] = useState<UserPublic | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [culturalItems, setCulturalItems] = useState<CulturalItem[]>([]);
  const [mediaReviews, setMediaReviews] = useState<MediaReviewEnriched[]>([]);
  const [mediaShelfEntries, setMediaShelfEntries] = useState<MediaShelfEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [listModal, setListModal] = useState<{ title: string; users: UserPublic[] } | null>(null);

  const [showNewShelf, setShowNewShelf] = useState(false);
  const [newShelfTitle, setNewShelfTitle] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');
  const [newShelfCover, setNewShelfCover] = useState(BANNER_PRESETS[0].url);
  const [newShelfPublic, setNewShelfPublic] = useState(true);

  const [addingToShelf, setAddingToShelf] = useState<Shelf | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemSubtitle, setItemSubtitle] = useState('');
  const [itemYear, setItemYear] = useState('');
  const [itemCoverUrl, setItemCoverUrl] = useState('');
  const [itemKind, setItemKind] = useState<ShelfItem['kind']>('livro');
  const [itemNote, setItemNote] = useState('');
  const [customShelfSelection, setCustomShelfSelection] = useState<ShelfDisplaySelection | null>(null);

  // Quick Banner Editor Modal
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [draftBannerUrl, setDraftBannerUrl] = useState('');
  const [draftBannerColor, setDraftBannerColor] = useState('');
  const [draftBannerPosY, setDraftBannerPosY] = useState(50);
  const [draftBannerFilter, setDraftBannerFilter] = useState<BannerFilterMode>('none');
  const [draftBannerQuote, setDraftBannerQuote] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const quickBannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getProfile(username)
      .then((res) => {
        setProfileUser(res.user);
        setShelves(res.shelves);
        setPosts(res.posts);
        setCulturalItems(res.culturalItems);
        setMediaReviews(res.mediaReviews || []);
        setMediaShelfEntries(res.mediaShelfEntries || []);
        onProfileSeasonChange?.(normalizeSeasonId(res.user.customization?.seasonTheme));
      })
      .finally(() => setLoading(false));
  }, [username, refreshSignal, onProfileSeasonChange]);

  const uniqueBooks = useMemo(
    () => deduplicateBookShelves(mediaShelfEntries.filter((e) => e.mediaKind === 'livro')),
    [mediaShelfEntries]
  );

  const moviesAndSeriesEntries = useMemo(
    () =>
      mediaShelfEntries.filter(
        (e) => e.mediaKind === 'filme' || e.mediaKind === 'serie'
      ),
    [mediaShelfEntries]
  );

  const favoriteMediaEntries = useMemo(
    () => mediaShelfEntries.filter((e) => e.isFavorite),
    [mediaShelfEntries]
  );

  const favoriteShelfItems = useMemo(
    () =>
      shelves.flatMap((shelf) =>
        shelf.items
          .map((item, index) => ({ shelf, item, index }))
          .filter((entry) => entry.item.isFavorite)
      ),
    [shelves]
  );

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-tl-marrom-suave">
        Abrindo caderno pessoal…
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="py-24 text-center text-sm text-tl-marrom-suave">
        Perfil não encontrado.
      </div>
    );
  }

  const isOwner = currentUser?.id === profileUser.id;
  const custom = profileUser.customization;
  const theme = ensureAccessibleTheme(custom.theme);
  const btnShape = getButtonShapeClasses(theme.buttonStyle);
  const bioSizeClass =
    theme.fontSize === 'sm' ? 'text-xs' : theme.fontSize === 'lg' ? 'text-base' : 'text-sm';
  const cardAppearance = getCardAppearance(
    theme.cardStyle,
    theme.surfaceColor,
    theme.textColor,
    theme.accentColor
  );
  const bgTextureStyle = getBackgroundTextureStyle(theme.backgroundTexture, theme.textColor);
  const ornamentStyle = theme.ornamentStyle ?? 'pressed_flowers';
  const shelfConfig: ShelfVisualConfig = custom.shelfConfig ?? DEFAULT_SHELF_CONFIG;
  const orderedSections = normalizeProfileSectionOrder(custom.sectionOrder).filter(
    (id) => !(custom.hiddenSections || []).includes(id)
  );
  const isQuoteVisible = orderedSections.includes('quote');
  const avatarPos = custom.avatarPosition ?? 'overlap';
  const bannerPosY = typeof custom.bannerPositionY === 'number' ? custom.bannerPositionY : 50;
  const bannerFilterCss = getBannerFilterCss(custom.bannerFilter);

  async function handleFollowToggle() {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const res = await api.toggleFollow(profileUser!.id);
    setProfileUser(res.user);
  }

  async function openFollowersModal() {
    const res = await api.getFollowers(profileUser!.id);
    setListModal({ title: 'Seguidores', users: res.users });
  }

  async function openFollowingModal() {
    const res = await api.getFollowing(profileUser!.id);
    setListModal({ title: 'Seguindo', users: res.users });
  }

  async function handleSaveShelfConfig(nextConfig: ShelfVisualConfig) {
    if (!isOwner || !profileUser) return;
    const nextCustomization = {
      ...profileUser.customization,
      shelfConfig: nextConfig,
    };
    const res = await api.saveCustomization({
      displayName: profileUser.displayName,
      bio: profileUser.bio,
      avatarUrl: profileUser.avatarUrl,
      customization: nextCustomization,
    });
    setProfileUser(res.user);
    onProfileUpdated?.(res.user);
    onNotify?.('Aparência da estante salva.');
  }

  function openBannerModal() {
    if (!profileUser) return;
    setDraftBannerUrl(profileUser.customization.bannerUrl || '');
    setDraftBannerColor(profileUser.customization.bannerColor || '');
    setDraftBannerPosY(
      typeof profileUser.customization.bannerPositionY === 'number'
        ? profileUser.customization.bannerPositionY
        : 50
    );
    setDraftBannerFilter(profileUser.customization.bannerFilter ?? 'none');
    setDraftBannerQuote(profileUser.customization.bannerQuote || '');
    setBannerError(null);
    setBannerModalOpen(true);
  }

  async function handleQuickBannerUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    setBannerError(null);
    try {
      const dataUrl = await readImageFileOptimized(file, 1600);
      const res = await api.uploadImage(dataUrl, 'banner');
      setDraftBannerUrl(res.url);
      setDraftBannerColor('');
    } catch (err) {
      setBannerError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar a imagem. Tente JPG, PNG ou WEBP.'
      );
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  }

  async function handleSaveQuickBanner(e: FormEvent) {
    e.preventDefault();
    if (!isOwner || !profileUser) return;
    setBannerSaving(true);
    setBannerError(null);
    try {
      const nextCustomization = {
        ...profileUser.customization,
        bannerUrl: draftBannerUrl.trim(),
        bannerColor: draftBannerColor,
        bannerPositionY: draftBannerPosY,
        bannerFilter: draftBannerFilter,
        bannerQuote: draftBannerQuote.trim(),
      };
      const res = await api.saveCustomization({
        displayName: profileUser.displayName,
        bio: profileUser.bio,
        avatarUrl: profileUser.avatarUrl,
        customization: nextCustomization,
      });
      setProfileUser(res.user);
      onProfileUpdated?.(res.user);
      setBannerModalOpen(false);
      onNotify?.('Banner do perfil atualizado!');
    } catch (err) {
      setBannerError(
        err instanceof Error ? err.message : 'Não foi possível salvar o banner.'
      );
    } finally {
      setBannerSaving(false);
    }
  }

  async function handleCreateShelf(e: FormEvent) {
    e.preventDefault();
    if (!newShelfTitle.trim()) return;
    const res = await api.createShelf({
      title: newShelfTitle.trim(),
      category: newShelfTitle.trim(),
      description: newShelfDesc.trim(),
      coverUrl: newShelfCover,
      isPublic: newShelfPublic,
    });
    setShelves((prev) => [...prev, res.shelf]);
    setNewShelfTitle('');
    setNewShelfDesc('');
    setShowNewShelf(false);
    onNotify?.(`Coleção “${res.shelf.title}” criada.`);
  }

  async function handleToggleShelfVisibility(shelf: Shelf) {
    const res = await api.updateShelf(shelf.id, { isPublic: !shelf.isPublic });
    setShelves((prev) => prev.map((s) => (s.id === shelf.id ? res.shelf : s)));
  }

  async function handleRenameShelf(shelf: Shelf, nextTitle: string) {
    const res = await api.updateShelf(shelf.id, {
      title: nextTitle,
      category: nextTitle,
    });
    setShelves((prev) => prev.map((s) => (s.id === shelf.id ? res.shelf : s)));
    onNotify?.(`Coleção renomeada para “${nextTitle}”.`);
  }

  async function handleMoveShelf(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= shelves.length) return;
    const copy = [...shelves];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    setShelves(copy);
    await api.reorderShelves(copy.map((s) => s.id));
  }

  async function handleDeleteShelf(id: string) {
    await api.deleteShelf(id);
    setShelves((prev) => prev.filter((s) => s.id !== id));
    onNotify?.('Coleção removida.');
  }

  async function handleAddShelfItem(e: FormEvent) {
    e.preventDefault();
    if (!addingToShelf || !itemTitle.trim()) return;
    const res = await api.addShelfItem(addingToShelf.id, {
      title: itemTitle.trim(),
      subtitle: itemSubtitle.trim(),
      year: itemYear.trim() || undefined,
      coverUrl: itemCoverUrl.trim() || undefined,
      kind: itemKind,
      note: itemNote.trim(),
    });
    setShelves((prev) => prev.map((s) => (s.id === addingToShelf.id ? res.shelf : s)));
    setItemTitle('');
    setItemSubtitle('');
    setItemYear('');
    setItemCoverUrl('');
    setItemNote('');
    setAddingToShelf(null);
    onNotify?.('Obra adicionada à estante.');
  }

  async function handleUpdateShelfItem(
    shelfId: string,
    itemId: string,
    patch: Partial<ShelfItem>
  ) {
    const res = await api.updateShelfItem(shelfId, itemId, patch);
    setShelves((prev) => prev.map((s) => (s.id === shelfId ? res.shelf : s)));
    setCustomShelfSelection((prev) => {
      if (!prev || prev.source !== 'shelf' || prev.shelf.id !== shelfId) return prev;
      const updatedIdx = res.shelf.items.findIndex((i) => i.id === itemId);
      if (updatedIdx === -1) return null;
      return {
        source: 'shelf',
        shelf: res.shelf,
        item: res.shelf.items[updatedIdx],
        index: updatedIdx,
      };
    });
    onNotify?.('Obra atualizada na estante.');
  }

  async function handleReorderShelfItem(
    shelfId: string,
    itemId: string,
    direction: -1 | 1
  ) {
    const shelf = shelves.find((s) => s.id === shelfId);
    if (!shelf) return;
    const currentIndex = shelf.items.findIndex((i) => i.id === itemId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= shelf.items.length) return;
    const reordered = [...shelf.items];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const res = await api.reorderShelfItems(
      shelfId,
      reordered.map((i) => i.id)
    );
    setShelves((prev) => prev.map((s) => (s.id === shelfId ? res.shelf : s)));
    setCustomShelfSelection((prev) => {
      if (!prev || prev.source !== 'shelf' || prev.shelf.id !== shelfId) return prev;
      const updatedIdx = res.shelf.items.findIndex((i) => i.id === itemId);
      if (updatedIdx === -1) return prev;
      return {
        source: 'shelf',
        shelf: res.shelf,
        item: res.shelf.items[updatedIdx],
        index: updatedIdx,
      };
    });
  }

  async function handleRemoveShelfItem(shelfId: string, itemId: string) {
    const res = await api.removeShelfItem(shelfId, itemId);
    setShelves((prev) => prev.map((s) => (s.id === shelfId ? res.shelf : s)));
    setCustomShelfSelection((prev) =>
      prev && prev.source === 'shelf' && prev.item.id === itemId ? null : prev
    );
    onNotify?.('Obra retirada da estante.');
  }

  async function handleTransferShelfItem(
    fromShelfId: string,
    toShelfId: string,
    item: ShelfItem
  ) {
    if (fromShelfId === toShelfId) return;
    const addedRes = await api.addShelfItem(toShelfId, {
      title: item.title,
      subtitle: item.subtitle,
      year: item.year,
      kind: item.kind,
      coverUrl: item.coverUrl,
      refId: item.refId,
      note: item.note,
      isFavorite: item.isFavorite,
    });
    const removedRes = await api.removeShelfItem(fromShelfId, item.id);
    setShelves((prev) =>
      prev.map((s) => {
        if (s.id === toShelfId) return addedRes.shelf;
        if (s.id === fromShelfId) return removedRes.shelf;
        return s;
      })
    );
    onNotify?.(`“${item.title}” transferido para ${addedRes.shelf.title}.`);
  }

  async function handleQuickAddKind(kind: ShelfItem['kind']) {
    const targetName =
      kind === 'poema'
        ? 'Poemas'
        : kind === 'artigo' || kind === 'publicacao'
        ? 'Artigos'
        : kind === 'anime'
        ? 'Animes'
        : kind === 'filme' || kind === 'serie'
        ? 'Filmes e séries'
        : 'Livros';
    let target = shelves.find(
      (s) =>
        s.category.toLowerCase().includes(targetName.toLowerCase().split(' ')[0]) ||
        s.title.toLowerCase().includes(targetName.toLowerCase().split(' ')[0])
    );
    if (!target) {
      const created = await api.createShelf({
        title: targetName,
        category: targetName,
        description: `Coleção pessoal de ${targetName.toLowerCase()}.`,
        isPublic: true,
      });
      target = created.shelf;
      setShelves((prev) => [...prev, target!]);
    }
    setItemKind(kind);
    setAddingToShelf(target);
  }

  async function handleUpdateMediaShelfEntry(
    entry: MediaShelfEntry,
    patch: { status?: BookShelfStatus | MovieShelfStatus | null; isFavorite?: boolean }
  ) {
    const nextStatus =
      patch.status !== undefined ? patch.status : (entry.status ?? null);
    const nextFavorite =
      patch.isFavorite !== undefined ? patch.isFavorite : entry.isFavorite;

    const res = await api.updateWorkShelf(entry.workId, {
      status: nextStatus,
      isFavorite: nextFavorite,
      workSnapshot: entry.workSnapshot,
    });

    setMediaShelfEntries((prev) => {
      if (entry.mediaKind === 'livro') {
        const otherMedia = prev.filter((s) => s.mediaKind !== 'livro');
        const remainingBooks = prev.filter(
          (s) =>
            s.mediaKind === 'livro' &&
            !isSameBookEntry(s, {
              workId: entry.workId,
              title: entry.workSnapshot.title,
              creator: entry.workSnapshot.creator,
              mediaKind: 'livro',
            })
        );
        const updatedBooks = deduplicateBookShelves(
          res.myShelf ? [res.myShelf, ...remainingBooks] : remainingBooks
        );
        return [...updatedBooks, ...otherMedia];
      }
      const remaining = prev.filter((s) => s.workId !== entry.workId);
      return res.myShelf ? [res.myShelf, ...remaining] : remaining;
    });
    onLibraryChanged?.();
    if (patch.status) {
      const label =
        entry.mediaKind === 'livro'
          ? BOOK_SHELF_LABELS[patch.status as BookShelfStatus]
          : patch.status === 'quero_assistir'
          ? 'Quero assistir'
          : 'Já assisti';
      onNotify?.(`“${entry.workSnapshot.title}” movido para ${label}.`);
    } else if (patch.isFavorite !== undefined) {
      onNotify?.(
        patch.isFavorite
          ? `“${entry.workSnapshot.title}” adicionado aos Favoritos.`
          : `“${entry.workSnapshot.title}” removido dos Favoritos.`
      );
    }
  }

  async function handleRemoveMediaShelfEntry(entry: MediaShelfEntry) {
    await api.updateWorkShelf(entry.workId, {
      status: null,
      isFavorite: false,
      workSnapshot: entry.workSnapshot,
    });
    setMediaShelfEntries((prev) =>
      prev.filter((s) => {
        if (entry.mediaKind === 'livro' && s.mediaKind === 'livro') {
          return !isSameBookEntry(s, {
            workId: entry.workId,
            title: entry.workSnapshot.title,
            creator: entry.workSnapshot.creator,
            mediaKind: 'livro',
          });
        }
        return s.workId !== entry.workId;
      })
    );
    onLibraryChanged?.();
    onNotify?.(`“${entry.workSnapshot.title}” retirado da estante.`);
  }

  const renderActionButtons = (
    <div className="flex flex-wrap items-center gap-2.5">
      {isOwner ? (
        <>
          <button
            type="button"
            onClick={onOpenCustomize}
            className={`autumn-glow-btn px-4 py-2 text-xs font-medium flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer whitespace-nowrap ${btnShape}`}
            style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Personalizar meu perfil</span>
          </button>
          <button
            type="button"
            onClick={openBannerModal}
            className={`autumn-glow-surface px-3.5 py-2 text-xs font-medium border flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap ${btnShape}`}
            style={{
              backgroundColor: theme.surfaceColor,
              color: theme.textColor,
              borderColor: `${theme.textColor}24`,
            }}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Alterar banner</span>
          </button>
          <button
            type="button"
            onClick={onOpenAccountSettings}
            className={`autumn-glow-surface px-3.5 py-2 text-xs font-medium border flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap ${btnShape}`}
            style={{
              backgroundColor: theme.surfaceColor,
              color: theme.textColor,
              borderColor: `${theme.textColor}24`,
            }}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Conta e privacidade</span>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleFollowToggle}
            className={`px-5 py-2 text-xs font-medium shadow-xs active:scale-95 cursor-pointer whitespace-nowrap ${btnShape} ${
              profileUser.isFollowing ? 'autumn-glow-surface' : 'autumn-glow-btn'
            }`}
            style={{
              backgroundColor: profileUser.isFollowing ? theme.surfaceColor : theme.buttonBg,
              color: profileUser.isFollowing ? theme.textColor : theme.buttonText,
              border: profileUser.isFollowing ? `1px solid ${theme.textColor}24` : 'none',
            }}
          >
            {profileUser.isFollowing ? 'Seguindo' : 'Seguir'}
          </button>
          {currentUser && (
            <>
              <button
                type="button"
                onClick={() => onReport('user', profileUser.id, profileUser.displayName)}
                className="autumn-glow-surface p-2 rounded-full border cursor-pointer"
                style={{
                  backgroundColor: theme.surfaceColor,
                  borderColor: `${theme.textColor}22`,
                }}
                title="Denunciar perfil"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onBlockUser(profileUser.id, profileUser.displayName)}
                className="autumn-glow-surface p-2 rounded-full border cursor-pointer"
                style={{
                  backgroundColor: theme.surfaceColor,
                  borderColor: `${theme.textColor}22`,
                }}
                title="Bloquear usuário"
              >
                <ShieldBan className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      className="relative min-h-[calc(100vh-110px)] pb-28 transition-colors"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        ...bgTextureStyle,
      }}
    >
      {/* Editorial Cover Banner */}
      <div
        className="autumn-glow-image h-52 sm:h-64 md:h-80 w-full relative overflow-hidden border-b"
        style={{
          borderColor: `${theme.textColor}18`,
          backgroundColor: custom.bannerColor || theme.accentColor,
        }}
      >
        {!custom.bannerColor && custom.bannerUrl ? (
          <ImageWithFallback
            src={custom.bannerUrl}
            alt={`Capa de ${profileUser.displayName}`}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{
              objectPosition: `50% ${bannerPosY}%`,
              filter: bannerFilterCss,
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${custom.bannerColor || theme.accentColor} 0%, ${theme.buttonBg} 100%)`,
            }}
          />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(25,14,18,0.12) 0%, rgba(25,14,18,0.04) 45%, rgba(25,14,18,0.42) 100%)',
          }}
        />

        {custom.bannerQuote?.trim() && (
          <div className="absolute inset-x-0 bottom-4 md:bottom-6 px-4 pointer-events-none">
            <div className="max-w-5xl mx-auto flex justify-end">
              <p
                className="max-w-md text-right text-sm md:text-base italic px-4 py-1.5 rounded-full backdrop-blur-md border"
                style={{
                  fontFamily: getFontCss(theme.nameFont),
                  color: '#FFF9F5',
                  backgroundColor: 'rgba(38, 22, 27, 0.45)',
                  borderColor: 'rgba(255, 249, 245, 0.25)',
                }}
              >
                “{custom.bannerQuote}”
              </p>
            </div>
          </div>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={openBannerModal}
            className="absolute top-3.5 right-3.5 md:top-5 md:right-6 z-20 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium backdrop-blur-md border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
            style={{
              backgroundColor: 'rgba(38, 22, 27, 0.58)',
              color: '#FFF9F5',
              borderColor: 'rgba(255, 249, 245, 0.32)',
            }}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Alterar banner</span>
          </button>
        )}
      </div>

      {/* Main Personal Space Container */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {avatarPos === 'center' ? (
          <div className="-mt-14 md:-mt-18 mb-8 flex flex-col items-center text-center relative z-10 space-y-3">
            <div
              className="p-1.5 rounded-full editorial-shadow border"
              style={{
                backgroundColor: theme.surfaceColor,
                borderColor: `${theme.accentColor}30`,
              }}
            >
              <UserAvatar src={profileUser.avatarUrl} name={profileUser.displayName} size="xl" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <h1
                className="text-3xl md:text-5xl font-semibold leading-tight"
                style={{ fontFamily: getFontCss(theme.nameFont) }}
              >
                {profileUser.displayName}
              </h1>
              <OrnamentBadge
                styleKind={ornamentStyle}
                accentColor={theme.accentColor}
                textColor={theme.textColor}
              />
              {profileUser.isPrivate && (
                <span
                  className="inline-flex items-center gap-1 text-xs opacity-80"
                  style={{ color: theme.mutedColor }}
                >
                  <Lock className="w-3 h-3" />
                  Espaço privado
                </span>
              )}
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-2 text-xs"
              style={{ color: theme.mutedColor }}
            >
              <span className="font-medium">@{profileUser.username}</span>
              {custom.showFollowerCount && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={openFollowersModal}
                    className="autumn-glow-link hover:underline cursor-pointer tabular-nums font-medium"
                  >
                    {profileUser.followersCount} seguidores
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={openFollowingModal}
                    className="autumn-glow-link hover:underline cursor-pointer tabular-nums font-medium"
                  >
                    {profileUser.followingCount} seguindo
                  </button>
                </>
              )}
            </div>

            <div className="pt-1">{renderActionButtons}</div>
          </div>
        ) : avatarPos === 'left' ? (
          <div className="mt-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div
                className="p-1.5 rounded-full editorial-shadow shrink-0 border"
                style={{
                  backgroundColor: theme.surfaceColor,
                  borderColor: `${theme.accentColor}30`,
                }}
              >
                <UserAvatar src={profileUser.avatarUrl} name={profileUser.displayName} size="xl" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1
                    className="text-3xl md:text-4xl font-semibold leading-tight"
                    style={{ fontFamily: getFontCss(theme.nameFont) }}
                  >
                    {profileUser.displayName}
                  </h1>
                  <OrnamentBadge
                    styleKind={ornamentStyle}
                    accentColor={theme.accentColor}
                    textColor={theme.textColor}
                  />
                  {profileUser.isPrivate && (
                    <span
                      className="inline-flex items-center gap-1 text-xs opacity-80"
                      style={{ color: theme.mutedColor }}
                    >
                      <Lock className="w-3 h-3" />
                      Espaço privado
                    </span>
                  )}
                </div>
                <div
                  className="mt-1 flex flex-wrap items-center gap-2 text-xs"
                  style={{ color: theme.mutedColor }}
                >
                  <span className="font-medium">@{profileUser.username}</span>
                  {custom.showFollowerCount && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={openFollowersModal}
                        className="autumn-glow-link hover:underline cursor-pointer tabular-nums font-medium"
                      >
                        {profileUser.followersCount} seguidores
                      </button>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={openFollowingModal}
                        className="autumn-glow-link hover:underline cursor-pointer tabular-nums font-medium"
                      >
                        {profileUser.followingCount} seguindo
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div>{renderActionButtons}</div>
          </div>
        ) : (
          <>
            <div className="-mt-12 md:-mt-16 mb-5 flex flex-wrap items-end justify-between gap-4 relative z-10">
              <div
                className="p-1.5 rounded-full editorial-shadow border"
                style={{
                  backgroundColor: theme.surfaceColor,
                  borderColor: `${theme.accentColor}28`,
                }}
              >
                <UserAvatar src={profileUser.avatarUrl} name={profileUser.displayName} size="xl" />
              </div>
              <div className="pt-2">{renderActionButtons}</div>
            </div>

            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1
                  className="text-3xl md:text-5xl font-semibold leading-tight"
                  style={{ fontFamily: getFontCss(theme.nameFont) }}
                >
                  {profileUser.displayName}
                </h1>
                <OrnamentBadge
                  styleKind={ornamentStyle}
                  accentColor={theme.accentColor}
                  textColor={theme.textColor}
                />
                {profileUser.isPrivate && (
                  <span
                    className="inline-flex items-center gap-1 text-xs opacity-80"
                    style={{ color: theme.mutedColor }}
                  >
                    <Lock className="w-3 h-3" />
                    Espaço privado
                  </span>
                )}
              </div>

              <div
                className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"
                style={{ color: theme.mutedColor }}
              >
                <span className="font-medium">@{profileUser.username}</span>
                {custom.showFollowerCount && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={openFollowersModal}
                      className="autumn-glow-link hover:underline cursor-pointer tabular-nums font-medium"
                    >
                      {profileUser.followersCount} seguidores
                    </button>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={openFollowingModal}
                      className="autumn-glow-link hover:underline cursor-pointer tabular-nums font-medium"
                    >
                      {profileUser.followingCount} seguindo
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {!profileUser.canViewFullProfile ? (
          <div
            className={`p-8 text-center space-y-2 ${cardAppearance.className}`}
            style={cardAppearance.style}
          >
            <Lock className="w-6 h-6 mx-auto opacity-70" />
            <h2 className="font-editorial text-2xl font-semibold">Este espaço é privado</h2>
            <p className="text-sm" style={{ color: theme.mutedColor }}>
              Siga @{profileUser.username} para acompanhar suas publicações e estantes.
            </p>
          </div>
        ) : (
          <div className="space-y-11">
            {orderedSections.map((secId) => {
              if (secId === 'bio') {
                return (
                  <section
                    key={secId}
                    className={`autumn-glow-card p-6 md:p-7 max-w-4xl space-y-3 ${cardAppearance.className}`}
                    style={cardAppearance.style}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] uppercase tracking-[0.2em] font-semibold"
                        style={{ color: theme.accentColor }}
                      >
                        Sobre mim
                      </span>
                      {ornamentStyle !== 'none' && (
                        <BotanicalDivider className="w-20 h-3 opacity-65" />
                      )}
                    </div>
                    {!isQuoteVisible && custom.epigraph && (
                      <p
                        className="text-base md:text-lg italic font-medium"
                        style={{
                          color: theme.accentColor,
                          fontFamily: getFontCss(theme.nameFont),
                        }}
                      >
                        “{custom.epigraph}”
                      </p>
                    )}
                    <p
                      className={`${bioSizeClass} leading-relaxed whitespace-pre-line`}
                      style={{ fontFamily: getFontCss(theme.bioFont) }}
                    >
                      {profileUser.bio || 'Um espaço dedicado a livros, filmes, poemas e memórias.'}
                    </p>
                  </section>
                );
              }

              if (secId === 'quote') {
                if (!custom.epigraph?.trim()) return null;
                return (
                  <section
                    key={secId}
                    className={`autumn-glow-card px-6 py-6 md:px-8 md:py-7 max-w-4xl relative overflow-hidden ${cardAppearance.className}`}
                    style={cardAppearance.style}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                        style={{
                          backgroundColor: `${theme.accentColor}16`,
                          color: theme.accentColor,
                        }}
                      >
                        <Quote className="w-4 h-4" />
                      </span>
                      <div className="space-y-2">
                        <p
                          className="text-xl md:text-2xl italic font-medium leading-snug"
                          style={{
                            color: theme.textColor,
                            fontFamily: getFontCss(theme.nameFont),
                          }}
                        >
                          “{custom.epigraph}”
                        </p>
                        <div className="flex items-center gap-3">
                          <BotanicalDivider className="w-20 h-3 opacity-75" />
                          {custom.favoriteQuoteAuthor?.trim() && (
                            <span
                              className="text-xs font-medium tracking-wide"
                              style={{ color: theme.mutedColor }}
                            >
                              {custom.favoriteQuoteAuthor}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              if (secId === 'links' && custom.links.length > 0) {
                return (
                  <section key={secId} className="flex flex-wrap gap-2.5">
                    {custom.links.map((lnk) => (
                      <a
                        key={lnk.id}
                        href={lnk.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`autumn-glow-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium shadow-xs active:scale-95 whitespace-nowrap ${btnShape}`}
                        style={{
                          backgroundColor: theme.buttonBg,
                          color: theme.buttonText,
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{lnk.label}</span>
                      </a>
                    ))}
                  </section>
                );
              }

              if (secId === 'shelves') {
                return (
                  <section key={secId} className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2
                          className="text-2xl md:text-3xl font-semibold flex items-center gap-2.5"
                          style={{ fontFamily: getFontCss(theme.nameFont) }}
                        >
                          <BookMarked className="w-5 h-5" style={{ color: theme.accentColor }} />
                          <span>Minha Prateleira</span>
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: theme.mutedColor }}>
                          Estante física clássica de Livros, Filmes, Séries, Animes, Favoritos, Poemas e Artigos.
                        </p>
                      </div>
                    </div>

                    <RealisticBookshelf
                      entries={mediaShelfEntries}
                      reviews={mediaReviews}
                      shelves={shelves}
                      isOwner={isOwner}
                      shelfConfig={shelfConfig}
                      onSaveShelfConfig={isOwner ? handleSaveShelfConfig : undefined}
                      onOpenWork={onOpenWork}
                      onOpenPostId={onOpenPostId}
                      onOpenBooks={onOpenBooks}
                      onOpenMovies={onOpenMovies}
                      onUpdateMediaEntry={handleUpdateMediaShelfEntry}
                      onRemoveMediaEntry={handleRemoveMediaShelfEntry}
                      onUpdateShelfItem={handleUpdateShelfItem}
                      onReorderShelfItem={handleReorderShelfItem}
                      onRemoveShelfItem={handleRemoveShelfItem}
                      onTransferShelfItem={handleTransferShelfItem}
                      onQuickAddKind={handleQuickAddKind}
                    />
                  </section>
                );
              }

              if (secId === 'custom_collections') {
                return (
                  <section key={secId} className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2
                          className="text-2xl md:text-3xl font-semibold"
                          style={{ fontFamily: getFontCss(theme.nameFont) }}
                        >
                          Coleções personalizadas
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: theme.mutedColor }}>
                          Prateleiras temáticas criadas por @{profileUser.username} com livros, filmes, poemas e recortes.
                        </p>
                      </div>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setShowNewShelf((v) => !v)}
                          className={`autumn-glow-btn px-4 py-2 text-xs font-medium flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap ${btnShape}`}
                          style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nova coleção</span>
                        </button>
                      )}
                    </div>

                    {showNewShelf && isOwner && (
                      <form
                        onSubmit={handleCreateShelf}
                        className={`p-5 space-y-3 ${cardAppearance.className}`}
                        style={cardAppearance.style}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            value={newShelfTitle}
                            onChange={(e) => setNewShelfTitle(e.target.value)}
                            placeholder="Nome da coleção (ex.: Poesia de Outono)"
                            className="rounded-xl bg-tl-creme text-tl-marrom px-3 py-2 text-sm border border-tl-marrom/20"
                          />
                          <input
                            type="text"
                            value={newShelfDesc}
                            onChange={(e) => setNewShelfDesc(e.target.value)}
                            placeholder="Descrição curta da coleção"
                            className="rounded-xl bg-tl-creme text-tl-marrom px-3 py-2 text-sm border border-tl-marrom/20"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 text-xs">
                            <select
                              value={newShelfCover}
                              onChange={(e) => setNewShelfCover(e.target.value)}
                              className="rounded-xl bg-tl-creme text-tl-marrom px-2.5 py-1.5 border border-tl-marrom/20"
                            >
                              <option value="">Sem capa</option>
                              {BANNER_PRESETS.map((b) => (
                                <option key={b.id} value={b.url}>
                                  Capa: {b.label}
                                </option>
                              ))}
                            </select>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newShelfPublic}
                                onChange={(e) => setNewShelfPublic(e.target.checked)}
                              />
                              <span>Coleção pública</span>
                            </label>
                          </div>
                          <button
                            type="submit"
                            className={`autumn-glow-btn px-4 py-1.5 text-xs font-medium cursor-pointer ${btnShape}`}
                            style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
                          >
                            Criar coleção
                          </button>
                        </div>
                      </form>
                    )}

                    {shelves.length === 0 ? (
                      <div
                        className={`p-6 text-center text-xs ${cardAppearance.className}`}
                        style={{ ...cardAppearance.style, color: theme.mutedColor }}
                      >
                        Nenhuma coleção personalizada criada ainda.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {shelves.map((shelf, idx) => (
                          <WoodenCustomShelf
                            key={shelf.id}
                            shelf={shelf}
                            idx={idx}
                            totalShelves={shelves.length}
                            isOwner={isOwner}
                            canReorder={isOwner && shelves.length > 1}
                            shelfConfig={shelfConfig}
                            onMoveShelf={handleMoveShelf}
                            onToggleVisibility={handleToggleShelfVisibility}
                            onRenameShelf={handleRenameShelf}
                            onDeleteShelf={handleDeleteShelf}
                            onAddItem={(s) => {
                              const lower = `${s.category} ${s.title}`.toLowerCase();
                              setItemKind(
                                lower.includes('poema')
                                  ? 'poema'
                                  : lower.includes('artigo')
                                  ? 'artigo'
                                  : lower.includes('anime')
                                  ? 'anime'
                                  : lower.includes('serie') || lower.includes('série')
                                  ? 'serie'
                                  : lower.includes('filme')
                                  ? 'filme'
                                  : lower.includes('livro')
                                  ? 'livro'
                                  : lower.includes('foto')
                                  ? 'fotografia'
                                  : 'outro'
                              );
                              setAddingToShelf(s);
                            }}
                            onSelectItem={setCustomShelfSelection}
                          />
                        ))}
                      </div>
                    )}

                    <ShelfDetailModal
                      selection={customShelfSelection}
                      reviews={mediaReviews}
                      allShelves={shelves}
                      isOwner={isOwner}
                      onClose={() => setCustomShelfSelection(null)}
                      onOpenWork={onOpenWork}
                      onOpenPostId={onOpenPostId}
                      onUpdateMediaEntry={handleUpdateMediaShelfEntry}
                      onRemoveMediaEntry={handleRemoveMediaShelfEntry}
                      onUpdateShelfItem={handleUpdateShelfItem}
                      onReorderShelfItem={handleReorderShelfItem}
                      onTransferShelfItem={handleTransferShelfItem}
                      onRemoveShelfItem={handleRemoveShelfItem}
                    />
                  </section>
                );
              }

              if (secId === 'books') {
                return (
                  <section
                    key={secId}
                    className={`p-6 space-y-4 ${cardAppearance.className}`}
                    style={cardAppearance.style}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2
                          className="text-2xl font-semibold flex items-center gap-2"
                          style={{ fontFamily: getFontCss(theme.nameFont) }}
                        >
                          <BookOpen className="w-5 h-5" style={{ color: theme.accentColor }} />
                          <span>Livros</span>
                        </h2>
                        <p className="text-xs mt-0.5 tabular-nums" style={{ color: theme.mutedColor }}>
                          {uniqueBooks.length} {uniqueBooks.length === 1 ? 'livro catalogado' : 'livros catalogados'}
                        </p>
                      </div>
                      {onOpenBooks && (
                        <button
                          type="button"
                          onClick={onOpenBooks}
                          className="text-xs font-medium hover:underline cursor-pointer"
                          style={{ color: theme.accentColor }}
                        >
                          Explorar livros →
                        </button>
                      )}
                    </div>

                    {uniqueBooks.length === 0 ? (
                      <p className="text-xs" style={{ color: theme.mutedColor }}>
                        Nenhum livro marcado na estante pessoal ainda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                        {uniqueBooks.slice(0, 10).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => onOpenWork?.(entry.workId)}
                            className="autumn-glow-card text-left rounded-2xl border overflow-hidden cursor-pointer group"
                            style={{
                              backgroundColor: theme.backgroundColor,
                              borderColor: `${theme.textColor}14`,
                            }}
                          >
                            <div className="aspect-[2/3] relative overflow-hidden">
                              <CatalogCover
                                src={entry.workSnapshot.coverUrl}
                                title={entry.workSnapshot.title}
                                creator={entry.workSnapshot.creator}
                                year={entry.workSnapshot.year}
                                mediaKind={entry.workSnapshot.mediaKind}
                              />
                            </div>
                            <div className="p-2.5 space-y-0.5">
                              <div className="font-editorial text-sm font-semibold line-clamp-1 group-hover:underline">
                                {entry.workSnapshot.title}
                              </div>
                              <div className="text-[11px] truncate" style={{ color: theme.mutedColor }}>
                                {entry.workSnapshot.creator}
                                {entry.status ? ` · ${SHELF_STATUS_LABELS[entry.status]}` : ''}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              }

              if (secId === 'movies_series') {
                return (
                  <section
                    key={secId}
                    className={`p-6 space-y-4 ${cardAppearance.className}`}
                    style={cardAppearance.style}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2
                          className="text-2xl font-semibold flex items-center gap-2"
                          style={{ fontFamily: getFontCss(theme.nameFont) }}
                        >
                          <Film className="w-5 h-5" style={{ color: theme.accentColor }} />
                          <span>Filmes e séries</span>
                        </h2>
                        <p className="text-xs mt-0.5 tabular-nums" style={{ color: theme.mutedColor }}>
                          {moviesAndSeriesEntries.length} obras cinematográficas e séries
                        </p>
                      </div>
                      {onOpenMovies && (
                        <button
                          type="button"
                          onClick={onOpenMovies}
                          className="text-xs font-medium hover:underline cursor-pointer"
                          style={{ color: theme.accentColor }}
                        >
                          Explorar filmes e séries →
                        </button>
                      )}
                    </div>

                    {moviesAndSeriesEntries.length === 0 ? (
                      <p className="text-xs" style={{ color: theme.mutedColor }}>
                        Nenhum filme ou série salvo ainda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                        {moviesAndSeriesEntries.slice(0, 10).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => onOpenWork?.(entry.workId)}
                            className="autumn-glow-card text-left rounded-2xl border overflow-hidden cursor-pointer group"
                            style={{
                              backgroundColor: theme.backgroundColor,
                              borderColor: `${theme.textColor}14`,
                            }}
                          >
                            <div className="aspect-[2/3] relative overflow-hidden">
                              <CatalogCover
                                src={entry.workSnapshot.coverUrl}
                                title={entry.workSnapshot.title}
                                creator={entry.workSnapshot.creator}
                                year={entry.workSnapshot.year}
                                mediaKind={entry.workSnapshot.mediaKind}
                              />
                            </div>
                            <div className="p-2.5 space-y-0.5">
                              <div className="font-editorial text-sm font-semibold line-clamp-1 group-hover:underline">
                                {entry.workSnapshot.title}
                              </div>
                              <div className="text-[11px] truncate" style={{ color: theme.mutedColor }}>
                                {entry.mediaKind === 'serie' ? 'Série' : 'Filme'}
                                {entry.status ? ` · ${SHELF_STATUS_LABELS[entry.status]}` : ''}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              }

              if (secId === 'favorites') {
                const totalFavs = favoriteMediaEntries.length + favoriteShelfItems.length;
                return (
                  <section
                    key={secId}
                    className={`p-6 space-y-4 ${cardAppearance.className}`}
                    style={cardAppearance.style}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2
                          className="text-2xl font-semibold flex items-center gap-2"
                          style={{ fontFamily: getFontCss(theme.nameFont) }}
                        >
                          <Heart className="w-5 h-5" style={{ color: theme.accentColor }} />
                          <span>Favoritos</span>
                        </h2>
                        <p className="text-xs mt-0.5 tabular-nums" style={{ color: theme.mutedColor }}>
                          {totalFavs} {totalFavs === 1 ? 'obra favorita' : 'obras favoritas'} guardadas com carinho
                        </p>
                      </div>
                    </div>

                    {totalFavs === 0 ? (
                      <p className="text-xs" style={{ color: theme.mutedColor }}>
                        Marque suas obras preferidas com o ícone de coração na estante para destacá-las aqui.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                        {favoriteMediaEntries.slice(0, 8).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => onOpenWork?.(entry.workId)}
                            className="autumn-glow-card text-left rounded-2xl border overflow-hidden cursor-pointer group"
                            style={{
                              backgroundColor: theme.backgroundColor,
                              borderColor: `${theme.textColor}14`,
                            }}
                          >
                            <div className="aspect-[2/3] relative overflow-hidden">
                              <CatalogCover
                                src={entry.workSnapshot.coverUrl}
                                title={entry.workSnapshot.title}
                                creator={entry.workSnapshot.creator}
                                year={entry.workSnapshot.year}
                                mediaKind={entry.workSnapshot.mediaKind}
                              />
                            </div>
                            <div className="p-2.5 space-y-0.5">
                              <div className="font-editorial text-sm font-semibold line-clamp-1 group-hover:underline">
                                {entry.workSnapshot.title}
                              </div>
                              <div className="text-[11px] truncate" style={{ color: theme.mutedColor }}>
                                {entry.workSnapshot.creator}
                              </div>
                            </div>
                          </button>
                        ))}
                        {favoriteShelfItems.slice(0, 6).map(({ shelf, item, index }) => (
                          <button
                            key={`${shelf.id}-${item.id}`}
                            type="button"
                            onClick={() =>
                              setCustomShelfSelection({
                                source: 'shelf',
                                shelf,
                                item,
                                index,
                              })
                            }
                            className="autumn-glow-card text-left rounded-2xl border p-3 flex flex-col justify-between cursor-pointer"
                            style={{
                              backgroundColor: theme.backgroundColor,
                              borderColor: `${theme.textColor}16`,
                            }}
                          >
                            <div className="space-y-1">
                              <span
                                className="text-[10px] uppercase tracking-wider font-semibold"
                                style={{ color: theme.accentColor }}
                              >
                                {item.kind}
                              </span>
                              <div className="font-editorial text-base font-semibold line-clamp-2">
                                {item.title}
                              </div>
                              {item.subtitle && (
                                <div className="text-[11px] truncate" style={{ color: theme.mutedColor }}>
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                            <div className="pt-2 text-[10px] truncate" style={{ color: theme.mutedColor }}>
                              Em {shelf.title}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              }

              if (secId === 'reviews') {
                return (
                  <section
                    key={secId}
                    className={`p-6 space-y-4 ${cardAppearance.className}`}
                    style={cardAppearance.style}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2
                          className="text-2xl font-semibold"
                          style={{ fontFamily: getFontCss(theme.nameFont) }}
                        >
                          Avaliações
                        </h2>
                        <p className="text-xs mt-0.5 tabular-nums" style={{ color: theme.mutedColor }}>
                          {mediaReviews.length} {mediaReviews.length === 1 ? 'resenha registrada' : 'resenhas registradas'} (0–10)
                        </p>
                      </div>
                    </div>

                    {mediaReviews.length === 0 ? (
                      <p className="text-xs" style={{ color: theme.mutedColor }}>
                        Nenhuma avaliação de filme, série ou livro salva ainda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {mediaReviews.map((rev) => (
                          <div
                            key={rev.id}
                            onClick={() => onOpenWork?.(rev.workId)}
                            className={`autumn-glow-card p-3.5 rounded-2xl border flex gap-3.5 ${
                              onOpenWork ? 'cursor-pointer' : ''
                            }`}
                            style={{
                              backgroundColor: theme.backgroundColor,
                              borderColor: `${theme.textColor}14`,
                            }}
                          >
                            <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-tl-marrom/15">
                              <CatalogCover
                                src={rev.workSnapshot.coverUrl}
                                title={rev.workSnapshot.title}
                                creator={rev.workSnapshot.creator}
                                year={rev.workSnapshot.year}
                                mediaKind={rev.workSnapshot.mediaKind}
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-editorial text-base font-semibold truncate">
                                  {rev.workSnapshot.title}
                                </div>
                                <span
                                  className="inline-flex items-center gap-1 text-xs font-bold shrink-0 tabular-nums"
                                  style={{ color: theme.accentColor }}
                                >
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  {rev.rating.toFixed(1)}/10
                                </span>
                              </div>
                              <div className="text-[11px] truncate" style={{ color: theme.mutedColor }}>
                                {rev.workSnapshot.creator}
                                {rev.workSnapshot.year ? ` · ${rev.workSnapshot.year}` : ''}
                              </div>
                              {rev.review && (
                                <p className="text-xs line-clamp-2 opacity-90">{rev.review}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              }

              if (secId === 'cultural' && custom.showCulturalStats) {
                const filmes = culturalItems.filter(
                  (c) => c.mediaType === 'filme' || c.mediaType === 'serie'
                );
                const livros = culturalItems.filter((c) => c.mediaType === 'livro');
                const musicas = culturalItems.filter((c) => c.mediaType === 'musica');

                return (
                  <section
                    key={secId}
                    className={`p-6 space-y-4 ${cardAppearance.className}`}
                    style={cardAppearance.style}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2
                        className="text-2xl font-semibold"
                        style={{ fontFamily: getFontCss(theme.nameFont) }}
                      >
                        Caderno Cultural
                      </h2>
                      <span
                        className="text-xs tabular-nums font-medium"
                        style={{ color: theme.mutedColor }}
                      >
                        {filmes.length} filmes/séries · {livros.length} livros · {musicas.length} músicas
                      </span>
                    </div>

                    {culturalItems.length === 0 ? (
                      <p className="text-xs" style={{ color: theme.mutedColor }}>
                        Nenhuma obra registrada ainda no diário cultural.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {culturalItems.slice(0, 6).map((c) => (
                          <div
                            key={c.id}
                            className="autumn-glow-card p-3.5 rounded-2xl border"
                            style={{
                              backgroundColor: theme.backgroundColor,
                              borderColor: `${theme.textColor}12`,
                            }}
                          >
                            <div
                              className="flex items-center justify-between text-[11px]"
                              style={{ color: theme.mutedColor }}
                            >
                              <span className="uppercase font-semibold">{c.mediaType}</span>
                              {c.rating > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 font-semibold tabular-nums"
                                  style={{ color: theme.accentColor }}
                                >
                                  <Star className="w-3 h-3 fill-current" />
                                  {c.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="font-editorial text-lg font-semibold mt-1 truncate">
                              {c.title}
                            </div>
                            <div className="text-xs truncate" style={{ color: theme.mutedColor }}>
                              {c.creator}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              }

              if (secId === 'posts') {
                return (
                  <section key={secId} className="space-y-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2
                        className="text-2xl md:text-3xl font-semibold"
                        style={{ fontFamily: getFontCss(theme.nameFont) }}
                      >
                        Publicações
                      </h2>
                      <span className="text-xs tabular-nums" style={{ color: theme.mutedColor }}>
                        {posts.length} {posts.length === 1 ? 'publicação' : 'publicações'}
                      </span>
                    </div>
                    {posts.length === 0 ? (
                      <p className="text-sm" style={{ color: theme.mutedColor }}>
                        Ainda não há textos publicados neste espaço.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-tl-marrom">
                        {posts.map((p) => (
                          <PostCard
                            key={p.id}
                            post={p}
                            currentUser={currentUser}
                            onOpenPost={onOpenPost}
                            onOpenAuthor={onOpenAuthor}
                            onToggleLike={onToggleLike}
                            onToggleFavorite={onToggleFavorite}
                            onShare={onShare}
                            onEdit={onEditPost}
                            onDelete={onDeletePost}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* Add Shelf Item Modal */}
      {addingToShelf && (
        <div className="fixed inset-0 z-50 bg-tl-marrom/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddShelfItem}
            className="bg-tl-creme text-tl-marrom w-full max-w-md rounded-3xl p-6 border border-tl-marrom/18 editorial-shadow space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-2xl font-semibold">
                Adicionar em “{addingToShelf.title}”
              </h3>
              <button type="button" onClick={() => setAddingToShelf(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder="Título da obra, poema, filme, série ou anime"
              className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm"
            />
            <div className="grid grid-cols-3 gap-2.5">
              <input
                type="text"
                value={itemSubtitle}
                onChange={(e) => setItemSubtitle(e.target.value)}
                placeholder="Autor ou diretor"
                className="col-span-2 rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm"
              />
              <input
                type="text"
                value={itemYear}
                onChange={(e) => setItemYear(e.target.value)}
                placeholder="Ano"
                className="rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm"
              />
            </div>
            <select
              value={itemKind}
              onChange={(e) => setItemKind(e.target.value as ShelfItem['kind'])}
              className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm"
            >
              <option value="livro">Livro</option>
              <option value="filme">Filme</option>
              <option value="serie">Série</option>
              <option value="anime">Anime</option>
              <option value="poema">Poema</option>
              <option value="artigo">Artigo / Ensaio</option>
              <option value="musica">Música / Álbum</option>
              <option value="fotografia">Fotografia</option>
              <option value="outro">Outro</option>
            </select>
            <input
              type="url"
              value={itemCoverUrl}
              onChange={(e) => setItemCoverUrl(e.target.value)}
              placeholder="URL da capa oficial (opcional — sem capa exibe encadernação)"
              className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2 text-xs"
            />
            <textarea
              rows={2}
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="Comentário ou anotação pessoal (opcional)"
              className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 p-3.5 text-sm"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAddingToShelf(null)}
                className="px-3 py-2 text-xs text-tl-marrom-suave cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-tl-laranja text-tl-creme rounded-full hover:bg-tl-terracota cursor-pointer"
              >
                Guardar na estante
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Followers / Following List Modal */}
      {listModal && (
        <div className="fixed inset-0 z-50 bg-tl-marrom/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tl-creme text-tl-marrom w-full max-w-md rounded-3xl p-6 border border-tl-marrom/18 editorial-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-2xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-tl-laranja" />
                {listModal.title}
              </h3>
              <button type="button" onClick={() => setListModal(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {listModal.users.length === 0 ? (
              <p className="text-sm text-tl-marrom-suave py-6 text-center">
                Nenhum perfil nesta lista ainda.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {listModal.users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setListModal(null);
                      onOpenAuthor(u.username);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-tl-bege/70 text-left cursor-pointer"
                  >
                    <UserAvatar src={u.avatarUrl} name={u.displayName} size="md" />
                    <div>
                      <div className="font-editorial text-base font-semibold">{u.displayName}</div>
                      <div className="text-xs text-tl-marrom-suave">@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Quick Banner Editor Modal */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#241419]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveQuickBanner}
            className="bg-[#FFF9F5] text-[#493039] w-full max-w-2xl max-h-[92vh] rounded-3xl border border-[#D9B8C0] editorial-shadow flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#D9B8C0]/70 flex items-center justify-between bg-[#F5E9E8]/60">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#803C50] text-[#FFF9F5] flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-editorial text-2xl font-semibold text-[#493039]">
                    Alterar banner do perfil
                  </h3>
                  <p className="text-[11px] text-[#7B5A65]">
                    Envie uma foto sua, cole um link ou escolha uma imagem editorial pronta.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBannerModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#D9B8C0]/40 cursor-pointer"
                aria-label="Fechar editor de banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Live Banner Preview */}
              <div
                className="h-36 sm:h-44 w-full rounded-2xl overflow-hidden border border-[#D9B8C0] relative"
                style={{ backgroundColor: draftBannerColor || theme.accentColor }}
              >
                {!draftBannerColor && draftBannerUrl ? (
                  <ImageWithFallback
                    src={draftBannerUrl}
                    alt="Prévia do banner"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `50% ${draftBannerPosY}%`,
                      filter: getBannerFilterCss(draftBannerFilter),
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(135deg, ${draftBannerColor || theme.accentColor} 0%, ${theme.buttonBg} 100%)`,
                    }}
                  />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(25,14,18,0.08) 0%, rgba(25,14,18,0.38) 100%)',
                  }}
                />
                {draftBannerQuote.trim() && (
                  <p
                    className="absolute bottom-3 right-3 max-w-xs text-right text-xs italic px-3 py-1 rounded-full backdrop-blur-md border border-[#FFF9F5]/25 text-[#FFF9F5]"
                    style={{
                      fontFamily: getFontCss(theme.nameFont),
                      backgroundColor: 'rgba(38, 22, 27, 0.5)',
                    }}
                  >
                    “{draftBannerQuote}”
                  </p>
                )}
              </div>

              {bannerError && (
                <div className="px-3.5 py-2 rounded-xl bg-[#803C50] text-[#FFF9F5] text-xs font-medium">
                  {bannerError}
                </div>
              )}

              {/* Upload or URL */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                    Foto do seu dispositivo
                  </label>
                  <button
                    type="button"
                    onClick={() => quickBannerInputRef.current?.click()}
                    disabled={bannerUploading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#803C50] text-[#FFF9F5] hover:bg-[#B65B76] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{bannerUploading ? 'Enviando imagem…' : 'Escolher foto da galeria'}</span>
                  </button>
                  <input
                    ref={quickBannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQuickBannerUpload}
                    className="sr-only"
                  />
                </div>

                <div className="sm:col-span-7">
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                    Ou colar URL de imagem
                  </label>
                  <input
                    type="text"
                    value={draftBannerUrl}
                    onChange={(e) => {
                      setDraftBannerUrl(e.target.value);
                      setDraftBannerColor('');
                    }}
                    placeholder="https://… ou /uploads/…"
                    className="w-full rounded-xl bg-[#F5E9E8]/75 border border-[#D9B8C0] px-3 py-2.5 text-xs text-[#493039]"
                  />
                </div>
              </div>

              {/* Framing, Filter, Solid Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                    Enquadramento ({draftBannerPosY}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draftBannerPosY}
                    onChange={(e) => setDraftBannerPosY(Number(e.target.value))}
                    className="w-full accent-[#803C50]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                    Filtro visual
                  </label>
                  <select
                    value={draftBannerFilter}
                    onChange={(e) => setDraftBannerFilter(e.target.value as BannerFilterMode)}
                    className="w-full rounded-xl bg-[#F5E9E8]/75 border border-[#D9B8C0] px-2.5 py-2 text-xs text-[#493039]"
                  >
                    <option value="none">Original</option>
                    <option value="vintage">Vintage quente</option>
                    <option value="rose">Rosa antigo</option>
                    <option value="soft">Luz suave</option>
                    <option value="sepia">Sépia clássico</option>
                    <option value="bw">Preto & branco</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                    Ou usar cor sólida
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftBannerColor || '#D9B8C0'}
                      onChange={(e) => setDraftBannerColor(e.target.value)}
                      className="w-9 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    {draftBannerColor && (
                      <button
                        type="button"
                        onClick={() => setDraftBannerColor('')}
                        className="text-[11px] text-[#803C50] underline cursor-pointer"
                      >
                        Voltar para foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                  Frase delicada sobre o banner (opcional)
                </label>
                <input
                  type="text"
                  value={draftBannerQuote}
                  onChange={(e) => setDraftBannerQuote(e.target.value)}
                  placeholder="Ex.: Capítulo III · Leituras de Outono"
                  className="w-full rounded-xl bg-[#F5E9E8]/75 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                />
              </div>

              {/* Curated Gallery */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#7B5A65]">
                  Galeria editorial pronta
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {BANNER_PRESETS.map((b) => {
                    const active = draftBannerUrl === b.url && !draftBannerColor;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setDraftBannerUrl(b.url);
                          setDraftBannerColor('');
                        }}
                        className={`group relative h-16 rounded-xl overflow-hidden border text-left cursor-pointer transition-all ${
                          active
                            ? 'border-[#803C50] ring-2 ring-[#B65B76]/45'
                            : 'border-[#D9B8C0] hover:border-[#B65B76]'
                        }`}
                      >
                        <img
                          src={b.url}
                          alt={b.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#26161B]/80 via-[#26161B]/20 to-transparent" />
                        <span className="absolute bottom-1 left-2 right-2 text-[10px] font-medium text-[#FFF9F5] truncate">
                          {b.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[#D9B8C0]/70 bg-[#F5E9E8]/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setBannerModalOpen(false);
                  onOpenCustomize();
                }}
                className="text-xs font-medium text-[#803C50] hover:underline cursor-pointer"
              >
                Personalização completa do perfil →
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-[#7B5A65] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bannerSaving || bannerUploading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full bg-[#803C50] text-[#FFF9F5] hover:bg-[#B65B76] cursor-pointer disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{bannerSaving ? 'Salvando…' : 'Salvar banner'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
