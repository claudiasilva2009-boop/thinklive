import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  Check,
  Eye,
  EyeOff,
  Flower2,
  Image as ImageIcon,
  Layers,
  Leaf,
  Link2,
  Palette,
  Plus,
  RotateCcw,
  Snowflake,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User as UserIcon,
  X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { api, readImageFileOptimized } from '../lib/api';
import {
  BANNER_PRESETS,
  DEFAULT_SHELF_CONFIG,
  ensureAccessibleTheme,
  FONT_OPTIONS,
  getBackgroundTextureStyle,
  getBannerFilterCss,
  getButtonShapeClasses,
  getContrastRatio,
  getDefaultProfileCustomization,
  getFontCss,
  getSeasonTheme,
  getShelfBackdropStyle,
  getShelfWoodStyle,
  normalizeProfileSectionOrder,
  normalizeSeasonId,
  PROFILE_THEME_PRESETS,
  SEASON_THEME_LIST,
} from '../lib/themes';
import {
  AvatarPositionMode,
  BannerFilterMode,
  ProfileBackgroundTexture,
  ProfileCardStyle,
  ProfileCustomization,
  ProfileOrnamentStyle,
  ProfileSectionId,
  ProfileTheme,
  SeasonId,
  ShelfBackdropTone,
  ShelfBookSize,
  ShelfDisplayMode,
  ShelfSpacing,
  ShelfVisualConfig,
  ShelfWoodTone,
  UserPublic,
} from '../types/thinklive';
import { ImageWithFallback, UserAvatar } from './ImageWithFallback';
import { SeasonalAtmosphereBackground } from './SeasonalAtmosphereBackground';

interface CustomizeSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserPublic;
  onSaved: (updated: UserPublic) => void;
}

type EditorTab = 'temas' | 'capa_perfil' | 'estilo' | 'prateleira' | 'secoes';

const SECTION_LABELS: Record<ProfileSectionId, string> = {
  bio: 'Biografia e apresentação',
  quote: 'Frase favorita',
  links: 'Botões e links externos',
  shelves: 'Minha Prateleira (estante realista)',
  custom_collections: 'Coleções personalizadas',
  books: 'Livros',
  movies_series: 'Filmes e séries',
  favorites: 'Favoritos',
  reviews: 'Avaliações',
  cultural: 'Caderno Cultural',
  music_library: 'Biblioteca musical',
  posts: 'Publicações',
};

