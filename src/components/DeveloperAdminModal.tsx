import {
  AlertTriangle,
  Award,
  Check,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  KeyRound,
  LayoutTemplate,
  Lock,
  Megaphone,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { api, readImageFileOptimized } from '../lib/api';
import {
  AdminReportView,
  PostType,
  PostWithAuthor,
  SeasonId,
  SiteConfigPublic,
  TopCategory,
  UserPublic,
} from '../types/thinklive';
import { useSiteConfig } from './SiteConfigContext';

interface DeveloperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserPublic | null;
  onUserUpdated: (user: UserPublic | null) => void;
  onSiteDataChanged: () => void;
  onNotify: (msg: string) => void;
}

type AdminTab = 'site' | 'posts' | 'users' | 'reports' | 'system';

const ALL_EDITABLE_TABS: TopCategory[] = [
  'Poemas',
  'Notícias',
  'Filmes & Séries',
  'Artigos',
  'Livros',
  'Fotografia',
  'Arte e cultura',
  'Podcasts',
  'Diários',
  'Músicas',
];

const TOGGLEABLE_NAV_TABS: TopCategory[] = [
  'Poemas',
  'Notícias',
  'Filmes & Séries',
  'Artigos',
  'Livros',
  'Fotografia',
  'Arte e cultura',
  'Podcasts',
  'Diários',
];

