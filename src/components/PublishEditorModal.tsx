import { Disc3, FileText, Headphones, ImagePlus, Loader2, Pause, Play, Save, Search, Star, Trash2, Upload, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { AMBIENT_SOUND_OPTIONS, ambientAudioEngine } from '../lib/ambientAudio';
import { api, readFileAsDataUrl } from '../lib/api';
import { BANNER_PRESETS } from '../lib/themes';
import { AmbientSoundId, PostType, PostWithAuthor, SpotifyItemRef, TopCategory, UserPublic } from '../types/thinklive';
import { ImageWithFallback } from './ImageWithFallback';
import { SpotifyItemEmbed } from './SpotifyItemEmbed';

interface PublishEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserPublic | null;
  editingPost?: PostWithAuthor | null;
  defaultType?: PostType;
  defaultCategory?: TopCategory;
  onSaved: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
}

const POEM_COVER_PRESETS = [
  {
    id: 'poem_rain',
    label: 'Chuva na vidraça',
    url: '/src/assets/images/poem_rain_window_1795044264984.jpg',
  },
  {
    id: 'poem_garden',
    label: 'Rosas & tinta',
    url: '/src/assets/images/poem_ink_garden_1795044265414.jpg',
  },
  {
    id: 'poem_calcario',
    label: 'Mesa de calcário',
    url: '/src/assets/images/poetry_botanical_cover_1794860652045.jpg',
  },
  {
    id: 'poem_caderno',
    label: 'Caderno de folhas',
    url: '/src/assets/images/autumn_poetry_notebook_1794870054621.jpg',
  },
];

const POST_TYPES: { id: PostType; label: string; defaultCategory: TopCategory; hint: string }[] = [
  { id: 'poema', label: 'Poema', defaultCategory: 'Poemas', hint: 'Versos, ritmo e capa opcional' },
  { id: 'artigo', label: 'Artigo', defaultCategory: 'Artigos', hint: 'Ensaio estruturado com subtítulo e capa' },
  { id: 'cronica', label: 'Crônica e reflexão', defaultCategory: 'Artigos', hint: 'Prosa livre e conforto para leitura longa' },
  { id: 'fotografia', label: 'Fotografia', defaultCategory: 'Fotografia', hint: 'Imagem editorial com legenda' },
  { id: 'resenha', label: 'Resenha', defaultCategory: 'Filmes & Séries', hint: 'Avaliação com nota de filmes, séries, livros ou álbuns' },
  { id: 'noticia', label: 'Notícia cultural', defaultCategory: 'Notícias', hint: 'Mostras, lançamentos e agenda cultural' },
  { id: 'diario', label: 'Diário', defaultCategory: 'Diários', hint: 'Caderno pessoal de ideias e registros' },
  { id: 'arte_cultura', label: 'Arte e cultura', defaultCategory: 'Arte e cultura', hint: 'Exposições, colagens e arquitetura' },
  { id: 'podcast', label: 'Podcast', defaultCategory: 'Podcasts', hint: 'Episódios recomendados e comentários' },
];