export function CustomizeSpaceModal({ isOpen, onClose, user, onSaved }: CustomizeSpaceModalProps) {
  const [editorTab, setEditorTab] = useState<EditorTab>('temas');
  const [mobilePreviewMode, setMobilePreviewMode] = useState(false);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [usernameDraft, setUsernameDraft] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [custom, setCustom] = useState<ProfileCustomization>(user.customization);
  const [applyRecommendedOnPreset, setApplyRecommendedOnPreset] = useState(true);

  const [newThemeName, setNewThemeName] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<'banner' | 'avatar' | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(user.displayName);
    setUsernameDraft(user.username);
    setBio(user.bio);
    setAvatarUrl(user.avatarUrl);
    setSaveError(null);
    setMobilePreviewMode(false);
    setCustom({
      ...user.customization,
      seasonTheme: normalizeSeasonId(user.customization.seasonTheme),
      bannerPositionY: user.customization.bannerPositionY ?? 50,
      bannerFilter: user.customization.bannerFilter ?? 'none',
      avatarPosition: user.customization.avatarPosition ?? 'overlap',
      sectionOrder: normalizeProfileSectionOrder(user.customization.sectionOrder),
      shelfConfig: {
        ...DEFAULT_SHELF_CONFIG,
        ...(user.customization.shelfConfig || {}),
        categoryLabels: {
          ...DEFAULT_SHELF_CONFIG.categoryLabels,
          ...(user.customization.shelfConfig?.categoryLabels || {}),
        },
      },
    });
  }, [isOpen, user]);

  if (!isOpen) return null;

  const selectedSeason: SeasonId = normalizeSeasonId(custom.seasonTheme);
  const selectedSeasonConfig = getSeasonTheme(selectedSeason);
  const safeTheme = ensureAccessibleTheme(custom.theme);
  const btnShape = getButtonShapeClasses(safeTheme.buttonStyle);
  const contrastRatio = getContrastRatio(custom.theme.backgroundColor, custom.theme.textColor);
  const contrastAdjusted = contrastRatio < 4.5;
  const shelfCfg: ShelfVisualConfig = {
    ...DEFAULT_SHELF_CONFIG,
    ...(custom.shelfConfig || {}),
    categoryLabels: {
      ...DEFAULT_SHELF_CONFIG.categoryLabels,
      ...(custom.shelfConfig?.categoryLabels || {}),
    },
  };

  function renderSeasonIcon(id: SeasonId) {
    if (id === 'inverno') return <Snowflake className="w-4 h-4" />;
    if (id === 'primavera') return <Flower2 className="w-4 h-4" />;
    if (id === 'verao') return <Sun className="w-4 h-4" />;
    return <Leaf className="w-4 h-4" />;
  }

  function applySeasonTheme(seasonId: SeasonId) {
    const cfg = getSeasonTheme(seasonId);
    setCustom((prev) => {
      const usingPresetBanner =
        !prev.bannerUrl || BANNER_PRESETS.some((b) => b.url === prev.bannerUrl);
      return {
        ...prev,
        seasonTheme: seasonId,
        theme: { ...prev.theme, ...cfg.profileTheme },
        bannerUrl: usingPresetBanner ? cfg.bannerUrl : prev.bannerUrl,
      };
    });
  }

  function applyProfilePreset(preset: (typeof PROFILE_THEME_PRESETS)[number]) {
    setCustom((prev) => ({
      ...prev,
      bannerUrl:
        applyRecommendedOnPreset && preset.recommendedBanner
          ? preset.recommendedBanner
          : prev.bannerUrl,
      bannerColor: applyRecommendedOnPreset ? '' : prev.bannerColor,
      theme: { ...preset.theme },
      shelfConfig: applyRecommendedOnPreset
        ? {
            ...DEFAULT_SHELF_CONFIG,
            ...(prev.shelfConfig || {}),
            woodTone: preset.recommendedWood,
            backdropTone: preset.recommendedBackdrop,
          }
        : prev.shelfConfig,
    }));
  }

  function updateTheme(partial: Partial<ProfileTheme>) {
    setCustom((prev) => ({
      ...prev,
      theme: { ...prev.theme, ...partial },
    }));
  }

  function updateShelfCfg(partial: Partial<ShelfVisualConfig>) {
    setCustom((prev) => ({
      ...prev,
      shelfConfig: {
        ...DEFAULT_SHELF_CONFIG,
        ...(prev.shelfConfig || {}),
        ...partial,
        categoryLabels: {
          ...DEFAULT_SHELF_CONFIG.categoryLabels,
          ...(prev.shelfConfig?.categoryLabels || {}),
          ...(partial.categoryLabels || {}),
        },
      },
    }));
  }

  function applyTheme(t: ProfileTheme) {
    setCustom((prev) => ({ ...prev, theme: { ...t } }));
  }

  function saveCurrentAsCustomTheme() {
    const label = newThemeName.trim() || `Meu tema ${custom.savedThemes.length + 1}`;
    const saved: ProfileTheme = {
      ...safeTheme,
      id: `custom_${Date.now()}`,
      name: label,
    };
    setCustom((prev) => ({
      ...prev,
      theme: saved,
      savedThemes: [saved, ...prev.savedThemes],
    }));
    setNewThemeName('');
  }

  function deleteSavedTheme(id: string) {
    setCustom((prev) => ({
      ...prev,
      savedThemes: prev.savedThemes.filter((t) => t.id !== id),
    }));
  }

  function handleResetDefault() {
    const reset = getDefaultProfileCustomization({
      savedThemes: custom.savedThemes,
      links: custom.links,
    });
    setCustom(reset);
    setSaveError(null);
  }

  async function handleImageUpload(field: 'banner' | 'avatar', e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    setSaveError(null);
    try {
      const dataUrl = await readImageFileOptimized(file, field === 'banner' ? 1600 : 720);
      const res = await api.uploadImage(dataUrl, field);
      if (field === 'banner') {
        setCustom((prev) => ({ ...prev, bannerUrl: res.url, bannerColor: '' }));
      } else {
        setAvatarUrl(res.url);
      }
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar a imagem. Tente JPG, PNG ou WEBP.'
      );
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const visibleOrder = normalizeProfileSectionOrder(custom.sectionOrder);
    const secId = visibleOrder[idx];
    const targetId = visibleOrder[idx + dir];
    if (!secId || !targetId) return;
    const copy = [...visibleOrder];
    copy[idx] = targetId;
    copy[idx + dir] = secId;
    setCustom((prev) => ({ ...prev, sectionOrder: copy }));
  }

  function toggleSectionVisibility(id: ProfileSectionId) {
    setCustom((prev) => {
      const hidden = prev.hiddenSections.includes(id)
        ? prev.hiddenSections.filter((s) => s !== id)
        : [...prev.hiddenSections, id];
      return { ...prev, hiddenSections: hidden };
    });
  }

  function addLink() {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    const url = newLinkUrl.startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`;
    setCustom((prev) => ({
      ...prev,
      links: [...prev.links, { id: `lnk_${Date.now()}`, label: newLinkLabel.trim(), url }],
    }));
    setNewLinkLabel('');
    setNewLinkUrl('');
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.saveCustomization({
        displayName,
        username: usernameDraft,
        bio,
        avatarUrl,
        customization: {
          ...custom,
          sectionOrder: normalizeProfileSectionOrder(custom.sectionOrder),
          theme: safeTheme,
          shelfConfig: shelfCfg,
        },
      });
      onSaved(res.user);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  const bioSizeClass =
    safeTheme.fontSize === 'sm' ? 'text-xs' : safeTheme.fontSize === 'lg' ? 'text-base' : 'text-sm';

  const editableSections = normalizeProfileSectionOrder(custom.sectionOrder);
  const previewWood = getShelfWoodStyle(shelfCfg.woodTone);
  const previewBackdrop = getShelfBackdropStyle(shelfCfg.backdropTone);
  const previewTexture = getBackgroundTextureStyle(safeTheme.backgroundTexture, safeTheme.textColor);
  const bannerFilterCss = getBannerFilterCss(custom.bannerFilter);
  const avatarPos = custom.avatarPosition || 'overlap';

  const previewCardClass =
    safeTheme.cardStyle === 'diary'
      ? 'rounded-2xl border shadow-sm'
      : safeTheme.cardStyle === 'glass'
      ? 'rounded-3xl border backdrop-blur-md shadow-md'
      : safeTheme.cardStyle === 'classic'
      ? 'rounded-xl border-2 shadow-xs'
      : 'rounded-3xl border editorial-shadow';

  return (
    <div className="fixed inset-0 z-50 bg-[#241419]/65 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
      <div className="bg-[#F5E9E8] w-full max-w-6xl h-full md:h-[92vh] md:rounded-3xl border border-[#493039]/18 editorial-shadow flex flex-col overflow-hidden">
        {/* Studio Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#FFF9F5] border-b border-[#D9B8C0]/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-full bg-[#F5E9E8] border border-[#D9B8C0] text-[#803C50] flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#493039] truncate">
                Personalizar meu perfil
              </h2>
              <p className="text-[11px] sm:text-xs text-[#7B5A65] hidden sm:block">
                Temas literários, capa, paleta, texturas, estante realista e ordem das seções em tempo real.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMobilePreviewMode((v) => !v)}
              className="lg:hidden px-3 py-2 text-xs font-medium bg-[#F5E9E8] text-[#493039] border border-[#D9B8C0] rounded-full cursor-pointer"
            >
              {mobilePreviewMode ? 'Editar' : 'Visualizar perfil'}
            </button>
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3.5 py-2 text-xs font-medium bg-[#F5E9E8] text-[#493039] border border-[#D9B8C0] rounded-full hover:border-[#B65B76] inline-flex items-center gap-1.5 cursor-pointer"
              title="Restaurar estilo padrão Pink Diary"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#803C50]" />
              <span className="hidden sm:inline">Restaurar padrão</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hidden lg:inline-flex px-3.5 py-2 text-xs font-medium bg-[#FFF9F5] text-[#493039] border border-[#D9B8C0] rounded-full hover:border-[#B65B76] items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#803C50]" />
              <span>Visualizar perfil</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 sm:px-5 py-2 text-xs font-semibold bg-[#803C50] text-[#FFF9F5] rounded-full hover:bg-[#B65B76] active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Salvando…' : 'Salvar alterações'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar personalização"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-[#493039] hover:bg-[#F5E9E8] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {saveError && (
          <div className="px-5 py-2 bg-[#803C50] text-[#FFF9F5] text-xs font-medium">
            {saveError}
          </div>
        )}

        {/* Split Editor + Live Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Controls Column */}
          <div
            className={`lg:col-span-6 overflow-hidden flex flex-col bg-[#FFF9F5] border-b lg:border-b-0 lg:border-r border-[#D9B8C0]/70 ${
              mobilePreviewMode ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Editor Sub-Navigation */}
            <div className="px-4 py-2.5 border-b border-[#D9B8C0]/55 bg-[#F5E9E8]/55 flex items-center gap-1.5 overflow-x-auto shrink-0">
              {[
                { id: 'temas' as EditorTab, label: 'Temas', icon: Sparkles },
                { id: 'capa_perfil' as EditorTab, label: 'Capa & Perfil', icon: UserIcon },
                { id: 'estilo' as EditorTab, label: 'Visual & Cartões', icon: ImageIcon },
                { id: 'prateleira' as EditorTab, label: 'Prateleira', icon: BookMarked },
                { id: 'secoes' as EditorTab, label: 'Seções', icon: Layers },
              ].map((t) => {
                const Icon = t.icon;
                const active = editorTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditorTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#803C50] text-[#FFF9F5]'
                        : 'bg-[#FFF9F5] text-[#493039] border border-[#D9B8C0]/80 hover:border-[#B65B76]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {editorTab === 'temas' && (
                <>
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                          8 Temas Editoriais Prontos
                        </h3>
                        <p className="text-xs text-[#7B5A65]">
                          Escolha um universo completo ou combine elementos manualmente nas outras abas.
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-[#493039] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyRecommendedOnPreset}
                          onChange={(e) => setApplyRecommendedOnPreset(e.target.checked)}
                          className="accent-[#803C50]"
                        />
                        <span>Aplicar madeira e capa sugeridas</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PROFILE_THEME_PRESETS.map((preset) => {
                        const isActive = custom.theme.id === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyProfilePreset(preset)}
                            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isActive
                                ? 'border-[#803C50] bg-[#F5E9E8] ring-2 ring-[#B65B76]/30'
                                : 'border-[#D9B8C0] bg-[#FFF9F5] hover:border-[#B65B76]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-editorial text-lg font-semibold text-[#493039]">
                                {preset.name}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {[
                                  preset.theme.backgroundColor,
                                  preset.theme.surfaceColor,
                                  preset.theme.buttonBg,
                                  preset.theme.accentColor,
                                ].map((hex, i) => (
                                  <span
                                    key={`${preset.id}_${i}`}
                                    className="w-3 h-3 rounded-full border border-[#493039]/25"
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-[11px] text-[#7B5A65] mt-1">{preset.subtitle}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="pt-4 border-t border-[#D9B8C0]/60 space-y-3">
                    <div>
                      <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                        Atmosfera das Estações do Ano
                      </h3>
                      <p className="text-xs text-[#7B5A65]">
                        Ativa animações sazonais sutis ao redor do seu espaço.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {SEASON_THEME_LIST.map((season) => {
                        const isActive = selectedSeason === season.id;
                        return (
                          <button
                            key={season.id}
                            type="button"
                            onClick={() => applySeasonTheme(season.id)}
                            className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                              isActive
                                ? 'border-[#803C50] bg-[#F5E9E8]'
                                : 'border-[#D9B8C0] bg-[#FFF9F5] hover:border-[#B65B76]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-7 h-7 rounded-full flex items-center justify-center border shrink-0"
                                style={{
                                  backgroundColor: season.profileTheme.surfaceColor,
                                  color: season.profileTheme.buttonBg,
                                  borderColor: `${season.profileTheme.textColor}24`,
                                }}
                              >
                                {renderSeasonIcon(season.id)}
                              </span>
                              <div>
                                <div className="font-editorial text-base font-semibold text-[#493039]">
                                  {season.name}
                                </div>
                                <div className="text-[10px] text-[#803C50]">
                                  {season.animationLabel}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="pt-4 border-t border-[#D9B8C0]/60 space-y-3">
                    <h3 className="font-editorial text-lg font-semibold text-[#493039]">
                      Salvar combinação atual como tema próprio
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder="Ex.: Meu Diário de Outono Rosé…"
                        className="flex-1 rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                      />
                      <button
                        type="button"
                        onClick={saveCurrentAsCustomTheme}
                        className="px-4 py-2 text-xs font-semibold bg-[#803C50] text-[#FFF9F5] rounded-full hover:bg-[#B65B76] flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Salvar tema</span>
                      </button>
                    </div>
                    {custom.savedThemes.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {custom.savedThemes.map((st) => (
                          <div
                            key={st.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5E9E8] border border-[#D9B8C0] text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => applyTheme(st)}
                              className="flex items-center gap-1.5 font-medium cursor-pointer text-[#493039]"
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-[#493039]/25"
                                style={{ backgroundColor: st.buttonBg }}
                              />
                              <span>{st.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSavedTheme(st.id)}
                              className="text-[#803C50] cursor-pointer"
                              title="Excluir tema salvo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {editorTab === 'capa_perfil' && (
                <>
                  <section className="space-y-3">
                    <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                      Identidade & Foto de Perfil
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Nome de exibição
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Nome de usuário (@)
                        </label>
                        <input
                          type="text"
                          value={usernameDraft}
                          onChange={(e) => setUsernameDraft(e.target.value)}
                          className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Foto de perfil
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => avatarFileInputRef.current?.click()}
                            disabled={uploadingField === 'avatar'}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F5E9E8] border border-[#D9B8C0] text-[#493039] rounded-xl cursor-pointer hover:border-[#B65B76] disabled:opacity-60"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingField === 'avatar' ? 'Enviando…' : 'Enviar'}</span>
                          </button>
                          <input
                            ref={avatarFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload('avatar', e)}
                            className="sr-only"
                          />
                          <input
                            type="text"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="ou URL da foto"
                            className="flex-1 rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-2.5 py-2 text-xs text-[#493039]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Posição da foto de perfil
                        </label>
                        <select
                          value={custom.avatarPosition || 'overlap'}
                          onChange={(e) =>
                            setCustom((prev) => ({
                              ...prev,
                              avatarPosition: e.target.value as AvatarPositionMode,
                            }))
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="overlap">Sobreposta à esquerda (editorial)</option>
                          <option value="center">Centralizada abaixo da capa</option>
                          <option value="left">Alinhada à esquerda abaixo da capa</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                        Biografia
                      </label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Frase favorita / citação pessoal
                        </label>
                        <input
                          type="text"
                          value={custom.epigraph}
                          onChange={(e) =>
                            setCustom((prev) => ({ ...prev, epigraph: e.target.value }))
                          }
                          placeholder="Uma frase que resume o clima do seu perfil…"
                          className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Autor da frase (opcional)
                        </label>
                        <input
                          type="text"
                          value={custom.favoriteQuoteAuthor || ''}
                          onChange={(e) =>
                            setCustom((prev) => ({
                              ...prev,
                              favoriteQuoteAuthor: e.target.value,
                            }))
                          }
                          placeholder="Ex.: Clarice Lispector"
                          className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="pt-4 border-t border-[#D9B8C0]/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                        Capa / Banner do Perfil
                      </h3>
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        disabled={uploadingField === 'banner'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#803C50] text-[#FFF9F5] text-xs font-semibold hover:bg-[#B65B76] cursor-pointer disabled:opacity-60"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === 'banner' ? 'Enviando…' : 'Enviar foto do aparelho'}</span>
                      </button>
                      <input
                        ref={bannerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('banner', e)}
                        className="sr-only"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                        Ou colar link (URL) da imagem do banner
                      </label>
                      <input
                        type="text"
                        value={custom.bannerUrl || ''}
                        onChange={(e) =>
                          setCustom((prev) => ({
                            ...prev,
                            bannerUrl: e.target.value,
                            bannerColor: '',
                          }))
                        }
                        placeholder="https://… ou /uploads/…"
                        className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                      {BANNER_PRESETS.map((b) => {
                        const active = custom.bannerUrl === b.url && !custom.bannerColor;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() =>
                              setCustom((prev) => ({
                                ...prev,
                                bannerUrl: b.url,
                                bannerColor: '',
                              }))
                            }
                            className={`group relative h-14 rounded-xl overflow-hidden border text-left cursor-pointer transition-all ${
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Enquadramento ({custom.bannerPositionY ?? 50}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={custom.bannerPositionY ?? 50}
                          onChange={(e) =>
                            setCustom((prev) => ({
                              ...prev,
                              bannerPositionY: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#803C50]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Filtro da capa
                        </label>
                        <select
                          value={custom.bannerFilter || 'none'}
                          onChange={(e) =>
                            setCustom((prev) => ({
                              ...prev,
                              bannerFilter: e.target.value as BannerFilterMode,
                            }))
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-2.5 py-2 text-xs text-[#493039]"
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
                          Ou usar cor na capa
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={custom.bannerColor || '#D9B8C0'}
                            onChange={(e) =>
                              setCustom((prev) => ({ ...prev, bannerColor: e.target.value }))
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                          />
                          {custom.bannerColor && (
                            <button
                              type="button"
                              onClick={() =>
                                setCustom((prev) => ({ ...prev, bannerColor: '' }))
                              }
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
                        Frase delicada na capa (opcional)
                      </label>
                      <input
                        type="text"
                        value={custom.bannerQuote || ''}
                        onChange={(e) =>
                          setCustom((prev) => ({ ...prev, bannerQuote: e.target.value }))
                        }
                        placeholder="Ex.: Capítulo III · Leituras de Outono"
                        className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                      />
                    </div>
                  </section>

                  <section className="pt-4 border-t border-[#D9B8C0]/60 space-y-3">
                    <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                      Botões e links externos
                    </h3>
                    {custom.links.map((lnk) => (
                      <div
                        key={lnk.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] text-xs"
                      >
                        <span className="truncate text-[#493039]">
                          <strong>{lnk.label}</strong> · {lnk.url}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCustom((prev) => ({
                              ...prev,
                              links: prev.links.filter((l) => l.id !== lnk.id),
                            }))
                          }
                          className="text-[#803C50] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <input
                        type="text"
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        placeholder="Rótulo do botão"
                        className="sm:col-span-2 rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-1.5 text-xs text-[#493039]"
                      />
                      <input
                        type="text"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="sm:col-span-2 rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-1.5 text-xs text-[#493039]"
                      />
                      <button
                        type="button"
                        onClick={addLink}
                        className="px-3 py-1.5 text-xs font-medium bg-[#493039] text-[#FFF9F5] rounded-full flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </section>
                </>
              )}

              {editorTab === 'estilo' && (
                <>
                  <section className="space-y-3">
                    <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                      Paleta de cores pessoal
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { key: 'backgroundColor', label: 'Fundo' },
                        { key: 'surfaceColor', label: 'Cartões' },
                        { key: 'textColor', label: 'Texto' },
                        { key: 'mutedColor', label: 'Subtítulos' },
                        { key: 'buttonBg', label: 'Botões' },
                        { key: 'buttonText', label: 'Texto botão' },
                        { key: 'accentColor', label: 'Vinho / Destaque' },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] text-xs font-medium text-[#493039]"
                        >
                          <span>{item.label}</span>
                          <input
                            type="color"
                            value={String(custom.theme[item.key as keyof ProfileTheme] || '#803C50')}
                            onChange={(e) => updateTheme({ [item.key]: e.target.value })}
                            className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                          />
                        </label>
                      ))}
                    </div>

                    {contrastAdjusted && (
                      <p className="text-[11px] text-[#803C50] bg-[#F5E9E8] px-3 py-2 rounded-xl border border-[#D9B8C0]">
                        Ajuste automático de contraste ativo na prévia para garantir leitura confortável.
                      </p>
                    )}
                  </section>

                  <section className="pt-4 border-t border-[#D9B8C0]/60 space-y-3">
                    <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                      Texturas, Cartões e Ornamentos
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Textura de fundo
                        </label>
                        <select
                          value={custom.theme.backgroundTexture || 'paper'}
                          onChange={(e) =>
                            updateTheme({
                              backgroundTexture: e.target.value as ProfileBackgroundTexture,
                            })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="smooth">Marfim liso</option>
                          <option value="paper">Papel vintage granulado</option>
                          <option value="linen">Linho delicado</option>
                          <option value="ruled">Pauta de diário pessoal</option>
                          <option value="marble">Sombra marmorizada suave</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Estilo dos cartões
                        </label>
                        <select
                          value={custom.theme.cardStyle || 'diary'}
                          onChange={(e) =>
                            updateTheme({ cardStyle: e.target.value as ProfileCardStyle })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="editorial">Revista editorial</option>
                          <option value="diary">Diário em papel</option>
                          <option value="glass">Vidro suave romântico</option>
                          <option value="classic">Moldura clássica</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Elementos decorativos
                        </label>
                        <select
                          value={custom.theme.ornamentStyle || 'pressed_flowers'}
                          onChange={(e) =>
                            updateTheme({
                              ornamentStyle: e.target.value as ProfileOrnamentStyle,
                            })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="pressed_flowers">Flores prensadas</option>
                          <option value="wax_seal">Selo de cera literário</option>
                          <option value="gold_leaf">Folhas douradas</option>
                          <option value="ribbon">Laço & filigrana vintage</option>
                          <option value="none">Sem ornamentos</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Estilo dos botões
                        </label>
                        <select
                          value={custom.theme.buttonStyle || 'rounded'}
                          onChange={(e) =>
                            updateTheme({
                              buttonStyle: e.target.value as ProfileTheme['buttonStyle'],
                            })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="rounded">Arredondado romântico</option>
                          <option value="editorial">Editorial suave</option>
                          <option value="minimal">Reto clássico</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="pt-4 border-t border-[#D9B8C0]/60 space-y-3">
                    <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                      Tipografia
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Fonte dos títulos
                        </label>
                        <select
                          value={custom.theme.nameFont}
                          onChange={(e) => updateTheme({ nameFont: e.target.value })}
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-2.5 py-2 text-xs text-[#493039]"
                        >
                          {FONT_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label} ({f.group})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Fonte dos textos
                        </label>
                        <select
                          value={custom.theme.bioFont}
                          onChange={(e) => updateTheme({ bioFont: e.target.value })}
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-2.5 py-2 text-xs text-[#493039]"
                        >
                          {FONT_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label} ({f.group})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Tamanho do texto
                        </label>
                        <select
                          value={custom.theme.fontSize}
                          onChange={(e) =>
                            updateTheme({ fontSize: e.target.value as 'sm' | 'md' | 'lg' })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-2.5 py-2 text-xs text-[#493039]"
                        >
                          <option value="sm">Compacto</option>
                          <option value="md">Equilibrado</option>
                          <option value="lg">Ampliado</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {editorTab === 'prateleira' && (
                <>
                  <section className="space-y-3">
                    <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                      Biblioteca Americana Realista
                    </h3>
                    <p className="text-xs text-[#7B5A65]">
                      Personalize a madeira, o fundo da estante, o tamanho dos volumes e o modo de exibição.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Cor das prateleiras de madeira
                        </label>
                        <select
                          value={shelfCfg.woodTone}
                          onChange={(e) =>
                            updateShelfCfg({ woodTone: e.target.value as ShelfWoodTone })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="clara">Madeira clara</option>
                          <option value="escura">Madeira escura</option>
                          <option value="envelhecida">Madeira envelhecida</option>
                          <option value="branca">Prateleiras brancas</option>
                          <option value="marrom">Prateleiras em tons de marrom</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Fundo da biblioteca
                        </label>
                        <select
                          value={shelfCfg.backdropTone}
                          onChange={(e) =>
                            updateShelfCfg({
                              backdropTone: e.target.value as ShelfBackdropTone,
                            })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="escuro">Biblioteca clássica escura</option>
                          <option value="marfim">Marfim claro</option>
                          <option value="rosa_antigo">Rosa antigo</option>
                          <option value="verde_salvia">Verde sálvia</option>
                          <option value="vinho">Veludo vinho</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Organização visual
                        </label>
                        <select
                          value={shelfCfg.displayMode}
                          onChange={(e) =>
                            updateShelfCfg({
                              displayMode: e.target.value as ShelfDisplayMode,
                            })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="capas_3d">Capas reais + lombada 3D</option>
                          <option value="misto">Misto (capas & lombadas)</option>
                          <option value="lombadas">Apenas lombadas de couro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Tamanho dos livros
                        </label>
                        <select
                          value={shelfCfg.bookSize}
                          onChange={(e) =>
                            updateShelfCfg({ bookSize: e.target.value as ShelfBookSize })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="compacto">Compacto</option>
                          <option value="medio">Equilibrado</option>
                          <option value="grande">Ampliado</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Espaçamento entre obras
                        </label>
                        <select
                          value={shelfCfg.spacing}
                          onChange={(e) =>
                            updateShelfCfg({ spacing: e.target.value as ShelfSpacing })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value="junto">Junto (biblioteca cheia)</option>
                          <option value="equilibrado">Equilibrado</option>
                          <option value="arejado">Arejado (boutique)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#7B5A65] mb-1">
                          Itens por prateleira
                        </label>
                        <select
                          value={shelfCfg.itemsPerRow}
                          onChange={(e) =>
                            updateShelfCfg({ itemsPerRow: Number(e.target.value) })
                          }
                          className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-xs text-[#493039]"
                        >
                          <option value={0}>Automático pela largura</option>
                          <option value={4}>4 itens por prateleira</option>
                          <option value={6}>6 itens por prateleira</option>
                          <option value={8}>8 itens por prateleira</option>
                          <option value={10}>10 itens por prateleira</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="pt-4 border-t border-[#D9B8C0]/60 space-y-3">
                    <h3 className="font-editorial text-lg font-semibold text-[#493039]">
                      Títulos editáveis das categorias
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(
                        [
                          { key: 'livros', label: 'Livros' },
                          { key: 'filmes', label: 'Filmes' },
                          { key: 'series', label: 'Séries' },
                          { key: 'animes', label: 'Animes' },
                          { key: 'favoritos', label: 'Favoritos' },
                          { key: 'poemas', label: 'Poemas' },
                          { key: 'artigos', label: 'Artigos' },
                        ] as const
                      ).map((cat) => (
                        <div key={cat.key}>
                          <label className="block text-[11px] text-[#7B5A65] mb-1">
                            Título para {cat.label}
                          </label>
                          <input
                            type="text"
                            value={shelfCfg.categoryLabels?.[cat.key] || ''}
                            onChange={(e) =>
                              updateShelfCfg({
                                categoryLabels: { [cat.key]: e.target.value },
                              })
                            }
                            className="w-full rounded-xl bg-[#F5E9E8]/65 border border-[#D9B8C0] px-3 py-1.5 text-xs text-[#493039]"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {editorTab === 'secoes' && (
                <section className="space-y-3">
                  <div>
                    <h3 className="font-editorial text-xl font-semibold text-[#493039]">
                      Ordem e Visibilidade das Seções
                    </h3>
                    <p className="text-xs text-[#7B5A65]">
                      Reordene seu perfil como uma revista pessoal e oculte o que não quiser mostrar.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {editableSections.map((secId, idx) => {
                      const isHidden = custom.hiddenSections.includes(secId);
                      return (
                        <div
                          key={secId}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] text-xs"
                        >
                          <span
                            className={
                              isHidden ? 'line-through opacity-50' : 'font-medium text-[#493039]'
                            }
                          >
                            {SECTION_LABELS[secId]}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => moveSection(idx, -1)}
                              disabled={idx === 0}
                              className="p-1.5 rounded hover:bg-[#D9B8C0]/40 disabled:opacity-30 cursor-pointer"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 1)}
                              disabled={idx === editableSections.length - 1}
                              className="p-1.5 rounded hover:bg-[#D9B8C0]/40 disabled:opacity-30 cursor-pointer"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSectionVisibility(secId)}
                              className="p-1.5 rounded hover:bg-[#D9B8C0]/40 cursor-pointer"
                              title={isHidden ? 'Exibir seção' : 'Ocultar seção'}
                            >
                              {isHidden ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-4 pt-3 text-xs text-[#493039]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={custom.showFollowerCount}
                        onChange={(e) =>
                          setCustom((prev) => ({
                            ...prev,
                            showFollowerCount: e.target.checked,
                          }))
                        }
                        className="accent-[#803C50]"
                      />
                      <span>Exibir contagem de seguidores</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={custom.showCulturalStats}
                        onChange={(e) =>
                          setCustom((prev) => ({
                            ...prev,
                            showCulturalStats: e.target.checked,
                          }))
                        }
                        className="accent-[#803C50]"
                      />
                      <span>Exibir resumos culturais</span>
                    </label>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Live Real-Time Preview Column */}
          <div
            className={`lg:col-span-6 overflow-y-auto p-4 sm:p-6 bg-[#F5E9E8] ${
              mobilePreviewMode ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#803C50]">
                Pré-visualização em tempo real
              </div>
              <span className="text-[11px] font-medium text-[#7B5A65]">
                {safeTheme.name} · {selectedSeasonConfig.name}
              </span>
            </div>

            <div
              className="relative rounded-3xl overflow-hidden border border-[#493039]/18 editorial-shadow transition-colors"
              style={{
                backgroundColor: safeTheme.backgroundColor,
                color: safeTheme.textColor,
                ...previewTexture,
              }}
            >
              <SeasonalAtmosphereBackground season={selectedSeason} contained />

              {/* Cover Preview */}
              <div
                className="h-36 md:h-44 w-full relative overflow-hidden"
                style={{ backgroundColor: custom.bannerColor || safeTheme.surfaceColor }}
              >
                {!custom.bannerColor && (
                  <ImageWithFallback
                    src={custom.bannerUrl}
                    alt="Banner"
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `50% ${custom.bannerPositionY ?? 50}%`,
                      filter: bannerFilterCss,
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
                {custom.bannerQuote && (
                  <div className="absolute bottom-3 right-4 max-w-xs text-right font-editorial italic text-xs text-[#FFF9F5] drop-shadow">
                    “{custom.bannerQuote}”
                  </div>
                )}
              </div>

              <div className="px-6 pb-8 relative z-10">
                <div
                  className={`flex flex-col gap-3 mb-4 ${
                    avatarPos === 'center'
                      ? '-mt-10 items-center text-center'
                      : avatarPos === 'left'
                      ? 'pt-4 items-start'
                      : '-mt-10 sm:flex-row sm:items-end sm:justify-between'
                  }`}
                >
                  <div
                    className="p-1 rounded-full shadow-md"
                    style={{ backgroundColor: safeTheme.surfaceColor }}
                  >
                    <UserAvatar src={avatarUrl} name={displayName} size="xl" />
                  </div>
                  <span
                    className={`px-4 py-1.5 text-xs font-medium self-start sm:self-auto ${
                      avatarPos === 'center' ? 'mx-auto' : ''
                    } ${btnShape}`}
                    style={{ backgroundColor: safeTheme.buttonBg, color: safeTheme.buttonText }}
                  >
                    Seguir
                  </span>
                </div>

                <div className={avatarPos === 'center' ? 'text-center' : ''}>
                  <h4
                    className="text-2xl md:text-3xl font-semibold leading-tight"
                    style={{ fontFamily: getFontCss(safeTheme.nameFont) }}
                  >
                    {displayName || user.displayName}
                  </h4>
                  <div className="text-xs mt-0.5" style={{ color: safeTheme.mutedColor }}>
                    @{usernameDraft || user.username}
                    {custom.showFollowerCount
                      ? ` · ${user.followersCount} seguidores · ${user.followingCount} seguindo`
                      : ''}
                  </div>
                </div>

                {/* Live Mini Bookcase Preview */}
                <div className="mt-5 space-y-4">
                  {editableSections
                    .filter((id) => !custom.hiddenSections.includes(id))
                    .map((secId) => {
                      if (secId === 'bio') {
                        return (
                          <div
                            key={secId}
                            className={`p-4 ${previewCardClass}`}
                            style={{
                              backgroundColor: safeTheme.surfaceColor,
                              borderColor: `${safeTheme.textColor}18`,
                            }}
                          >
                            <p
                              className={`${bioSizeClass} leading-relaxed`}
                              style={{ fontFamily: getFontCss(safeTheme.bioFont) }}
                            >
                              {bio}
                            </p>
                          </div>
                        );
                      }
                      if (secId === 'quote' && custom.epigraph) {
                        return (
                          <div
                            key={secId}
                            className={`p-4 text-center ${previewCardClass}`}
                            style={{
                              backgroundColor: safeTheme.surfaceColor,
                              borderColor: `${safeTheme.accentColor}26`,
                            }}
                          >
                            <p
                              className="italic text-sm md:text-base font-medium"
                              style={{
                                color: safeTheme.accentColor,
                                fontFamily: getFontCss(safeTheme.nameFont),
                              }}
                            >
                              “{custom.epigraph}”
                            </p>
                            {custom.favoriteQuoteAuthor && (
                              <span
                                className="block text-[10px] mt-1"
                                style={{ color: safeTheme.mutedColor }}
                              >
                                — {custom.favoriteQuoteAuthor}
                              </span>
                            )}
                          </div>
                        );
                      }
                      if (secId === 'shelves') {
                        return (
                          <div
                            key={secId}
                            className="rounded-2xl p-2"
                            style={{
                              background: previewWood.frameBg,
                              border: `1px solid ${previewWood.frameBorder}`,
                            }}
                          >
                            <div
                              className="rounded-xl overflow-hidden"
                              style={{ background: previewBackdrop.bg }}
                            >
                              <div className="px-3 pt-4 pb-0 flex items-end gap-2">
                                {[
                                  { t: 'Orgulho & Preconceito', c: '#803C50', h: 'h-16' },
                                  { t: 'Água Viva', c: '#B65B76', h: 'h-14' },
                                  { t: 'Past Lives', c: '#493039', h: 'h-16' },
                                  { t: 'Coração Delator', c: '#2D4A3E', h: 'h-15' },
                                ].map((b) => (
                                  <div
                                    key={b.t}
                                    className={`rounded-t-xs shadow-md flex items-end ${b.h} ${
                                      shelfCfg.displayMode === 'lombadas' ? 'w-5' : 'w-11'
                                    }`}
                                    style={{ backgroundColor: b.c }}
                                  >
                                    <span className="text-[7px] text-[#FFF9F5] p-1 leading-tight line-clamp-2">
                                      {b.t}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div
                                className="h-2.5 w-full"
                                style={{ background: previewWood.plankFront }}
                              />
                            </div>
                          </div>
                        );
                      }
                      if (secId === 'links' && custom.links.length > 0) {
                        return (
                          <div key={secId} className="flex flex-wrap gap-2">
                            {custom.links.map((l) => (
                              <span
                                key={l.id}
                                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium ${btnShape}`}
                                style={{
                                  backgroundColor: safeTheme.buttonBg,
                                  color: safeTheme.buttonText,
                                }}
                              >
                                <Link2 className="w-3 h-3" />
                                {l.label}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
