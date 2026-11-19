import {
  Bookmark,
  Camera,
  Check,
  CornerDownRight,
  Heart,
  ImagePlus,
  Loader2,
  Maximize2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, formatRelativeDate, readFileAsDataUrl } from '../lib/api';
import { CommentWithAuthor, PostWithAuthor, UserPublic } from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback, UserAvatar } from './ImageWithFallback';
import { TabEditorialHero } from './TabEditorialHero';

interface PhotographyHubViewProps {
  photos: PostWithAuthor[];
  currentUser: UserPublic | null;
  onCreated: (post: PostWithAuthor) => void;
  onUpdated: (post: PostWithAuthor) => void;
  onDeleted: (postId: string) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
  onNotify?: (msg: string) => void;
}

async function compressImageDataUrl(dataUrl: string, maxDim = 1600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl);
        return;
      }
      const scale = Math.min(maxDim / width, maxDim / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function PhotographyHubView({
  photos,
  currentUser,
  onCreated,
  onUpdated,
  onDeleted,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onRequireAuth,
  onNotify,
}: PhotographyHubViewProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PostWithAuthor | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Camera viewfinder state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox state
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<CommentWithAuthor | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [filterScope, setFilterScope] = useState<'todas' | 'minhas'>('todas');

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCameraStream();
  }, [stopCameraStream]);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      setCameraError('');
      stopCameraStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Câmera ao vivo indisponível neste navegador. Use "Câmera do dispositivo" abaixo.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setCameraError(
          'Não foi possível acessar a câmera ao vivo (permissão negada ou indisponível). Você pode usar o botão "Câmera do dispositivo" ou enviar da galeria.'
        );
      }
    },
    [stopCameraStream]
  );

  useEffect(() => {
    if (cameraOpen) {
      void startCamera(facingMode);
    } else {
      stopCameraStream();
    }
  }, [cameraOpen, facingMode, startCamera, stopCameraStream]);

  useEffect(() => {
    if (!lightboxId) {
      setComments([]);
      setReplyTo(null);
      setNewComment('');
      setConfirmDeleteId(null);
      return;
    }
    setLoadingComments(true);
    api
      .getPost(lightboxId)
      .then((res) => setComments(res.comments))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [lightboxId]);

  const lightboxPhoto = lightboxId ? photos.find((p) => p.id === lightboxId) || null : null;

  function openNewPhotoModal() {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setEditingPhoto(null);
    setTitle('');
    setCaption('');
    setDescription('');
    setCoverImage('');
    setFormError('');
    setCameraOpen(false);
    setComposerOpen(true);
  }

  function openEditPhotoModal(photo: PostWithAuthor) {
    setEditingPhoto(photo);
    setTitle(photo.title);
    setCaption(photo.imageCaption || photo.subtitle || '');
    setDescription(photo.content);
    setCoverImage(photo.coverImage || '');
    setFormError('');
    setCameraOpen(false);
    setLightboxId(null);
    setComposerOpen(true);
  }

  async function uploadDataUrl(rawDataUrl: string) {
    setUploading(true);
    setFormError('');
    try {
      const compressed = await compressImageDataUrl(rawDataUrl);
      const res = await api.uploadImage(compressed, 'fotografia');
      setCoverImage(res.url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao enviar fotografia.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    await uploadDataUrl(dataUrl);
    e.target.value = '';
  }

  async function handleCaptureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCameraOpen(false);
    await uploadDataUrl(dataUrl);
  }

  async function handleSubmitPhoto(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!coverImage.trim()) {
      setFormError('Selecione uma foto da galeria ou capture com a câmera antes de publicar.');
      return;
    }
    if (!title.trim() && !caption.trim()) {
      setFormError('Adicione um título ou legenda para sua fotografia.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        type: 'fotografia' as const,
        category: 'Fotografia' as const,
        title: title.trim() || caption.trim(),
        subtitle: caption.trim(),
        imageCaption: caption.trim(),
        content: description.trim() || caption.trim(),
        coverImage: coverImage.trim(),
        status: 'published' as const,
      };
      if (editingPhoto) {
        const res = await api.updatePost(editingPhoto.id, payload);
        onUpdated(res.post);
        onNotify?.('Fotografia atualizada.');
      } else {
        const res = await api.createPost(payload);
        onCreated(res.post);
        onNotify?.('Fotografia publicada na galeria.');
      }
      setComposerOpen(false);
      setCameraOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar fotografia.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    await onDeleted(photoId);
    setLightboxId(null);
    setConfirmDeleteId(null);
  }

  async function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!lightboxPhoto) return;
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.addComment(lightboxPhoto.id, newComment.trim(), replyTo?.id || null);
      setComments(res.comments);
      setNewComment('');
      setReplyTo(null);
      onUpdated({ ...lightboxPhoto, commentsCount: lightboxPhoto.commentsCount + 1 });
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    const res = await api.deleteComment(commentId);
    setComments(res.comments);
  }

  const displayedPhotos = photos
    .filter((p) => {
      if (filterScope === 'minhas' && currentUser) return p.authorId === currentUser.id;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function renderComment(cmt: CommentWithAuthor, depth = 0) {
    const canDelete =
      currentUser && (currentUser.id === cmt.authorId || currentUser.id === lightboxPhoto?.authorId);
    return (
      <div
        key={cmt.id}
        className={depth > 0 ? 'ml-6 mt-2.5 pt-2.5 border-t border-tl-areia/60' : 'py-3 border-b border-tl-areia/60'}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar src={cmt.author.avatarUrl} name={cmt.author.displayName} size="sm" />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setLightboxId(null);
                  onOpenAuthor(cmt.author.username);
                }}
                className="text-xs font-semibold text-tl-marrom hover:text-tl-terracota cursor-pointer"
              >
                {cmt.author.displayName}
              </button>
              <span className="text-[11px] text-tl-marrom-suave ml-2">
                {formatRelativeDate(cmt.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setReplyTo(cmt)}
              className="text-[11px] text-tl-marrom-suave hover:text-tl-terracota inline-flex items-center gap-1 cursor-pointer"
            >
              <CornerDownRight className="w-3 h-3" />
              Responder
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteComment(cmt.id)}
                className="text-[11px] text-tl-terracota hover:underline cursor-pointer"
                title="Excluir comentário"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="font-literary text-sm text-tl-marrom/90 mt-1.5 leading-relaxed pl-8">{cmt.content}</p>
        {cmt.replies.map((r) => renderComment(r, depth + 1))}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-7 md:py-10 pb-28 space-y-8">
      {/* Editorial Photography Hero */}
      <TabEditorialHero
        imageUrl="/src/assets/images/street_photography_demo_1794860653458.jpg"
        imageAlt="Fotografia de rua em preto e branco sob chuva diante de um café noturno"
        objectPositionClass="object-center"
        kickerIcon={<Camera className="w-3.5 h-3.5 text-[#F2B880]" />}
        kicker="Galeria de Momentos · Thinklive"
        title="Fotografia"
        phrase="“Instantes suspensos em luz, sombra e silêncio para guardar com o olhar.”"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {currentUser && (
              <div className="flex items-center gap-1 p-1 rounded-full bg-[#FAF5EC]/16 backdrop-blur-md border border-[#FAF5EC]/25">
                <button
                  type="button"
                  onClick={() => setFilterScope('todas')}
                  className={`px-3.5 py-1.5 text-xs rounded-full cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    filterScope === 'todas'
                      ? 'bg-[#FAF5EC] text-[#2A1912] font-semibold'
                      : 'text-[#FAF5EC] hover:bg-[#FAF5EC]/15'
                  }`}
                >
                  Galeria geral ({photos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('minhas')}
                  className={`px-3.5 py-1.5 text-xs rounded-full cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    filterScope === 'minhas'
                      ? 'bg-[#FAF5EC] text-[#2A1912] font-semibold'
                      : 'text-[#FAF5EC] hover:bg-[#FAF5EC]/15'
                  }`}
                >
                  Minhas fotos ({photos.filter((p) => p.authorId === currentUser.id).length})
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={openNewPhotoModal}
              className="autumn-glow-btn px-5 py-2.5 text-xs md:text-sm font-medium bg-tl-laranja text-tl-creme border border-[#F2B880]/30 rounded-full hover:bg-tl-terracota active:scale-95 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Compartilhar fotografia</span>
            </button>
          </div>
        }
      />

      {/* Visual Gallery Grid */}
      {displayedPhotos.length === 0 ? (
        <section className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-12 text-center space-y-4 editorial-shadow">
          <Camera className="w-10 h-10 text-tl-laranja mx-auto opacity-80" strokeWidth={1.5} />
          <h2 className="font-editorial text-3xl font-semibold text-tl-marrom">
            {filterScope === 'minhas'
              ? 'Você ainda não publicou fotografias'
              : 'A galeria está esperando o primeiro olhar'}
          </h2>
          <p className="font-literary text-sm text-tl-marrom-suave max-w-md mx-auto">
            Envie uma foto da sua galeria ou abra a câmera para registrar e comentar seu momento.
          </p>
          <button
            type="button"
            onClick={openNewPhotoModal}
            className="autumn-glow-btn px-5 py-2.5 text-xs font-medium bg-tl-laranja text-tl-creme rounded-full hover:bg-tl-terracota cursor-pointer"
          >
            Publicar primeira foto
          </button>
        </section>
      ) : (
        <section className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {displayedPhotos.map((photo, index) => {
            const isOwner = currentUser?.id === photo.authorId;
            return (
              <article
                key={photo.id}
                className="break-inside-avoid autumn-glow-card group rounded-2xl bg-tl-creme border border-tl-marrom/14 overflow-hidden editorial-shadow editorial-card-lift"
              >
                <div
                  onClick={() => setLightboxId(photo.id)}
                  className="relative cursor-pointer overflow-hidden bg-tl-bege"
                >
                  <ImageWithFallback
                    src={photo.coverImage || ''}
                    alt={photo.title}
                    fallbackLabel={photo.title}
                    className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                      index % 3 === 0 ? 'aspect-[4/5]' : index % 2 === 0 ? 'aspect-[4/3]' : 'aspect-square'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3.5">
                    <span className="text-xs font-medium text-white inline-flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" />
                      Ampliar fotografia
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-tl-marrom-suave">
                    <button
                      type="button"
                      onClick={() => onOpenAuthor(photo.author.username)}
                      className="inline-flex items-center gap-2 min-w-0 hover:text-tl-terracota cursor-pointer"
                    >
                      <UserAvatar src={photo.author.avatarUrl} name={photo.author.displayName} size="sm" />
                      <span className="font-medium text-tl-marrom truncate">{photo.author.displayName}</span>
                    </button>
                    <span className="shrink-0 text-[11px]">{formatRelativeDate(photo.createdAt)}</span>
                  </div>

                  <div onClick={() => setLightboxId(photo.id)} className="cursor-pointer space-y-1">
                    <h3 className="font-editorial text-xl font-semibold text-tl-marrom group-hover:text-tl-terracota leading-snug">
                      {photo.title}
                    </h3>
                    {(photo.imageCaption || photo.subtitle) && (
                      <p className="text-xs font-medium text-tl-terracota">
                        {photo.imageCaption || photo.subtitle}
                      </p>
                    )}
                    {photo.content && (
                      <p className="font-literary text-sm text-tl-marrom-suave line-clamp-3 leading-relaxed">
                        {photo.content}
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-tl-areia/65 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleLike(photo.id)}
                        className={`px-2.5 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                          photo.isLiked
                            ? 'bg-tl-bege text-tl-terracota font-semibold'
                            : 'text-tl-marrom-suave hover:bg-tl-bege/70'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${photo.isLiked ? 'fill-tl-laranja text-tl-laranja' : ''}`} />
                        <span className="tabular-nums">{photo.likesCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLightboxId(photo.id)}
                        className="px-2.5 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 text-tl-marrom-suave hover:bg-tl-bege/70 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{photo.commentsCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleFavorite(photo.id)}
                        aria-label="Favoritar fotografia"
                        className={`p-1.5 rounded-full cursor-pointer ${
                          photo.isSaved ? 'text-tl-terracota' : 'text-tl-marrom-suave hover:bg-tl-bege/70'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${photo.isSaved ? 'fill-tl-laranja text-tl-laranja' : ''}`} />
                      </button>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditPhotoModal(photo)}
                          aria-label="Editar fotografia"
                          className="p-1.5 rounded-full text-tl-marrom-suave hover:text-tl-terracota hover:bg-tl-bege cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === photo.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-tl-terracota text-tl-creme cursor-pointer"
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(photo.id)}
                            aria-label="Excluir fotografia"
                            className="p-1.5 rounded-full text-tl-marrom-suave hover:text-tl-terracota hover:bg-tl-bege cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Composer / Camera Modal */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 bg-tl-marrom/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-6">
          <div className="bg-tl-creme w-full max-w-2xl h-full md:h-auto md:max-h-[92vh] md:rounded-3xl border border-tl-marrom/18 editorial-shadow flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-tl-bege/75 border-b border-tl-marrom/14 flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                  {editingPhoto ? 'Editar fotografia' : 'Publicar fotografia'}
                </h2>
                <p className="text-xs text-tl-marrom-suave">
                  Envie da galeria do dispositivo ou tire uma foto com a câmera.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCameraOpen(false);
                  setComposerOpen(false);
                }}
                aria-label="Fechar"
                className="p-2 rounded-full text-tl-marrom hover:bg-tl-areia/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPhoto} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5">
              {/* Source controls: Gallery upload + Live Camera + Mobile native camera */}
              <div className="p-4 rounded-2xl bg-tl-bege/60 border border-tl-marrom/14 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-4 py-2 rounded-full text-xs font-medium bg-tl-marrom text-tl-creme hover:bg-tl-terracota inline-flex items-center gap-2 cursor-pointer">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{uploading ? 'Enviando…' : 'Escolher da galeria'}</span>
                    <input type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={() => setCameraOpen((v) => !v)}
                    className={`px-4 py-2 rounded-full text-xs font-medium border inline-flex items-center gap-2 cursor-pointer ${
                      cameraOpen
                        ? 'bg-tl-laranja text-tl-creme border-tl-laranja'
                        : 'bg-tl-creme text-tl-marrom border-tl-marrom/20 hover:border-tl-laranja'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{cameraOpen ? 'Fechar câmera' : 'Usar câmera ao vivo'}</span>
                  </button>

                  <label className="px-3.5 py-2 rounded-full text-xs font-medium bg-tl-creme border border-tl-marrom/18 text-tl-marrom hover:border-tl-laranja inline-flex items-center gap-1.5 cursor-pointer">
                    <Camera className="w-3.5 h-3.5 text-tl-laranja" />
                    <span>Câmera do celular</span>
                    <input
                      ref={nativeCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelected}
                      className="hidden"
                    />
                  </label>
                </div>

                {cameraOpen && (
                  <div className="space-y-2.5 pt-2">
                    {cameraError ? (
                      <p className="text-xs text-tl-terracota bg-tl-creme p-3 rounded-xl border border-tl-terracota/25">
                        {cameraError}
                      </p>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
                            }
                            className="px-3 py-2 rounded-full bg-black/65 text-white text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Trocar câmera</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCaptureFrame}
                            className="px-5 py-2 rounded-full bg-tl-laranja text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Capturar foto</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {coverImage && (
                  <div className="relative rounded-2xl overflow-hidden border border-tl-marrom/15 bg-tl-creme">
                    <ImageWithFallback
                      src={coverImage}
                      alt="Prévia da fotografia"
                      className="w-full max-h-64 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-tl-marrom/80 text-tl-creme text-[11px] cursor-pointer"
                    >
                      Trocar foto
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-tl-marrom-suave mb-1">
                    Título da fotografia
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Luz dourada na estação"
                    className="w-full rounded-xl bg-tl-bege/55 border border-tl-marrom/16 px-3.5 py-2.5 text-sm text-tl-marrom focus:outline-none focus:border-tl-laranja"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-tl-marrom-suave mb-1">
                    Legenda
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ex.: Fim de tarde em 35mm, rua do Mercado"
                    className="w-full rounded-xl bg-tl-bege/55 border border-tl-marrom/16 px-3.5 py-2.5 text-sm text-tl-marrom focus:outline-none focus:border-tl-laranja"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-tl-marrom-suave mb-1">
                    Descrição e história do momento
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Conte onde e como este registro aconteceu…"
                    className="w-full rounded-xl bg-tl-bege/55 border border-tl-marrom/16 p-3.5 font-literary text-sm text-tl-marrom focus:outline-none focus:border-tl-laranja"
                  />
                </div>
              </div>

              {formError && <p className="text-xs font-semibold text-tl-terracota">{formError}</p>}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCameraOpen(false);
                    setComposerOpen(false);
                  }}
                  className="px-4 py-2 rounded-full text-xs text-tl-marrom-suave hover:text-tl-marrom cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="autumn-glow-btn px-5 py-2.5 rounded-full text-xs font-medium bg-tl-laranja text-tl-creme hover:bg-tl-terracota disabled:opacity-45 cursor-pointer"
                >
                  {saving ? 'Publicando…' : editingPhoto ? 'Salvar alterações' : 'Publicar fotografia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Lightbox Modal with Like, Edit/Delete, and Comments */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-6"
          onClick={() => setLightboxId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-tl-creme w-full max-w-5xl h-full md:h-[88vh] md:rounded-3xl border border-tl-marrom/20 editorial-shadow overflow-hidden grid grid-cols-1 lg:grid-cols-12"
          >
            {/* Enlarged Image */}
            <div className="lg:col-span-7 bg-[#14110F] flex items-center justify-center relative min-h-[260px] max-h-[52vh] lg:max-h-full">
              <ImageWithFallback
                src={lightboxPhoto.coverImage || ''}
                alt={lightboxPhoto.title}
                className="max-w-full max-h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxId(null)}
                aria-label="Fechar visualização ampliada"
                className="lg:hidden absolute top-3 right-3 w-9 h-9 rounded-full bg-black/65 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata + Interactions + Comments */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
              <div className="px-5 py-3.5 border-b border-tl-areia/70 flex items-center justify-between bg-tl-bege/65">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxId(null);
                    onOpenAuthor(lightboxPhoto.author.username);
                  }}
                  className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
                >
                  <UserAvatar
                    src={lightboxPhoto.author.avatarUrl}
                    name={lightboxPhoto.author.displayName}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-tl-marrom truncate">
                      {lightboxPhoto.author.displayName}
                    </div>
                    <div className="text-[11px] text-tl-marrom-suave">
                      {new Date(lightboxPhoto.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLightboxId(null)}
                  aria-label="Fechar"
                  className="hidden lg:flex p-1.5 rounded-full text-tl-marrom hover:bg-tl-areia/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                    {lightboxPhoto.title}
                  </h2>
                  {(lightboxPhoto.imageCaption || lightboxPhoto.subtitle) && (
                    <p className="text-xs font-medium text-tl-terracota mt-1">
                      {lightboxPhoto.imageCaption || lightboxPhoto.subtitle}
                    </p>
                  )}
                  {lightboxPhoto.content && (
                    <p className="font-literary text-sm text-tl-marrom/90 leading-relaxed mt-2.5 whitespace-pre-line">
                      {lightboxPhoto.content}
                    </p>
                  )}
                </div>

                {/* Action strip */}
                <div className="py-3 border-y border-tl-areia/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleLike(lightboxPhoto.id)}
                      className={`px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                        lightboxPhoto.isLiked
                          ? 'bg-tl-bege text-tl-terracota font-semibold'
                          : 'text-tl-marrom-suave hover:bg-tl-bege'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${lightboxPhoto.isLiked ? 'fill-tl-laranja text-tl-laranja' : ''}`}
                      />
                      <span className="tabular-nums">{lightboxPhoto.likesCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(lightboxPhoto.id)}
                      className={`px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                        lightboxPhoto.isSaved
                          ? 'bg-tl-bege text-tl-terracota font-semibold'
                          : 'text-tl-marrom-suave hover:bg-tl-bege'
                      }`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${lightboxPhoto.isSaved ? 'fill-tl-laranja text-tl-laranja' : ''}`}
                      />
                      <span>{lightboxPhoto.isSaved ? 'Salvo' : 'Favoritar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onShare(lightboxPhoto)}
                      className="px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 text-tl-marrom-suave hover:bg-tl-bege cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {currentUser?.id === lightboxPhoto.authorId && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditPhotoModal(lightboxPhoto)}
                        className="px-2.5 py-1.5 rounded-full text-xs bg-tl-bege text-tl-marrom hover:text-tl-terracota inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      {confirmDeleteId === lightboxPhoto.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(lightboxPhoto.id)}
                          className="px-2.5 py-1.5 rounded-full text-xs bg-tl-terracota text-tl-creme font-semibold cursor-pointer"
                        >
                          Confirmar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(lightboxPhoto.id)}
                          className="px-2.5 py-1.5 rounded-full text-xs text-tl-terracota hover:bg-tl-bege inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="space-y-3">
                  <h3 className="font-editorial text-lg font-semibold text-tl-marrom">
                    Comentários ({comments.length})
                  </h3>

                  <form onSubmit={handleCommentSubmit} className="space-y-2">
                    {replyTo && (
                      <div className="flex items-center justify-between text-xs bg-tl-bege px-3 py-1 rounded-full">
                        <span>Respondendo a {replyTo.author.displayName}</span>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="text-tl-terracota cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={
                          currentUser
                            ? 'Escreva um comentário sobre a foto…'
                            : 'Entre para comentar esta fotografia…'
                        }
                        className="flex-1 rounded-full bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2 text-xs text-tl-marrom focus:outline-none focus:border-tl-laranja"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="px-4 py-2 rounded-full text-xs font-medium bg-tl-laranja text-tl-creme hover:bg-tl-terracota disabled:opacity-40 cursor-pointer"
                      >
                        Enviar
                      </button>
                    </div>
                  </form>

                  {loadingComments ? (
                    <p className="text-xs text-tl-marrom-suave">Carregando comentários…</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-tl-marrom-suave">
                      Nenhum comentário ainda. Seja o primeiro a comentar.
                    </p>
                  ) : (
                    <div>{comments.map((c) => renderComment(c))}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