export function PublishEditorModal({
  isOpen,
  onClose,
  currentUser,
  editingPost,
  defaultType = 'artigo',
  defaultCategory = 'Artigos',
  onSaved,
  onRequireAuth,
}: PublishEditorModalProps) {
  const [type, setType] = useState<PostType>(defaultType);
  const [category, setCategory] = useState<TopCategory>(defaultCategory);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [mediaType, setMediaType] = useState<'filme' | 'serie' | 'livro' | 'album'>('filme');
  const [workTitle, setWorkTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [year, setYear] = useState('');
  const [rating, setRating] = useState<number>(4.5);

  // Optional Spotify track/album/artist attachment (non-poem posts)
  const [spotifyItem, setSpotifyItem] = useState<SpotifyItemRef | undefined>(undefined);
  const [spotifyOpen, setSpotifyOpen] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyType, setSpotifyType] = useState<'track' | 'album' | 'artist' | 'playlist'>('track');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyItemRef[]>([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [spotifyNote, setSpotifyNote] = useState('');

  // Optional Ambient Sound attachment (poems)
  const [ambientSoundId, setAmbientSoundId] = useState<AmbientSoundId | ''>('');
  const [previewPlayingId, setPreviewPlayingId] = useState<AmbientSoundId | null>(null);

  const [drafts, setDrafts] = useState<PostWithAuthor[]>([]);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      if (previewPlayingId) {
        ambientAudioEngine.stop();
        setPreviewPlayingId(null);
      }
      return;
    }
    setError('');
    setSpotifyOpen(false);
    setSpotifyResults([]);
    setSpotifyNote('');
    if (editingPost) {
      setActiveEditId(editingPost.id);
      setType(editingPost.type);
      setCategory(editingPost.category);
      setTitle(editingPost.title);
      setSubtitle(editingPost.subtitle || '');
      setContent(editingPost.content);
      setCoverImage(editingPost.coverImage || '');
      setImageCaption(editingPost.imageCaption || '');
      setSpotifyItem(editingPost.spotifyItem);
      setAmbientSoundId(editingPost.ambientSoundId || '');
      if (editingPost.reviewMeta) {
        setMediaType(editingPost.reviewMeta.mediaType);
        setWorkTitle(editingPost.reviewMeta.workTitle);
        setCreator(editingPost.reviewMeta.creator);
        setYear(editingPost.reviewMeta.year);
        setRating(editingPost.reviewMeta.rating);
      }
    } else {
      setActiveEditId(null);
      setType(defaultType);
      setCategory(defaultCategory);
      setTitle('');
      setSubtitle('');
      setContent('');
      setCoverImage('');
      setImageCaption('');
      setSpotifyItem(undefined);
      setAmbientSoundId('');
      setWorkTitle('');
      setCreator('');
      setYear('');
      setRating(4.5);
    }

    if (currentUser) {
      api.getPosts({ status: 'draft' }).then((r) => setDrafts(r.posts)).catch(() => {});
    }
  }, [isOpen, editingPost, currentUser, defaultType, defaultCategory]);

  if (!isOpen) return null;

  function loadDraft(d: PostWithAuthor) {
    setActiveEditId(d.id);
    setType(d.type);
    setCategory(d.category);
    setTitle(d.title);
    setSubtitle(d.subtitle || '');
    setContent(d.content);
    setCoverImage(d.coverImage || '');
    setImageCaption(d.imageCaption || '');
    setSpotifyItem(d.spotifyItem);
    setAmbientSoundId(d.ambientSoundId || '');
    if (d.reviewMeta) {
      setMediaType(d.reviewMeta.mediaType);
      setWorkTitle(d.reviewMeta.workTitle);
      setCreator(d.reviewMeta.creator);
      setYear(d.reviewMeta.year);
      setRating(d.reviewMeta.rating);
    }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await api.uploadImage(dataUrl, 'capa');
      setCoverImage(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSpotifySearch() {
    if (!spotifyQuery.trim()) return;
    setSpotifySearching(true);
    setSpotifyNote('');
    try {
      const res = await api.searchSpotify(spotifyQuery.trim(), spotifyType);
      const list =
        spotifyType === 'track'
          ? res.tracks
          : spotifyType === 'album'
          ? res.albums
          : spotifyType === 'artist'
          ? res.artists
          : res.playlists;
      setSpotifyResults(list || []);
      if (!list || list.length === 0) setSpotifyNote('Nenhum resultado encontrado no catálogo musical.');
    } catch (err) {
      setSpotifyNote(err instanceof Error ? err.message : 'Catálogo musical indisponível no momento.');
    } finally {
      setSpotifySearching(false);
    }
  }

  async function handleSubmit(status: 'published' | 'draft', e?: FormEvent) {
    if (e) e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!title.trim() && !content.trim()) {
      setError('Escreva pelo menos um título ou conteúdo.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        type,
        category,
        title: title.trim() || 'Rascunho sem título',
        subtitle: subtitle.trim(),
        content: content.trim(),
        coverImage: coverImage.trim(),
        imageCaption: imageCaption.trim(),
        spotifyItem: type === 'poema' ? undefined : spotifyItem,
        ambientSoundId: type === 'poema' ? ambientSoundId || undefined : undefined,
        reviewMeta:
          type === 'resenha'
            ? {
                mediaType,
                workTitle: workTitle.trim() || title.trim(),
                creator: creator.trim(),
                year: year.trim(),
                rating,
              }
            : undefined,
        status,
      };

      const res = activeEditId
        ? await api.updatePost(activeEditId, payload)
        : await api.createPost(payload);

      if (previewPlayingId) {
        ambientAudioEngine.stop();
        setPreviewPlayingId(null);
      }
      onSaved(res.post);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar publicação.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDraft(id: string) {
    try {
      await api.deletePost(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (activeEditId === id) setActiveEditId(null);
    } catch {
      // ignore
    }
  }

  const selectedTypeObj = POST_TYPES.find((t) => t.id === type)!;

  return (
    <div className="fixed inset-0 z-50 bg-tl-marrom/55 backdrop-blur-sm flex items-center justify-center p-0 md:p-6">
      <div className="bg-tl-creme w-full max-w-4xl h-full md:h-auto md:max-h-[92vh] md:rounded-3xl border border-tl-marrom/18 editorial-shadow flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 bg-tl-bege/75 border-b border-tl-marrom/14 flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
              {activeEditId ? 'Editar publicação' : 'Nova publicação'}
            </h2>
            <p className="text-xs text-tl-marrom-suave">{selectedTypeObj.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar editor"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tl-marrom hover:bg-tl-areia/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit('published', e)} className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
          {!currentUser && (
            <div className="p-4 rounded-2xl bg-tl-bege/70 border border-tl-marrom/15 flex items-center justify-between gap-3">
              <p className="text-sm text-tl-marrom">Entre na sua conta para publicar e salvar rascunhos.</p>
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-4 py-2 text-xs font-medium bg-tl-laranja text-tl-creme rounded-full cursor-pointer"
              >
                Entrar ou criar conta
              </button>
            </div>
          )}

          {drafts.length > 0 && !editingPost && (
            <div className="p-3.5 rounded-2xl bg-tl-bege/60 border border-tl-marrom/12">
              <div className="text-xs font-semibold text-tl-terracota mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Seus rascunhos salvos ({drafts.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {drafts.map((d) => (
                  <div key={d.id} className="inline-flex items-center gap-1 bg-tl-creme border border-tl-marrom/15 rounded-full px-3 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => loadDraft(d)}
                      className="text-tl-marrom hover:text-tl-terracota font-medium cursor-pointer"
                    >
                      {d.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(d.id)}
                      className="text-tl-marrom-suave hover:text-tl-terracota ml-1 cursor-pointer"
                      title="Excluir rascunho"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-tl-marrom-suave mb-2">Formato da publicação</label>
            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setType(item.id);
                    setCategory(item.defaultCategory);
                  }}
                  className={`px-3.5 py-1.5 text-xs rounded-full border transition-colors cursor-pointer ${
                    type === item.id
                      ? 'bg-tl-marrom text-tl-creme border-tl-marrom font-medium'
                      : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-laranja'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'resenha' && (
            <div className="p-4 rounded-2xl bg-tl-bege/60 border border-tl-marrom/14 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Tipo de obra</label>
                <select
                  value={mediaType}
                  onChange={(e) => {
                    const mt = e.target.value as 'filme' | 'serie' | 'livro' | 'album';
                    setMediaType(mt);
                    setCategory(mt === 'livro' ? 'Livros' : mt === 'album' ? 'Músicas' : 'Filmes & Séries');
                  }}
                  className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                >
                  <option value="filme">Filme</option>
                  <option value="serie">Série</option>
                  <option value="livro">Livro</option>
                  <option value="album">Álbum musical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Nota (0.5 a 5)</label>
                <div className="flex items-center gap-2 h-[38px]">
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="flex-1 accent-tl-laranja"
                  />
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-tl-terracota tabular-nums w-12">
                    <Star className="w-3.5 h-3.5 fill-tl-laranja text-tl-laranja" />
                    {rating.toFixed(1)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Nome da obra</label>
                <input
                  type="text"
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  placeholder="Ex.: Perfect Days, Ao Farol…"
                  className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Diretor / Autor / Artista</label>
                  <input
                    type="text"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    placeholder="Nome"
                    className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Ano</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'poema' ? 'Título do poema…' : 'Título da publicação…'}
              className="w-full font-editorial text-2xl md:text-3xl font-semibold bg-transparent border-b border-tl-marrom/20 pb-2 text-tl-marrom placeholder:text-tl-marrom-suave/55 focus:outline-none focus:border-tl-laranja"
            />
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={
                type === 'fotografia'
                  ? 'Legenda breve da fotografia…'
                  : 'Subtítulo ou linha de apresentação (opcional)…'
              }
              className="w-full text-sm bg-transparent border-b border-tl-marrom/12 pb-2 text-tl-marrom-suave placeholder:text-tl-marrom-suave/55 focus:outline-none focus:border-tl-laranja"
            />
          </div>

          <div className="p-4 rounded-2xl bg-tl-bege/55 border border-tl-marrom/14 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-tl-terracota flex items-center gap-1.5">
                <ImagePlus className="w-4 h-4" />
                <span>{type === 'fotografia' ? 'Fotografia principal' : 'Imagem de capa (opcional)'}</span>
              </span>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-tl-creme border border-tl-marrom/15 text-tl-marrom rounded-full hover:border-tl-laranja cursor-pointer">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{uploading ? 'Enviando…' : 'Enviar do dispositivo'}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="Ou cole a URL da imagem…"
                className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
              />
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Crédito ou descrição da imagem (opcional)"
                className="w-full rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              <span className="text-[11px] text-tl-marrom-suave shrink-0">
                {type === 'poema' ? 'Imagens para poemas:' : 'Capas editoriais:'}
              </span>
              {(type === 'poema' ? [...POEM_COVER_PRESETS, ...BANNER_PRESETS] : BANNER_PRESETS).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCoverImage(p.url)}
                  className="text-[11px] px-3 py-1 rounded-full bg-tl-creme border border-tl-marrom/14 hover:border-tl-laranja text-tl-marrom shrink-0 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-[11px] px-2.5 py-1 rounded-full text-tl-terracota hover:underline shrink-0 cursor-pointer"
                >
                  Remover imagem
                </button>
              )}
            </div>

            {coverImage && (
              <div className="h-40 rounded-xl overflow-hidden border border-tl-marrom/15">
                <ImageWithFallback src={coverImage} alt="Prévia da capa" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {type === 'poema' ? (
            /* Ambient Sound Options for Poem Composition */
            <div className="p-4 rounded-2xl bg-tl-bege/55 border border-tl-marrom/14 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-tl-terracota flex items-center gap-1.5">
                  <Headphones className="w-4 h-4" />
                  <span>Música e som ambiente para o poema (opcional)</span>
                </span>
                {ambientSoundId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (previewPlayingId === ambientSoundId) {
                        ambientAudioEngine.stop();
                        setPreviewPlayingId(null);
                      } else {
                        ambientAudioEngine.start(ambientSoundId, 0.45);
                        setPreviewPlayingId(ambientSoundId);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tl-creme border border-tl-marrom/15 text-xs font-medium text-tl-marrom hover:border-tl-laranja cursor-pointer"
                  >
                    {previewPlayingId === ambientSoundId ? (
                      <>
                        <Pause className="w-3 h-3 text-tl-terracota" />
                        <span>Pausar prévia</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-tl-laranja" />
                        <span>Ouvir prévia</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AMBIENT_SOUND_OPTIONS.map((opt) => {
                  const selected = ambientSoundId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const next = selected ? '' : opt.id;
                        setAmbientSoundId(next);
                        if (previewPlayingId) {
                          if (next) {
                            ambientAudioEngine.start(next, 0.45);
                            setPreviewPlayingId(next);
                          } else {
                            ambientAudioEngine.stop();
                            setPreviewPlayingId(null);
                          }
                        }
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-tl-marrom text-tl-creme border-tl-marrom font-medium'
                          : 'bg-tl-creme border-tl-marrom/14 text-tl-marrom hover:border-tl-laranja'
                      }`}
                    >
                      <div className="truncate">{opt.label}</div>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-tl-marrom-suave">
                {ambientSoundId
                  ? `Atmosfera sugerida para os leitores: ${AMBIENT_SOUND_OPTIONS.find((o) => o.id === ambientSoundId)?.label}. O som permanece desligado até o leitor ativá-lo.`
                  : 'Escolha um ambiente sonoro opcional para acompanhar a leitura deste poema.'}
              </p>
            </div>
          ) : (
            /* Optional Spotify Soundtrack Attachment for non-poem formats */
            <div className="p-4 rounded-2xl bg-tl-bege/55 border border-tl-marrom/14 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-tl-terracota flex items-center gap-1.5">
                  <Disc3 className="w-4 h-4" />
                  <span>Trilha sonora (opcional)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSpotifyOpen((v) => !v)}
                  className="text-xs font-medium text-tl-laranja hover:text-tl-terracota hover:underline cursor-pointer"
                >
                  {spotifyOpen ? 'Fechar busca' : 'Anexar faixa, álbum ou artista'}
                </button>
              </div>

              {spotifyItem && (
                <SpotifyItemEmbed item={spotifyItem} compact onRemove={() => setSpotifyItem(undefined)} />
              )}

              {spotifyOpen && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={spotifyType}
                      onChange={(e) => setSpotifyType(e.target.value as typeof spotifyType)}
                      className="rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                    >
                      <option value="track">Faixa</option>
                      <option value="album">Álbum</option>
                      <option value="artist">Artista</option>
                    </select>
                    <input
                      type="text"
                      value={spotifyQuery}
                      onChange={(e) => setSpotifyQuery(e.target.value)}
                      placeholder="Buscar música, álbum ou artista…"
                      className="flex-1 min-w-[180px] rounded-xl bg-tl-creme border border-tl-marrom/15 px-3 py-2 text-xs text-tl-marrom"
                    />
                    <button
                      type="button"
                      onClick={handleSpotifySearch}
                      disabled={spotifySearching}
                      className="px-4 py-2 text-xs font-medium bg-tl-marrom text-tl-creme rounded-full hover:bg-tl-terracota inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{spotifySearching ? 'Buscando…' : 'Buscar'}</span>
                    </button>
                  </div>
                  {spotifyNote && <p className="text-[11px] text-tl-marrom-suave">{spotifyNote}</p>}
                  {spotifyResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {spotifyResults.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSpotifyItem(item);
                            setSpotifyOpen(false);
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-tl-creme border border-tl-marrom/14 hover:border-tl-laranja text-left cursor-pointer"
                        >
                          <ImageWithFallback src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-tl-marrom truncate">{item.name}</div>
                            <div className="text-[11px] text-tl-marrom-suave truncate">{item.subtitle}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-tl-marrom-suave">
                {type === 'poema'
                  ? 'Versos do poema'
                  : type === 'fotografia'
                  ? 'História e detalhes do registro'
                  : 'Texto da publicação'}
              </label>
              <span className="text-[11px] text-tl-marrom-suave tabular-nums">
                {content.trim() ? `${content.trim().split(/\s+/).length} palavras` : '0 palavras'}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={type === 'poema' ? 10 : 12}
              placeholder={
                type === 'poema'
                  ? 'Escreva seus versos com as quebras de linha desejadas…'
                  : 'Escreva com tranquilidade… Separe parágrafos com uma linha em branco.'
              }
              className={`w-full rounded-2xl bg-tl-bege/45 border border-tl-marrom/15 p-4 md:p-5 text-tl-marrom placeholder:text-tl-marrom-suave/55 focus:outline-none focus:border-tl-laranja leading-relaxed ${
                type === 'poema' ? 'font-literary italic text-base' : 'font-literary text-[16px]'
              }`}
            />
          </div>

          {error && <p className="text-xs text-tl-terracota font-semibold">{error}</p>}
        </form>

        <div className="px-5 py-3.5 border-t border-tl-marrom/14 bg-tl-bege/75 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-tl-marrom-suave">Categoria:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TopCategory)}
              className="text-xs bg-tl-creme border border-tl-marrom/15 rounded-full px-3 py-1.5 text-tl-marrom"
            >
              {[
                'Poemas',
                'Artigos',
                'Notícias',
                'Filmes & Séries',
                'Livros',
                'Fotografia',
                'Arte e cultura',
                'Podcasts',
                'Diários',
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('draft')}
              className="autumn-glow-surface px-4 py-2 text-xs font-medium border border-tl-marrom/20 bg-tl-creme text-tl-marrom rounded-full hover:border-tl-laranja flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar rascunho</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('published')}
              className="autumn-glow-btn px-5 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              {saving ? 'Publicando…' : activeEditId ? 'Atualizar publicação' : 'Publicar agora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