export function DeveloperAdminModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onSiteDataChanged,
  onNotify,
}: DeveloperAdminModalProps) {
  const {
    siteConfig,
    adminStatus,
    setSiteConfig,
    refreshSiteConfig,
    refreshAdminStatus,
    activateDevToken,
  } = useSiteConfig();

  const isUnlocked = adminStatus.unlocked || Boolean(currentUser?.isDeveloperAdmin);

  // Auth / Claim state
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [devEmailInput, setDevEmailInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Admin Workspace state
  const [activeTab, setActiveTab] = useState<AdminTab>('site');
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [draftConfig, setDraftConfig] = useState<SiteConfigPublic>(siteConfig);
  const [selectedHeroTab, setSelectedHeroTab] = useState<TopCategory>('Poemas');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [users, setUsers] = useState<(UserPublic & { email: string; role: string; postsCount: number })[]>([]);
  const [reports, setReports] = useState<AdminReportView[]>([]);
  const [stats, setStats] = useState({
    usersCount: 0,
    publishedPostsCount: 0,
    draftPostsCount: 0,
    commentsCount: 0,
    diariesCount: 0,
    reportsCount: 0,
  });

  // Posts CRUD state
  const [postQuery, setPostQuery] = useState('');
  const [postStatusFilter, setPostStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [postForm, setPostForm] = useState<{
    title: string;
    subtitle: string;
    category: TopCategory;
    type: PostType;
    coverImage: string;
    content: string;
    status: 'published' | 'draft';
  }>({
    title: '',
    subtitle: '',
    category: 'Artigos',
    type: 'artigo',
    coverImage: '',
    content: '',
    status: 'published',
  });

  // Users edit state
  const [userQuery, setUserQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userEditName, setUserEditName] = useState('');
  const [userEditBio, setUserEditBio] = useState('');

  // Security tab state
  const [newMasterPass, setNewMasterPass] = useState('');
  const [syncingNews, setSyncingNews] = useState(false);

  useEffect(() => {
    setDraftConfig(siteConfig);
  }, [siteConfig]);

  useEffect(() => {
    if (currentUser?.email && !devEmailInput) {
      setDevEmailInput(currentUser.email);
    }
  }, [currentUser?.email, devEmailInput]);

  const loadOverview = useCallback(async () => {
    if (!isUnlocked) return;
    setLoadingOverview(true);
    try {
      const res = await api.getAdminOverview();
      setDraftConfig(res.siteConfig);
      setSiteConfig(res.siteConfig);
      setPosts(res.posts);
      setUsers(res.users);
      setReports(res.reports);
      setStats(res.stats);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao carregar dados do painel.');
    } finally {
      setLoadingOverview(false);
    }
  }, [isUnlocked, setSiteConfig, onNotify]);

  useEffect(() => {
    if (isOpen && isUnlocked) {
      loadOverview();
    }
  }, [isOpen, isUnlocked, loadOverview]);

  if (!isOpen) return null;

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    setAuthError('');
    if (passcodeInput.trim().length < 8) {
      setAuthError('A senha mestra precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (passcodeInput !== confirmPasscode) {
      setAuthError('As senhas digitadas não coincidem.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await api.claimAdmin({
        passcode: passcodeInput.trim(),
        developerEmail: devEmailInput.trim() || undefined,
      });
      activateDevToken(res.devToken);
      if (res.user) onUserUpdated(res.user);
      await refreshAdminStatus();
      setPasscodeInput('');
      setConfirmPasscode('');
      onNotify('Acesso exclusivo da desenvolvedora ativado!');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Não foi possível configurar o acesso.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleUnlock(e: FormEvent) {
    e.preventDefault();
    setAuthError('');
    if (!passcodeInput.trim()) {
      setAuthError('Digite sua senha mestra de desenvolvedora.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await api.unlockAdmin(passcodeInput.trim());
      activateDevToken(res.devToken);
      if (res.user) onUserUpdated(res.user);
      await refreshAdminStatus();
      setPasscodeInput('');
      onNotify('Painel da Desenvolvedora desbloqueado.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Senha incorreta.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLockSession() {
    await api.lockAdmin();
    activateDevToken(null);
    await refreshAdminStatus();
    onClose();
    onNotify('Sessão ADM bloqueada.');
  }

  async function handleUploadImageForTarget(
    e: ChangeEvent<HTMLInputElement>,
    target: 'home' | 'tab' | 'post'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(target);
    try {
      const dataUrl = await readImageFileOptimized(file, 1600);
      const uploaded = await api.uploadImage(dataUrl, `adm_${target}`);
      if (target === 'home') {
        setDraftConfig((prev) => ({
          ...prev,
          homeHero: { ...(prev.homeHero || {}), imageUrl: uploaded.url },
        }));
      } else if (target === 'tab') {
        setDraftConfig((prev) => ({
          ...prev,
          tabHeroes: {
            ...(prev.tabHeroes || {}),
            [selectedHeroTab]: {
              ...(prev.tabHeroes?.[selectedHeroTab] || {}),
              imageUrl: uploaded.url,
            },
          },
        }));
      } else if (target === 'post') {
        setPostForm((prev) => ({ ...prev, coverImage: uploaded.url }));
      }
      onNotify('Imagem enviada com sucesso.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao enviar imagem.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  }

  async function handleSaveSiteConfig() {
    setSavingConfig(true);
    try {
      const res = await api.updateSiteConfig(draftConfig);
      setSiteConfig(res.siteConfig);
      setDraftConfig(res.siteConfig);
      onSiteDataChanged();
      onNotify('Alterações do site salvas e publicadas em tempo real!');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleResetSiteConfig() {
    setSavingConfig(true);
    try {
      const res = await api.resetSiteConfig();
      setSiteConfig(res.siteConfig);
      setDraftConfig(res.siteConfig);
      onSiteDataChanged();
      onNotify('Textos e imagens padrão restaurados.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao restaurar padrão.');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleTogglePinPost(postId: string) {
    const currentPinned = draftConfig.pinnedPostIds || [];
    const exists = currentPinned.includes(postId);
    const nextPinned = exists
      ? currentPinned.filter((id) => id !== postId)
      : [postId, ...currentPinned];
    try {
      const res = await api.updateSiteConfig({ pinnedPostIds: nextPinned });
      setSiteConfig(res.siteConfig);
      setDraftConfig(res.siteConfig);
      onSiteDataChanged();
      onNotify(exists ? 'Publicação desafixada do topo.' : 'Publicação fixada no topo do feed!');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao fixar publicação.');
    }
  }

  async function handleSavePostForm(e: FormEvent) {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.content.trim()) {
      onNotify('Preencha título e conteúdo.');
      return;
    }
    try {
      if (editingPostId) {
        const res = await api.adminUpdatePost(editingPostId, postForm);
        setPosts((prev) => prev.map((p) => (p.id === editingPostId ? res.post : p)));
        onNotify('Publicação atualizada.');
      } else {
        const res = await api.adminCreatePost(postForm);
        setPosts((prev) => [res.post, ...prev]);
        onNotify('Nova publicação criada pelo ADM!');
      }
      setPostFormOpen(false);
      setEditingPostId(null);
      onSiteDataChanged();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao salvar publicação.');
    }
  }

  async function handleDeletePost(postId: string) {
    try {
      await api.adminDeletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      onSiteDataChanged();
      onNotify('Publicação removida.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao excluir publicação.');
    }
  }

  async function handleTogglePostStatus(post: PostWithAuthor) {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const res = await api.adminUpdatePost(post.id, { status: nextStatus });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? res.post : p)));
      onSiteDataChanged();
      onNotify(nextStatus === 'published' ? 'Publicação colocada no ar.' : 'Publicação movida para rascunho.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao alterar status.');
    }
  }

  async function handleToggleVerifiedUser(u: UserPublic & { email: string; role: string; postsCount: number }) {
    try {
      await api.adminUpdateUser(u.id, { verified: !u.isVerifiedBadge });
      await loadOverview();
      onSiteDataChanged();
      onNotify(!u.isVerifiedBadge ? 'Selo editorial concedido.' : 'Selo editorial removido.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
    }
  }

  async function handleSaveUserEdit(userId: string) {
    try {
      await api.adminUpdateUser(userId, { displayName: userEditName, bio: userEditBio });
      setEditingUserId(null);
      await loadOverview();
      onSiteDataChanged();
      onNotify('Dados do usuário atualizados.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao salvar usuário.');
    }
  }

  async function handleDeleteUser(userId: string) {
    try {
      await api.adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      onSiteDataChanged();
      onNotify('Usuário removido.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao remover usuário.');
    }
  }

  async function handleResolveReport(id: string, action: 'dismiss' | 'delete_target') {
    try {
      await api.adminResolveReport(id, action);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (action === 'delete_target') {
        await loadOverview();
        onSiteDataChanged();
      }
      onNotify(action === 'delete_target' ? 'Conteúdo excluído e denúncia resolvida.' : 'Denúncia arquivada.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao resolver denúncia.');
    }
  }

  async function handleExportBackup() {
    try {
      const data = await api.adminExportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thinklive-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify('Backup completo baixado.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao exportar backup.');
    }
  }

  async function handleSyncNewsNow() {
    setSyncingNews(true);
    try {
      await api.syncNews();
      onNotify('Feeds de notícias sincronizados!');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao sincronizar notícias.');
    } finally {
      setSyncingNews(false);
    }
  }

  async function handleChangePasscode(e: FormEvent) {
    e.preventDefault();
    try {
      await api.changeDevPasscode(newMasterPass);
      setNewMasterPass('');
      onNotify('Senha mestra da desenvolvedora atualizada!');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Erro ao atualizar senha mestra.');
    }
  }

  const filteredPosts = posts.filter((p) => {
    if (postStatusFilter !== 'all' && p.status !== postStatusFilter) return false;
    if (!postQuery.trim()) return true;
    const q = postQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.author.displayName.toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    if (!userQuery.trim()) return true;
    const q = userQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const currentTabHero = draftConfig.tabHeroes?.[selectedHeroTab] || {};
  const hiddenSet = new Set(draftConfig.hiddenCategories || []);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1a0f0a]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Painel exclusivo da desenvolvedora"
    >
      <div className="w-full max-w-5xl bg-tl-creme border border-tl-marrom/20 rounded-3xl editorial-shadow overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Bar */}
        <div className="px-5 sm:px-7 py-4 bg-tl-marrom text-tl-creme flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-tl-laranja/25 border border-[#F2B880]/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#F2B880]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-editorial text-xl sm:text-2xl font-semibold leading-tight truncate">
                Estúdio da Desenvolvedora
              </h2>
              <p className="text-[11px] text-tl-bege/80 truncate">
                Acesso privado e invisível para outros usuários · Edição total em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isUnlocked && (
              <button
                type="button"
                onClick={handleLockSession}
                title="Bloquear painel"
                className="px-3 py-1.5 rounded-full bg-tl-creme/10 hover:bg-tl-creme/20 text-xs text-tl-creme inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bloquear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar painel"
              className="p-2 rounded-full hover:bg-tl-creme/15 text-tl-creme cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!isUnlocked ? (
          <div className="p-6 sm:p-10 max-w-lg mx-auto w-full space-y-5 overflow-y-auto">
            {!adminStatus.hasClaimedPasscode && !adminStatus.usesEnvPasscode ? (
              <form onSubmit={handleClaim} className="space-y-4">
                <div className="p-4 rounded-2xl bg-tl-bege/75 border border-tl-marrom/14 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-tl-terracota">
                    <KeyRound className="w-4 h-4" />
                    <span>Configuração inicial exclusiva</span>
                  </div>
                  <p className="text-xs text-tl-marrom-suave leading-relaxed">
                    Crie sua senha mestra da desenvolvedora para trancar este painel só para você.
                    {currentUser
                      ? ` Sua conta atual (@${currentUser.username}) também será vinculada automaticamente como desenvolvedora.`
                      : ' Se preferir, faça login na sua conta antes ou informe seu e-mail abaixo.'}
                  </p>
                </div>

                {!currentUser && (
                  <div>
                    <label className="block text-xs font-medium text-tl-marrom mb-1">
                      Seu e-mail de desenvolvedora (opcional)
                    </label>
                    <input
                      type="email"
                      value={devEmailInput}
                      onChange={(e) => setDevEmailInput(e.target.value)}
                      placeholder="seu-email@exemplo.com"
                      className="w-full rounded-xl bg-tl-papel border border-tl-marrom/18 px-3.5 py-2.5 text-sm text-tl-marrom focus:outline-none focus:border-tl-laranja"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-tl-marrom mb-1">
                    Senha mestra da desenvolvedora (mín. 8 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Crie uma senha forte"
                    className="w-full rounded-xl bg-tl-papel border border-tl-marrom/18 px-3.5 py-2.5 text-sm text-tl-marrom focus:outline-none focus:border-tl-laranja"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-tl-marrom mb-1">
                    Confirmar senha mestra
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Repita a senha mestra"
                    className="w-full rounded-xl bg-tl-papel border border-tl-marrom/18 px-3.5 py-2.5 text-sm text-tl-marrom focus:outline-none focus:border-tl-laranja"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-tl-terracota bg-tl-terracota/10 border border-tl-terracota/25 rounded-xl px-3 py-2">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-2.5 rounded-full bg-tl-laranja text-tl-creme text-sm font-medium hover:bg-tl-terracota transition-colors cursor-pointer disabled:opacity-60"
                >
                  {authBusy ? 'Configurando...' : 'Ativar meu Painel da Desenvolvedora'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="p-4 rounded-2xl bg-tl-bege/75 border border-tl-marrom/14 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-tl-terracota">
                    <Lock className="w-4 h-4" />
                    <span>Área restrita à desenvolvedora</span>
                  </div>
                  <p className="text-xs text-tl-marrom-suave leading-relaxed">
                    Digite sua senha mestra para abrir o painel de edição completa do site.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-tl-marrom mb-1">
                    Senha mestra
                  </label>
                  <input
                    type="password"
                    required
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-tl-papel border border-tl-marrom/18 px-3.5 py-2.5 text-sm text-tl-marrom focus:outline-none focus:border-tl-laranja"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-tl-terracota bg-tl-terracota/10 border border-tl-terracota/25 rounded-xl px-3 py-2">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-2.5 rounded-full bg-tl-marrom text-tl-creme text-sm font-medium hover:bg-tl-terracota transition-colors cursor-pointer disabled:opacity-60"
                >
                  {authBusy ? 'Verificando...' : 'Entrar no ADM'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="px-5 sm:px-7 py-2.5 bg-tl-bege/75 border-b border-tl-marrom/14 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              {(
                [
                  { id: 'site', label: 'Site, Textos & Imagens', icon: LayoutTemplate },
                  { id: 'posts', label: `Publicações (${posts.length})`, icon: FileText },
                  { id: 'users', label: `Usuários (${users.length})`, icon: Users },
                  { id: 'reports', label: `Denúncias (${reports.length})`, icon: AlertTriangle },
                  { id: 'system', label: 'Sistema & Segurança', icon: ShieldCheck },
                ] as { id: AdminTab; label: string; icon: typeof LayoutTemplate }[]
              ).map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-tl-marrom text-tl-creme'
                        : 'bg-tl-creme text-tl-marrom-suave border border-tl-marrom/15 hover:text-tl-terracota'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Workspace Content */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
              {loadingOverview && (
                <div className="text-xs text-tl-marrom-suave flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Atualizando dados do servidor...</span>
                </div>
              )}

              {/* TAB 1: SITE APPEARANCE, HEROES, ANNOUNCEMENT & NAV */}
              {activeTab === 'site' && (
                <div className="space-y-6">
                  {/* Action bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-tl-bege/60 border border-tl-marrom/14">
                    <div>
                      <h3 className="font-editorial text-lg font-semibold text-tl-marrom">
                        Controle Visual e Editorial do Site
                      </h3>
                      <p className="text-xs text-tl-marrom-suave">
                        Altere títulos, frases, imagens de topo, avisos e abas visíveis na hora.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetSiteConfig}
                        disabled={savingConfig}
                        className="px-3.5 py-2 rounded-full border border-tl-marrom/20 bg-tl-creme text-xs font-medium text-tl-marrom hover:border-tl-terracota inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar padrão</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSiteConfig}
                        disabled={savingConfig}
                        className="px-5 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold hover:bg-tl-terracota inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingConfig ? 'Salvando...' : 'Publicar alterações'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Brand + Announcement */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="p-5 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-tl-terracota">
                        <Sparkles className="w-4 h-4" />
                        <span>Marca & Atmosfera Padrão</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-tl-marrom-suave mb-1">Nome do site</label>
                          <input
                            type="text"
                            value={draftConfig.brandName || ''}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({ ...prev, brandName: e.target.value }))
                            }
                            className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-tl-marrom-suave mb-1">Estação padrão</label>
                          <select
                            value={draftConfig.defaultSeason || 'outono'}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                defaultSeason: e.target.value as SeasonId,
                              }))
                            }
                            className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                          >
                            <option value="outono">Outono Literário</option>
                            <option value="inverno">Inverno Sereno</option>
                            <option value="primavera">Primavera Botânica</option>
                            <option value="verao">Verão Dourado</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-tl-marrom-suave mb-1">
                          Subtítulo opcional junto ao logo
                        </label>
                        <input
                          type="text"
                          value={draftConfig.brandTagline || ''}
                          onChange={(e) =>
                            setDraftConfig((prev) => ({ ...prev, brandTagline: e.target.value }))
                          }
                          placeholder="Ex.: Edição Especial de Primavera"
                          className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        />
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-tl-terracota">
                          <Megaphone className="w-4 h-4" />
                          <span>Faixa de Aviso Global</span>
                        </span>
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-tl-marrom cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(draftConfig.announcement?.enabled)}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                announcement: {
                                  ...(prev.announcement || { message: '', tone: 'warm' }),
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                          />
                          <span>Exibir no topo</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={draftConfig.announcement?.message || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            announcement: {
                              ...(prev.announcement || { enabled: false, tone: 'warm' }),
                              message: e.target.value,
                            },
                          }))
                        }
                        placeholder="Mensagem do aviso para todos os visitantes…"
                        className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <select
                          value={draftConfig.announcement?.tone || 'warm'}
                          onChange={(e) =>
                            setDraftConfig((prev) => ({
                              ...prev,
                              announcement: {
                                ...(prev.announcement || { enabled: false, message: '' }),
                                tone: e.target.value as 'warm' | 'terracota' | 'dark',
                              },
                            }))
                          }
                          className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        >
                          <option value="warm">Tom Creme Suave</option>
                          <option value="terracota">Tom Terracota</option>
                          <option value="dark">Tom Café Escuro</option>
                        </select>
                        <input
                          type="text"
                          value={draftConfig.announcement?.linkLabel || ''}
                          onChange={(e) =>
                            setDraftConfig((prev) => ({
                              ...prev,
                              announcement: {
                                ...(prev.announcement || { enabled: false, message: '' }),
                                linkLabel: e.target.value,
                              },
                            }))
                          }
                          placeholder="Texto do link (opcional)"
                          className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        />
                        <input
                          type="text"
                          value={draftConfig.announcement?.linkUrl || ''}
                          onChange={(e) =>
                            setDraftConfig((prev) => ({
                              ...prev,
                              announcement: {
                                ...(prev.announcement || { enabled: false, message: '' }),
                                linkUrl: e.target.value,
                              },
                            }))
                          }
                          placeholder="https://... (opcional)"
                          className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Home Hero Editor */}
                  <div className="p-5 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-tl-terracota">
                        Capa da Página Inicial (Início)
                      </span>
                      <label className="px-3.5 py-1.5 rounded-full bg-tl-bege border border-tl-marrom/18 text-xs font-medium text-tl-marrom hover:border-tl-laranja inline-flex items-center gap-1.5 cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5 text-tl-terracota" />
                        <span>{uploadingField === 'home' ? 'Enviando...' : 'Trocar imagem do Início'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadImageForTarget(e, 'home')}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={draftConfig.homeHero?.imageUrl || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            homeHero: { ...(prev.homeHero || {}), imageUrl: e.target.value },
                          }))
                        }
                        placeholder="URL da imagem de capa (deixe vazio para manter atual)"
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                      <input
                        type="text"
                        value={draftConfig.homeHero?.editionLabel || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            homeHero: { ...(prev.homeHero || {}), editionLabel: e.target.value },
                          }))
                        }
                        placeholder="Selo da edição (opcional)"
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                      <input
                        type="text"
                        value={draftConfig.homeHero?.headline || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            homeHero: { ...(prev.homeHero || {}), headline: e.target.value },
                          }))
                        }
                        placeholder="Título principal (ex.: Palavras guardadas com calma para ler,)"
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                      <input
                        type="text"
                        value={draftConfig.homeHero?.highlightText || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            homeHero: { ...(prev.homeHero || {}), highlightText: e.target.value },
                          }))
                        }
                        placeholder="Trecho em destaque itálico (ex.: escutar e lembrar.)"
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={draftConfig.homeHero?.description || ''}
                      onChange={(e) =>
                        setDraftConfig((prev) => ({
                          ...prev,
                          homeHero: { ...(prev.homeHero || {}), description: e.target.value },
                        }))
                      }
                      placeholder="Texto de apresentação abaixo do título..."
                      className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                    />
                    <input
                      type="text"
                      value={draftConfig.homeHero?.quote || ''}
                      onChange={(e) =>
                        setDraftConfig((prev) => ({
                          ...prev,
                          homeHero: { ...(prev.homeHero || {}), quote: e.target.value },
                        }))
                      }
                      placeholder="Frase em destaque do Início (ex.: “Ler devagar é devolver ao tempo a sua espessura.”)"
                      className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                    />
                  </div>

                  {/* Per-Tab Top Heroes Editor */}
                  <div className="p-5 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-tl-terracota">
                        Topo de Cada Aba (Imagem, Título e Frase)
                      </span>
                      <label className="px-3.5 py-1.5 rounded-full bg-tl-bege border border-tl-marrom/18 text-xs font-medium text-tl-marrom hover:border-tl-laranja inline-flex items-center gap-1.5 cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5 text-tl-terracota" />
                        <span>
                          {uploadingField === 'tab' ? 'Enviando...' : `Enviar imagem para ${selectedHeroTab}`}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadImageForTarget(e, 'tab')}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {ALL_EDITABLE_TABS.map((tabName) => (
                        <button
                          key={tabName}
                          type="button"
                          onClick={() => setSelectedHeroTab(tabName)}
                          className={`px-3 py-1 rounded-full text-xs border cursor-pointer transition-colors ${
                            selectedHeroTab === tabName
                              ? 'bg-tl-terracota text-tl-creme border-tl-terracota font-medium'
                              : 'bg-tl-creme text-tl-marrom-suave border-tl-marrom/15 hover:text-tl-marrom'
                          }`}
                        >
                          {tabName}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={currentTabHero.imageUrl || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            tabHeroes: {
                              ...(prev.tabHeroes || {}),
                              [selectedHeroTab]: {
                                ...(prev.tabHeroes?.[selectedHeroTab] || {}),
                                imageUrl: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder={`URL da imagem de topo de ${selectedHeroTab} (vazio = padrão)`}
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                      <input
                        type="text"
                        value={currentTabHero.kicker || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            tabHeroes: {
                              ...(prev.tabHeroes || {}),
                              [selectedHeroTab]: {
                                ...(prev.tabHeroes?.[selectedHeroTab] || {}),
                                kicker: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="Etiqueta superior (opcional)"
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                      <input
                        type="text"
                        value={currentTabHero.title || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            tabHeroes: {
                              ...(prev.tabHeroes || {}),
                              [selectedHeroTab]: {
                                ...(prev.tabHeroes?.[selectedHeroTab] || {}),
                                title: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder={`Título customizado para ${selectedHeroTab}`}
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                      <input
                        type="text"
                        value={currentTabHero.phrase || ''}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            tabHeroes: {
                              ...(prev.tabHeroes || {}),
                              [selectedHeroTab]: {
                                ...(prev.tabHeroes?.[selectedHeroTab] || {}),
                                phrase: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder={`Frase abaixo do título de ${selectedHeroTab}`}
                        className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />
                    </div>
                  </div>

                  {/* Navigation Visibility */}
                  <div className="p-5 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-3">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-tl-terracota">
                      Abas Visíveis na Barra Superior
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TOGGLEABLE_NAV_TABS.map((tabName) => {
                        const isHidden = hiddenSet.has(tabName);
                        return (
                          <button
                            key={tabName}
                            type="button"
                            onClick={() => {
                              const next = new Set(hiddenSet);
                              if (isHidden) next.delete(tabName);
                              else next.add(tabName);
                              setDraftConfig((prev) => ({
                                ...prev,
                                hiddenCategories: Array.from(next),
                              }));
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs border inline-flex items-center gap-1.5 cursor-pointer ${
                              isHidden
                                ? 'bg-tl-bege/50 text-tl-marrom-suave/70 border-tl-marrom/15 line-through'
                                : 'bg-tl-creme text-tl-marrom border-tl-marrom/20 font-medium'
                            }`}
                          >
                            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-tl-terracota" />}
                            <span>{tabName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: POSTS MANAGEMENT */}
              {activeTab === 'posts' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-tl-marrom-suave absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="search"
                          value={postQuery}
                          onChange={(e) => setPostQuery(e.target.value)}
                          placeholder="Buscar publicação por título, categoria ou autor..."
                          className="w-full pl-9 pr-3 py-2 rounded-full bg-tl-papel border border-tl-marrom/18 text-xs text-tl-marrom"
                        />
                      </div>
                      <select
                        value={postStatusFilter}
                        onChange={(e) => setPostStatusFilter(e.target.value as typeof postStatusFilter)}
                        className="rounded-full bg-tl-papel border border-tl-marrom/18 px-3 py-2 text-xs text-tl-marrom"
                      >
                        <option value="all">Todos ({posts.length})</option>
                        <option value="published">No ar</option>
                        <option value="draft">Rascunhos</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingPostId(null);
                        setPostForm({
                          title: '',
                          subtitle: '',
                          category: 'Artigos',
                          type: 'artigo',
                          coverImage: '',
                          content: '',
                          status: 'published',
                        });
                        setPostFormOpen((v) => !v);
                      }}
                      className="px-4 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium hover:bg-tl-terracota inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova publicação ADM</span>
                    </button>
                  </div>

                  {postFormOpen && (
                    <form
                      onSubmit={handleSavePostForm}
                      className="p-5 rounded-2xl bg-tl-papel border border-tl-laranja/35 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-editorial text-lg font-semibold text-tl-marrom">
                          {editingPostId ? 'Editar publicação existente' : 'Criar nova publicação editorial'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setPostFormOpen(false);
                            setEditingPostId(null);
                          }}
                          className="text-xs text-tl-marrom-suave hover:underline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          value={postForm.title}
                          onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Título da publicação"
                          className="sm:col-span-2 rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        />
                        <select
                          value={postForm.category}
                          onChange={(e) =>
                            setPostForm((prev) => ({ ...prev, category: e.target.value as TopCategory }))
                          }
                          className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        >
                          {ALL_EDITABLE_TABS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={postForm.subtitle}
                          onChange={(e) => setPostForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                          placeholder="Subtítulo (opcional)"
                          className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        />
                        <select
                          value={postForm.type}
                          onChange={(e) =>
                            setPostForm((prev) => ({ ...prev, type: e.target.value as PostType }))
                          }
                          className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        >
                          <option value="artigo">Artigo</option>
                          <option value="poema">Poema</option>
                          <option value="fotografia">Fotografia</option>
                          <option value="resenha">Resenha</option>
                          <option value="noticia">Notícia</option>
                          <option value="diario">Diário</option>
                          <option value="arte_cultura">Arte & Cultura</option>
                        </select>
                        <select
                          value={postForm.status}
                          onChange={(e) =>
                            setPostForm((prev) => ({
                              ...prev,
                              status: e.target.value as 'published' | 'draft',
                            }))
                          }
                          className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        >
                          <option value="published">Publicado</option>
                          <option value="draft">Rascunho</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={postForm.coverImage}
                          onChange={(e) => setPostForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                          placeholder="URL da imagem de capa (opcional)"
                          className="flex-1 min-w-[200px] rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                        />
                        <label className="px-3.5 py-2 rounded-full bg-tl-bege border border-tl-marrom/18 text-xs font-medium text-tl-marrom hover:border-tl-laranja inline-flex items-center gap-1.5 cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5 text-tl-terracota" />
                          <span>{uploadingField === 'post' ? 'Enviando...' : 'Enviar foto'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadImageForTarget(e, 'post')}
                          />
                        </label>
                      </div>

                      <textarea
                        rows={4}
                        required
                        value={postForm.content}
                        onChange={(e) => setPostForm((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="Texto completo da publicação..."
                        className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                      />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium hover:bg-tl-terracota cursor-pointer"
                        >
                          {editingPostId ? 'Salvar publicação' : 'Publicar no site'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {filteredPosts.map((p) => {
                      const isPinned = (draftConfig.pinnedPostIds || []).includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl bg-tl-papel border border-tl-marrom/14 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="px-2 py-0.5 rounded-full bg-tl-bege text-tl-terracota font-medium">
                                {p.category}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-medium ${
                                  p.status === 'published'
                                    ? 'bg-emerald-700/12 text-emerald-800'
                                    : 'bg-amber-700/12 text-amber-800'
                                }`}
                              >
                                {p.status === 'published' ? 'No ar' : 'Rascunho'}
                              </span>
                              {isPinned && (
                                <span className="px-2 py-0.5 rounded-full bg-tl-laranja text-tl-creme font-medium">
                                  Fixado no topo
                                </span>
                              )}
                              <span className="text-tl-marrom-suave">por {p.author.displayName}</span>
                            </div>
                            <h4 className="font-editorial text-base font-semibold text-tl-marrom truncate">
                              {p.title}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTogglePinPost(p.id)}
                              title={isPinned ? 'Desafixar' : 'Fixar no topo do feed'}
                              className={`px-2.5 py-1.5 rounded-full text-xs border inline-flex items-center gap-1 cursor-pointer ${
                                isPinned
                                  ? 'bg-tl-laranja text-tl-creme border-tl-laranja'
                                  : 'bg-tl-creme text-tl-marrom border-tl-marrom/18 hover:border-tl-laranja'
                              }`}
                            >
                              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                              <span>{isPinned ? 'Desafixar' : 'Fixar'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePostStatus(p)}
                              className="px-2.5 py-1.5 rounded-full text-xs border border-tl-marrom/18 bg-tl-creme text-tl-marrom hover:border-tl-laranja cursor-pointer"
                            >
                              {p.status === 'published' ? 'Ocultar' : 'Publicar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(p.id);
                                setPostForm({
                                  title: p.title,
                                  subtitle: p.subtitle || '',
                                  category: p.category,
                                  type: p.type,
                                  coverImage: p.coverImage || '',
                                  content: p.content,
                                  status: p.status,
                                });
                                setPostFormOpen(true);
                              }}
                              className="p-1.5 rounded-full border border-tl-marrom/18 bg-tl-creme text-tl-marrom hover:text-tl-terracota cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePost(p.id)}
                              className="p-1.5 rounded-full border border-tl-marrom/18 bg-tl-creme text-tl-terracota hover:bg-tl-terracota hover:text-tl-creme cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: USERS MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-tl-marrom-suave absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Buscar usuário por nome, @usuário ou e-mail..."
                      className="w-full pl-9 pr-3 py-2 rounded-full bg-tl-papel border border-tl-marrom/18 text-xs text-tl-marrom"
                    />
                  </div>

                  <div className="space-y-2.5">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-editorial text-base font-semibold text-tl-marrom">
                                {u.displayName}
                              </span>
                              <span className="text-xs text-tl-marrom-suave">@{u.username}</span>
                              {u.role === 'developer' && (
                                <span className="px-2 py-0.5 rounded-full bg-tl-marrom text-tl-creme text-[10px] font-semibold">
                                  Desenvolvedora
                                </span>
                              )}
                              {u.isVerifiedBadge && (
                                <span className="px-2 py-0.5 rounded-full bg-tl-laranja/20 text-tl-terracota text-[10px] font-semibold">
                                  Selo Editorial
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-tl-marrom-suave">
                              {u.email} · {u.postsCount} publicações · {u.followersCount} seguidores
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleVerifiedUser(u)}
                              className={`px-2.5 py-1.5 rounded-full text-xs border inline-flex items-center gap-1 cursor-pointer ${
                                u.isVerifiedBadge
                                  ? 'bg-tl-laranja text-tl-creme border-tl-laranja'
                                  : 'bg-tl-creme text-tl-marrom border-tl-marrom/18'
                              }`}
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>{u.isVerifiedBadge ? 'Com selo' : 'Dar selo'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(editingUserId === u.id ? null : u.id);
                                setUserEditName(u.displayName);
                                setUserEditBio(u.bio || '');
                              }}
                              className="p-1.5 rounded-full border border-tl-marrom/18 bg-tl-creme text-tl-marrom hover:text-tl-terracota cursor-pointer"
                              title="Editar usuário"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {u.role !== 'developer' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 rounded-full border border-tl-marrom/18 bg-tl-creme text-tl-terracota hover:bg-tl-terracota hover:text-tl-creme cursor-pointer"
                                title="Remover conta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {editingUserId === u.id && (
                          <div className="pt-2 border-t border-tl-areia/60 space-y-2">
                            <input
                              type="text"
                              value={userEditName}
                              onChange={(e) => setUserEditName(e.target.value)}
                              className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-1.5 text-xs text-tl-marrom"
                            />
                            <input
                              type="text"
                              value={userEditBio}
                              onChange={(e) => setUserEditBio(e.target.value)}
                              className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-1.5 text-xs text-tl-marrom"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveUserEdit(u.id)}
                              className="px-4 py-1.5 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium cursor-pointer"
                            >
                              Salvar perfil
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: REPORTS MODERATION */}
              {activeTab === 'reports' && (
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-tl-papel border border-tl-marrom/14 text-center space-y-1.5">
                      <Check className="w-6 h-6 text-emerald-700 mx-auto" />
                      <p className="font-editorial text-lg text-tl-marrom">Nenhuma denúncia pendente</p>
                      <p className="text-xs text-tl-marrom-suave">
                        A comunidade está tranquila no momento.
                      </p>
                    </div>
                  ) : (
                    reports.map((r) => (
                      <div
                        key={r.id}
                        className="p-4 rounded-2xl bg-tl-papel border border-tl-marrom/14 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-tl-terracota uppercase tracking-wide">
                            {r.targetType} · {r.reason}
                          </div>
                          <p className="text-xs text-tl-marrom">{r.details || 'Sem detalhes adicionais.'}</p>
                          <p className="text-[11px] text-tl-marrom-suave">
                            Enviado por {r.reporterName} · ID alvo: {r.targetId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.id, 'dismiss')}
                            className="px-3 py-1.5 rounded-full border border-tl-marrom/18 bg-tl-creme text-xs text-tl-marrom cursor-pointer"
                          >
                            Arquivar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.id, 'delete_target')}
                            className="px-3 py-1.5 rounded-full bg-tl-terracota text-tl-creme text-xs cursor-pointer"
                          >
                            Excluir conteúdo
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: SYSTEM, BACKUP & SECURITY */}
              {activeTab === 'system' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Usuários cadastrados', val: stats.usersCount },
                      { label: 'Posts no ar', val: stats.publishedPostsCount },
                      { label: 'Rascunhos', val: stats.draftPostsCount },
                      { label: 'Comentários', val: stats.commentsCount },
                      { label: 'Diários', val: stats.diariesCount },
                      { label: 'Denúncias', val: stats.reportsCount },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="p-4 rounded-2xl bg-tl-papel border border-tl-marrom/14"
                      >
                        <div className="font-editorial text-2xl font-semibold text-tl-marrom tabular-nums">
                          {s.val}
                        </div>
                        <div className="text-xs text-tl-marrom-suave">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-3">
                      <h4 className="font-editorial text-lg font-semibold text-tl-marrom">
                        Ferramentas do Site
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleSyncNewsNow}
                          disabled={syncingNews}
                          className="px-4 py-2 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium hover:bg-tl-terracota inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingNews ? 'animate-spin' : ''}`} />
                          <span>{syncingNews ? 'Sincronizando...' : 'Sincronizar notícias RSS'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportBackup}
                          className="px-4 py-2 rounded-full border border-tl-marrom/20 bg-tl-creme text-xs font-medium text-tl-marrom hover:border-tl-laranja inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar backup JSON</span>
                        </button>
                      </div>
                    </div>

                    <form
                      onSubmit={handleChangePasscode}
                      className="p-5 rounded-2xl bg-tl-papel border border-tl-marrom/14 space-y-3"
                    >
                      <h4 className="font-editorial text-lg font-semibold text-tl-marrom">
                        Senha Mestra da Desenvolvedora
                      </h4>
                      <p className="text-[11px] text-tl-marrom-suave leading-relaxed">
                        Atalho secreto de acesso: abra <span className="font-mono">#dev-adm</span> no
                        endereço, pressione <span className="font-mono">Ctrl+Shift+D</span> ou toque 5x
                        seguidas no logo Thinklive.
                      </p>
                      {adminStatus.usesEnvPasscode ? (
                        <p className="text-xs text-tl-terracota">
                          Senha gerenciada pela variável <span className="font-mono">DEVELOPER_PASSCODE</span> na Vercel.
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="password"
                            minLength={8}
                            value={newMasterPass}
                            onChange={(e) => setNewMasterPass(e.target.value)}
                            placeholder="Nova senha mestra (mín. 8)"
                            className="flex-1 rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium hover:bg-tl-terracota cursor-pointer"
                          >
                            Alterar
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
