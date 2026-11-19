import 'dotenv/config';
import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  BUNDLED_UPLOADS_DIR,
  buildCommentTree,
  createDefaultShelvesForUser,
  enrichDiaryEntry,
  enrichPost,
  ensureDataDirs,
  getDb,
  getNotificationsEnriched,
  getOrCreatePodcastState,
  getSavedItemsEnriched,
  getUserMediaLibrary,
  getWorkCommentsEnriched,
  getWorkCommunityStats,
  getWorkReviewsEnriched,
  hashPassword,
  IS_VERCEL,
  makeDefaultCustomization,
  makeDefaultMusicLibrary,
  mapPostCategoryToFavoriteCategory,
  saveDb,
  toPublicUser,
  UPLOADS_DIR,
  verifyPassword,
} from './db';
import {
  discoverBooks,
  discoverMoviesSeries,
  inferMediaKindFromWorkId,
  resolveCatalogWork,
  searchBooks,
  searchMoviesSeries,
} from './catalogService';
import {
  ensureNewsLoaded,
  getNewsSnapshot,
  subscribeNewsUpdates,
  syncAllNews,
} from './newsService';
import {
  ART_CULTURE_THEMES,
  getArtCultureCatalog,
} from './artCultureService';
import {
  getPodcastCatalog,
  PODCAST_GENRES,
  searchPodcastCatalog,
} from './podcastService';
import {
  buildSpotifyAuthUrl,
  disconnectSpotifySession,
  exchangeSpotifyCode,
  getSpotifyPersonalDiscoveries,
  getUserSpotifyStatus,
  resolvePendingState,
  searchSpotifyCatalog,
} from './spotifyService';
import {
  CatalogMediaKind,
  CatalogWorkSnapshot,
  CulturalItem,
  DiaryEntry,
  DiaryVisibility,
  FavoriteCategory,
  FavoriteCollection,
  MediaShelfStatus,
  MusicLibrary,
  PodcastEpisode,
  PodcastGenre,
  PostRecord,
  ProfileCustomization,
  Shelf,
  ShelfItem,
  SpotifyItemRef,
  UserRecord,
} from '../src/types/thinklive';

const SESSION_SECRET = process.env.SESSION_SECRET || 'thinklive-editorial-secret-2026';
const COOKIE_NAME = 'thinklive_session';

interface AuthRequest extends Request {
  userId?: string | null;
}

function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { uid?: string };
    return parsed.uid || null;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    out[k] = v;
  }
  return out;
}

function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies[COOKIE_NAME];
  }
  if (token) {
    const uid = verifyToken(token);
    if (uid) {
      const db = getDb();
      if (db.users.some((u) => u.id === uid)) {
        req.userId = uid;
      }
    }
  }
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Autenticação necessária para esta ação.' });
    return;
  }
  next();
}

function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production' || IS_VERCEL;
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 30}`,
  ];
  if (isProd) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function createApiApp() {
  ensureDataDirs();
  getDb();
  ensureNewsLoaded();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '25mb' }));
  app.use(authMiddleware);

  // Serve uploaded user images (local + bundled fallback on Vercel)
  app.use('/uploads', express.static(UPLOADS_DIR));
  if (IS_VERCEL && fs.existsSync(BUNDLED_UPLOADS_DIR)) {
    app.use('/uploads', express.static(BUNDLED_UPLOADS_DIR));
  }

  // ---------------- AUTH & ACCOUNT ----------------
  app.get('/api/auth/me', (req: AuthRequest, res) => {
    if (!req.userId) {
      res.json({ user: null });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) {
      res.json({ user: null });
      return;
    }
    res.json({ user: toPublicUser(user, req.userId) });
  });

  app.post('/api/auth/register', (req: AuthRequest, res) => {
    const { username, email, password, displayName, passwordHint } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      displayName?: string;
      passwordHint?: string;
    };

    const cleanUsername = (username || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9._-]/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || '').trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      res.status(400).json({ error: 'Nome de usuário único precisa ter pelo menos 3 caracteres (letras, números, . _ -).' });
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const db = getDb();
    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      res.status(409).json({ error: 'Este nome de usuário já está em uso.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      return;
    }

    const userId = makeId('usr');
    const newUser: UserRecord = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      passwordHint: (passwordHint || '').trim().slice(0, 120),
      displayName: cleanName || cleanUsername,
      bio: 'Novo espaço na Thinklive.',
      avatarUrl: '',
      isPrivate: false,
      isDemo: false,
      preferences: { favoriteCategories: ['Poemas', 'Artigos', 'Livros'], emailNotifications: true },
      customization: makeDefaultCustomization(),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.shelves.push(...createDefaultShelvesForUser(userId));
    saveDb();

    const token = signToken(userId);
    setSessionCookie(res, token);
    res.status(201).json({ user: toPublicUser(newUser, userId), token });
  });

  app.post('/api/auth/login', (req: AuthRequest, res) => {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    const clean = (identifier || '').trim().toLowerCase().replace(/^@/, '');
    if (!clean || !password) {
      res.status(400).json({ error: 'Informe e-mail/@usuário e senha.' });
      return;
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
    );
    if (!user) {
      res.status(401).json({
        error: 'Nenhuma conta encontrada com esse e-mail ou @usuário. Crie uma conta gratuita ou entre com a conta de demonstração.',
      });
      return;
    }
    if (!verifyPassword(password, user.passwordHash)) {
      const hint = user.passwordHint?.trim()
        ? user.passwordHint.trim()
        : user.isDemo
        ? 'Conta de demonstração — senha de acesso: thinklive123'
        : null;
      res.status(401).json({
        error: hint
          ? `Senha incorreta. Dica da senha: ${hint}`
          : 'Senha incorreta. Confira o que foi digitado ou use "Recuperar senha".',
      });
      return;
    }

    const token = signToken(user.id);
    setSessionCookie(res, token);
    res.json({ user: toPublicUser(user, user.id), token });
  });

  app.post('/api/auth/demo', (_req, res) => {
    const db = getDb();
    const demoUser = db.users.find((u) => u.id === 'demo_user_clara') || db.users[0];
    const token = signToken(demoUser.id);
    setSessionCookie(res, token);
    res.json({ user: toPublicUser(demoUser, demoUser.id), token });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/auth/password-hint', (req, res) => {
    const { identifier } = req.body as { identifier?: string };
    const clean = (identifier || '').trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      res.status(400).json({ error: 'Informe seu e-mail ou @usuário para consultar a dica.' });
      return;
    }
    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
    );
    if (!user) {
      res.status(404).json({ error: 'Nenhuma conta encontrada com este e-mail ou usuário.' });
      return;
    }
    const hint = user.passwordHint?.trim()
      ? user.passwordHint.trim()
      : user.isDemo
      ? 'Conta de demonstração — senha de acesso: thinklive123'
      : '';
    res.json({ hint: hint || null });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(404).json({ error: 'Nenhuma conta encontrada com este e-mail.' });
      return;
    }
    const code = String(crypto.randomInt(100000, 999999));
    db.resetTokens = db.resetTokens.filter((t) => t.email !== cleanEmail);
    db.resetTokens.push({ email: cleanEmail, code, expiresAt: Date.now() + 15 * 60 * 1000 });
    saveDb();
    // Returned in response so recovery works completely without external SMTP in sandbox
    res.json({
      message: 'Código de recuperação gerado com sucesso.',
      recoveryCode: code,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body as { email?: string; code?: string; newPassword?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    const db = getDb();
    const tokenEntry = db.resetTokens.find(
      (t) => t.email === cleanEmail && t.code === (code || '').trim() && t.expiresAt > Date.now()
    );
    if (!tokenEntry) {
      res.status(400).json({ error: 'Código inválido ou expirado.' });
      return;
    }
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    user.passwordHash = hashPassword(newPassword);
    db.resetTokens = db.resetTokens.filter((t) => t.email !== cleanEmail);
    saveDb();
    res.json({ ok: true, message: 'Senha redefinida com sucesso.' });
  });

  app.patch('/api/account', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const { displayName, username, bio, avatarUrl, isPrivate, preferences, passwordHint } = req.body as Partial<UserRecord>;
    if (username !== undefined) {
      const cleanUsername = username
        .trim()
        .toLowerCase()
        .replace(/^@/, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9._-]/g, '');
      if (cleanUsername.length < 3) {
        res.status(400).json({ error: 'Nome de usuário precisa ter pelo menos 3 caracteres.' });
        return;
      }
      if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === cleanUsername)) {
        res.status(409).json({ error: 'Nome de usuário já está em uso.' });
        return;
      }
      user.username = cleanUsername;
    }
    if (displayName !== undefined) user.displayName = displayName.trim() || user.username;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (isPrivate !== undefined) user.isPrivate = Boolean(isPrivate);
    if (preferences !== undefined) user.preferences = preferences;
    if (passwordHint !== undefined) user.passwordHint = passwordHint.trim().slice(0, 120);
    saveDb();
    res.json({ user: toPublicUser(user, user.id) });
  });

  // ---------------- IMAGE UPLOAD ----------------
  app.post('/api/upload', requireAuth, (req: AuthRequest, res) => {
    const { dataUrl, filename } = req.body as { dataUrl?: string; filename?: string };
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Formato de imagem inválido.' });
      return;
    }
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+)(?:;[^,]*)?;base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Tipo de imagem não suportado.' });
      return;
    }
    const rawSub = match[1].toLowerCase();
    const allowedMap: Record<string, string> = {
      png: 'png',
      jpeg: 'jpg',
      jpg: 'jpg',
      webp: 'webp',
      gif: 'gif',
      avif: 'avif',
      heic: 'heic',
      heif: 'heif',
      bmp: 'bmp',
      'svg+xml': 'svg',
    };
    const ext = allowedMap[rawSub];
    if (!ext) {
      res.status(400).json({ error: 'Tipo de imagem não suportado. Use PNG, JPG, WEBP ou GIF.' });
      return;
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 15 * 1024 * 1024) {
      res.status(400).json({ error: 'Imagem excede o limite de 15MB.' });
      return;
    }
    if (IS_VERCEL || ((filename === 'banner' || filename === 'avatar') && buffer.length <= 650 * 1024)) {
      res.json({ url: dataUrl });
      return;
    }
    const safeBase = (filename || 'img').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'img';
    const outName = `${safeBase}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, outName), buffer);
    res.json({ url: `/uploads/${outName}` });
  });

  // ---------------- POSTS & FEED ----------------
  app.get('/api/posts', (req: AuthRequest, res) => {
    const db = getDb();
    const { category, type, filter, authorId, status } = req.query as Record<string, string>;
    const viewerId = req.userId || null;

    const blockedIds = viewerId
      ? new Set(db.blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId))
      : new Set<string>();
    const followingIds = viewerId
      ? new Set(db.follows.filter((f) => f.followerId === viewerId).map((f) => f.followingId))
      : new Set<string>();

    let list = db.posts.filter((p) => {
      if (blockedIds.has(p.authorId)) return false;
      if ((p.type as string) === 'descoberta' || (p.category as string) === 'Descobertas') return false;
      if (status === 'draft') {
        return p.status === 'draft' && p.authorId === viewerId;
      }
      if (p.status !== 'published') return false;

      const author = db.users.find((u) => u.id === p.authorId);
      if (author?.isPrivate && author.id !== viewerId && !followingIds.has(author.id)) {
        return false;
      }
      if (authorId && p.authorId !== authorId) return false;
      if (category && category !== 'Início' && p.category !== category) return false;
      if (type && type !== 'todos' && p.type !== type) return false;
      if (filter === 'seguindo' && viewerId && !followingIds.has(p.authorId) && p.authorId !== viewerId) {
        return false;
      }
      return true;
    });

    const enriched = list.map((p) => enrichPost(p, viewerId));
    if (filter === 'populares') {
      enriched.sort((a, b) => b.likesCount + b.commentsCount * 2 - (a.likesCount + a.commentsCount * 2));
    } else {
      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json({ posts: enriched });
  });

  app.get('/api/posts/:id', (req: AuthRequest, res) => {
    const db = getDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    if (post.status === 'draft' && post.authorId !== req.userId) {
      res.status(403).json({ error: 'Rascunho privado.' });
      return;
    }
    const comments = buildCommentTree(post.id, req.userId);
    res.json({ post: enrichPost(post, req.userId), comments });
  });

  app.post('/api/posts', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const {
      type,
      category,
      title,
      subtitle,
      content,
      coverImage,
      imageCaption,
      reviewMeta,
      spotifyItem,
      ambientSoundId,
      status,
    } = req.body as Partial<PostRecord>;
    if (!title?.trim() && !content?.trim()) {
      res.status(400).json({ error: 'Adicione um título ou conteúdo à sua publicação.' });
      return;
    }
    const now = new Date().toISOString();
    const newPost: PostRecord = {
      id: makeId('post'),
      authorId: req.userId!,
      type: type || 'artigo',
      category: category || 'Artigos',
      title: (title || 'Sem título').trim(),
      subtitle: subtitle?.trim() || '',
      content: (content || '').trim(),
      coverImage: coverImage || '',
      imageCaption: imageCaption || '',
      reviewMeta: reviewMeta,
      spotifyItem: type === 'poema' ? undefined : spotifyItem,
      ambientSoundId: ambientSoundId || undefined,
      status: status === 'draft' ? 'draft' : 'published',
      isDemo: false,
      sharesCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.posts.unshift(newPost);

    if (newPost.status === 'published') {
      const followers = db.follows.filter((f) => f.followingId === req.userId);
      for (const f of followers) {
        db.notifications.unshift({
          id: makeId('notif'),
          userId: f.followerId,
          actorId: req.userId!,
          type: 'new_post',
          postId: newPost.id,
          message: `publicou "${newPost.title}"`,
          read: false,
          createdAt: now,
        });
      }
    }
    saveDb();
    res.status(201).json({ post: enrichPost(newPost, req.userId) });
  });

  app.patch('/api/posts/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    if (post.authorId !== req.userId) {
      res.status(403).json({ error: 'Você só pode editar suas próprias publicações.' });
      return;
    }
    const {
      type,
      category,
      title,
      subtitle,
      content,
      coverImage,
      imageCaption,
      reviewMeta,
      spotifyItem,
      ambientSoundId,
      status,
    } = req.body as Partial<PostRecord>;
    if (type !== undefined) post.type = type;
    if (category !== undefined) post.category = category;
    if (title !== undefined) post.title = title.trim();
    if (subtitle !== undefined) post.subtitle = subtitle.trim();
    if (content !== undefined) post.content = content.trim();
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (imageCaption !== undefined) post.imageCaption = imageCaption;
    if (reviewMeta !== undefined) post.reviewMeta = reviewMeta;
    if (spotifyItem !== undefined) post.spotifyItem = post.type === 'poema' ? undefined : spotifyItem;
    if (ambientSoundId !== undefined) post.ambientSoundId = ambientSoundId || undefined;
    if (status !== undefined) post.status = status;
    post.updatedAt = new Date().toISOString();
    saveDb();
    res.json({ post: enrichPost(post, req.userId) });
  });

  app.delete('/api/posts/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    if (post.authorId !== req.userId) {
      res.status(403).json({ error: 'Você só pode excluir suas próprias publicações.' });
      return;
    }
    db.posts = db.posts.filter((p) => p.id !== post.id);
    db.likes = db.likes.filter((l) => l.postId !== post.id);
    db.comments = db.comments.filter((c) => c.postId !== post.id);
    db.savedItems = db.savedItems.filter((s) => s.postId !== post.id);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/posts/:id/like', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const idx = db.likes.findIndex((l) => l.postId === post.id && l.userId === req.userId);
    if (idx >= 0) {
      db.likes.splice(idx, 1);
    } else {
      const now = new Date().toISOString();
      db.likes.push({ userId: req.userId!, postId: post.id, createdAt: now });
      if (post.authorId !== req.userId) {
        db.notifications.unshift({
          id: makeId('notif'),
          userId: post.authorId,
          actorId: req.userId!,
          type: 'like',
          postId: post.id,
          message: `curtiu "${post.title}"`,
          read: false,
          createdAt: now,
        });
      }
    }
    saveDb();
    res.json({ post: enrichPost(post, req.userId) });
  });

  app.post('/api/posts/:id/share', (req: AuthRequest, res) => {
    const db = getDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    post.sharesCount += 1;
    saveDb();
    res.json({ post: enrichPost(post, req.userId) });
  });

  // ---------------- COMMENTS ----------------
  app.get('/api/posts/:id/comments', (req: AuthRequest, res) => {
    res.json({ comments: buildCommentTree(String(req.params.id), req.userId) });
  });

  app.post('/api/posts/:id/comments', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const { content, parentId } = req.body as { content?: string; parentId?: string | null };
    if (!content?.trim()) {
      res.status(400).json({ error: 'Escreva um comentário antes de enviar.' });
      return;
    }
    const now = new Date().toISOString();
    const newComment = {
      id: makeId('cmt'),
      postId: post.id,
      authorId: req.userId!,
      parentId: parentId || null,
      content: content.trim(),
      createdAt: now,
    };
    db.comments.push(newComment);

    if (parentId) {
      const parentComment = db.comments.find((c) => c.id === parentId);
      if (parentComment && parentComment.authorId !== req.userId) {
        db.notifications.unshift({
          id: makeId('notif'),
          userId: parentComment.authorId,
          actorId: req.userId!,
          type: 'reply',
          postId: post.id,
          message: `respondeu ao seu comentário em "${post.title}"`,
          read: false,
          createdAt: now,
        });
      }
    } else if (post.authorId !== req.userId) {
      db.notifications.unshift({
        id: makeId('notif'),
        userId: post.authorId,
        actorId: req.userId!,
        type: 'comment',
        postId: post.id,
        message: `comentou em "${post.title}"`,
        read: false,
        createdAt: now,
      });
    }

    saveDb();
    res.status(201).json({ comments: buildCommentTree(post.id, req.userId) });
  });

  app.delete('/api/comments/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const cmt = db.comments.find((c) => c.id === req.params.id);
    if (!cmt) {
      res.status(404).json({ error: 'Comentário não encontrado.' });
      return;
    }
    const post = db.posts.find((p) => p.id === cmt.postId);
    if (cmt.authorId !== req.userId && post?.authorId !== req.userId) {
      res.status(403).json({ error: 'Sem permissão para remover este comentário.' });
      return;
    }
    db.comments = db.comments.filter((c) => c.id !== cmt.id && c.parentId !== cmt.id);
    saveDb();
    res.json({ comments: buildCommentTree(cmt.postId, req.userId) });
  });

  // ---------------- USERS, PROFILES & CUSTOMIZATION ----------------
  app.get('/api/users', (req: AuthRequest, res) => {
    const db = getDb();
    const q = String(req.query.q || '').trim().toLowerCase();
    const blockedIds = req.userId
      ? new Set(db.blocks.filter((b) => b.blockerId === req.userId).map((b) => b.blockedId))
      : new Set<string>();

    const users = db.users
      .filter((u) => !blockedIds.has(u.id))
      .filter((u) => {
        if (!q) return true;
        return (
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.bio.toLowerCase().includes(q)
        );
      })
      .map((u) => toPublicUser(u, req.userId));

    res.json({ users });
  });

  app.get('/api/users/:username', (req: AuthRequest, res) => {
    const db = getDb();
    const param = String(req.params.username).toLowerCase();
    const target = db.users.find((u) => u.username.toLowerCase() === param || u.id === req.params.username);
    if (!target) {
      res.status(404).json({ error: 'Perfil não encontrado.' });
      return;
    }
    const pub = toPublicUser(target, req.userId);
    const canView = pub.canViewFullProfile;
    const shelves = canView
      ? db.shelves
          .filter((s) => s.userId === target.id && (s.isPublic || target.id === req.userId))
          .sort((a, b) => a.order - b.order)
      : [];
    const posts = canView
      ? db.posts
          .filter((p) => p.authorId === target.id && p.status === 'published')
          .map((p) => enrichPost(p, req.userId))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : [];
    const culturalItems = canView
      ? db.culturalItems.filter((c) => c.userId === target.id)
      : [];
    const mediaLibrary = canView
      ? getUserMediaLibrary(target.id, req.userId)
      : { reviews: [], shelfEntries: [] };

    res.json({
      user: pub,
      shelves,
      posts,
      culturalItems,
      mediaReviews: mediaLibrary.reviews,
      mediaShelfEntries: mediaLibrary.shelfEntries,
    });
  });

  app.patch('/api/profile/customization', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const { displayName, username, bio, avatarUrl, customization } = req.body as {
      displayName?: string;
      username?: string;
      bio?: string;
      avatarUrl?: string;
      customization?: ProfileCustomization;
    };
    if (username !== undefined) {
      const cleanUsername = username
        .trim()
        .toLowerCase()
        .replace(/^@/, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9._-]/g, '');
      if (cleanUsername.length < 3) {
        res.status(400).json({ error: 'Nome de usuário precisa ter pelo menos 3 caracteres.' });
        return;
      }
      if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === cleanUsername)) {
        res.status(409).json({ error: 'Nome de usuário já está em uso.' });
        return;
      }
      user.username = cleanUsername;
    }
    if (displayName !== undefined) user.displayName = displayName.trim() || user.username;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (customization !== undefined) user.customization = customization;
    saveDb();
    res.json({ user: toPublicUser(user, user.id) });
  });

  app.post('/api/users/:id/follow', requireAuth, (req: AuthRequest, res) => {
    const targetId = String(req.params.id);
    if (targetId === req.userId) {
      res.status(400).json({ error: 'Não é possível seguir a própria conta.' });
      return;
    }
    const db = getDb();
    const target = db.users.find((u) => u.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const idx = db.follows.findIndex((f) => f.followerId === req.userId && f.followingId === targetId);
    if (idx >= 0) {
      db.follows.splice(idx, 1);
    } else {
      const now = new Date().toISOString();
      db.follows.push({ followerId: req.userId!, followingId: targetId, createdAt: now });
      db.notifications.unshift({
        id: makeId('notif'),
        userId: targetId,
        actorId: req.userId!,
        type: 'follow',
        message: 'começou a seguir você',
        read: false,
        createdAt: now,
      });
    }
    saveDb();
    res.json({ user: toPublicUser(target, req.userId) });
  });

  app.get('/api/users/:id/followers', (req: AuthRequest, res) => {
    const db = getDb();
    const followerIds = db.follows.filter((f) => f.followingId === req.params.id).map((f) => f.followerId);
    const followers = followerIds
      .map((id) => db.users.find((u) => u.id === id))
      .filter((u): u is UserRecord => Boolean(u))
      .map((u) => toPublicUser(u, req.userId));
    res.json({ users: followers });
  });

  app.get('/api/users/:id/following', (req: AuthRequest, res) => {
    const db = getDb();
    const followingIds = db.follows.filter((f) => f.followerId === req.params.id).map((f) => f.followingId);
    const following = followingIds
      .map((id) => db.users.find((u) => u.id === id))
      .filter((u): u is UserRecord => Boolean(u))
      .map((u) => toPublicUser(u, req.userId));
    res.json({ users: following });
  });

  // ---------------- MODERATION: BLOCK & REPORT ----------------
  app.get('/api/blocks', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const blockedIds = db.blocks.filter((b) => b.blockerId === req.userId).map((b) => b.blockedId);
    const users = blockedIds
      .map((id) => db.users.find((u) => u.id === id))
      .filter((u): u is UserRecord => Boolean(u))
      .map((u) => toPublicUser(u, req.userId));
    res.json({ users });
  });

  app.post('/api/users/:id/block', requireAuth, (req: AuthRequest, res) => {
    const targetId = String(req.params.id);
    if (targetId === req.userId) {
      res.status(400).json({ error: 'Operação inválida.' });
      return;
    }
    const db = getDb();
    const idx = db.blocks.findIndex((b) => b.blockerId === req.userId && b.blockedId === targetId);
    let blocked = false;
    if (idx >= 0) {
      db.blocks.splice(idx, 1);
    } else {
      db.blocks.push({ blockerId: req.userId!, blockedId: targetId, createdAt: new Date().toISOString() });
      db.follows = db.follows.filter(
        (f) => !(f.followerId === req.userId && f.followingId === targetId) && !(f.followerId === targetId && f.followingId === req.userId)
      );
      blocked = true;
    }
    saveDb();
    res.json({ blocked });
  });

  app.post('/api/reports', requireAuth, (req: AuthRequest, res) => {
    const { targetType, targetId, reason, details } = req.body as {
      targetType?: 'post' | 'user' | 'comment';
      targetId?: string;
      reason?: string;
      details?: string;
    };
    if (!targetType || !targetId || !reason) {
      res.status(400).json({ error: 'Informe o motivo da denúncia.' });
      return;
    }
    const db = getDb();
    db.reports.push({
      id: makeId('rep'),
      reporterId: req.userId!,
      targetType,
      targetId,
      reason,
      details: (details || '').trim(),
      createdAt: new Date().toISOString(),
    });
    saveDb();
    res.status(201).json({ ok: true, message: 'Denúncia registrada para moderação.' });
  });

  // ---------------- CULTURAL HUB (FILMES, SÉRIES, LIVROS, MÚSICAS) ----------------
  app.get('/api/cultural', (req: AuthRequest, res) => {
    const db = getDb();
    const { mediaType, userId } = req.query as Record<string, string>;
    const list = db.culturalItems
      .filter((item) => {
        if (mediaType && item.mediaType !== mediaType) return false;
        if (userId && item.userId !== userId) return false;
        return true;
      })
      .map((item) => {
        const owner = db.users.find((u) => u.id === item.userId);
        return {
          ...item,
          ownerName: owner?.displayName || 'Leitor Thinklive',
          ownerUsername: owner?.username || '',
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ items: list });
  });

  app.post('/api/cultural', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const body = req.body as Partial<CulturalItem>;
    if (!body.title?.trim() || !body.mediaType) {
      res.status(400).json({ error: 'Informe o título da obra e o tipo cultural.' });
      return;
    }
    const item: CulturalItem = {
      id: makeId('cult'),
      userId: req.userId!,
      mediaType: body.mediaType,
      subType: body.subType || 'obra',
      title: body.title.trim(),
      creator: (body.creator || '').trim(),
      year: (body.year || '').trim(),
      coverUrl: body.coverUrl || '',
      status: body.status || 'completed',
      rating: Number(body.rating) || 0,
      review: (body.review || '').trim(),
      listName: (body.listName || '').trim(),
      isFavorite: Boolean(body.isFavorite),
      isDemo: false,
      createdAt: new Date().toISOString(),
    };
    db.culturalItems.unshift(item);
    saveDb();
    res.status(201).json({ item });
  });

  app.patch('/api/cultural/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const item = db.culturalItems.find((c) => c.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Registro não encontrado.' });
      return;
    }
    if (item.userId !== req.userId) {
      res.status(403).json({ error: 'Você só pode editar seus próprios registros culturais.' });
      return;
    }
    Object.assign(item, req.body, { id: item.id, userId: item.userId });
    saveDb();
    res.json({ item });
  });

  app.delete('/api/cultural/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const item = db.culturalItems.find((c) => c.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Registro não encontrado.' });
      return;
    }
    if (item.userId !== req.userId) {
      res.status(403).json({ error: 'Sem permissão para excluir.' });
      return;
    }
    db.culturalItems = db.culturalItems.filter((c) => c.id !== item.id);
    saveDb();
    res.json({ ok: true });
  });

  // ---------------- SHELVES ("MINHA ESTANTE") ----------------
  app.get('/api/shelves', (req: AuthRequest, res) => {
    const db = getDb();
    const targetUserId = String(req.query.userId || req.userId || '');
    if (!targetUserId) {
      res.json({ shelves: [] });
      return;
    }
    const shelves = db.shelves
      .filter((s) => s.userId === targetUserId && (s.isPublic || targetUserId === req.userId))
      .sort((a, b) => a.order - b.order);
    res.json({ shelves });
  });

  app.post('/api/shelves', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const { title, category, description, coverUrl, isPublic } = req.body as Partial<Shelf>;
    if (!title?.trim()) {
      res.status(400).json({ error: 'Informe um nome para a estante.' });
      return;
    }
    const userShelves = db.shelves.filter((s) => s.userId === req.userId);
    const newShelf: Shelf = {
      id: makeId('shelf'),
      userId: req.userId!,
      title: title.trim(),
      category: (category || title).trim(),
      description: (description || '').trim(),
      coverUrl: coverUrl || '',
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      order: userShelves.length,
      items: [],
      createdAt: new Date().toISOString(),
    };
    db.shelves.push(newShelf);
    saveDb();
    res.status(201).json({ shelf: newShelf });
  });

  app.post('/api/shelves/reorder', requireAuth, (req: AuthRequest, res) => {
    const { orderedIds } = req.body as { orderedIds?: string[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'Lista de ordem inválida.' });
      return;
    }
    const db = getDb();
    orderedIds.forEach((id, idx) => {
      const shelf = db.shelves.find((s) => s.id === id && s.userId === req.userId);
      if (shelf) shelf.order = idx;
    });
    saveDb();
    const shelves = db.shelves.filter((s) => s.userId === req.userId).sort((a, b) => a.order - b.order);
    res.json({ shelves });
  });

  app.patch('/api/shelves/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const shelf = db.shelves.find((s) => s.id === req.params.id);
    if (!shelf || shelf.userId !== req.userId) {
      res.status(404).json({ error: 'Estante não encontrada.' });
      return;
    }
    const { title, category, description, coverUrl, isPublic } = req.body as Partial<Shelf>;
    if (title !== undefined) shelf.title = title.trim();
    if (category !== undefined) shelf.category = category.trim();
    if (description !== undefined) shelf.description = description.trim();
    if (coverUrl !== undefined) shelf.coverUrl = coverUrl;
    if (isPublic !== undefined) shelf.isPublic = Boolean(isPublic);
    saveDb();
    res.json({ shelf });
  });

  app.delete('/api/shelves/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const shelf = db.shelves.find((s) => s.id === req.params.id);
    if (!shelf || shelf.userId !== req.userId) {
      res.status(404).json({ error: 'Estante não encontrada.' });
      return;
    }
    db.shelves = db.shelves.filter((s) => s.id !== shelf.id);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/shelves/:id/items', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const shelf = db.shelves.find((s) => s.id === req.params.id);
    if (!shelf || shelf.userId !== req.userId) {
      res.status(404).json({ error: 'Estante não encontrada.' });
      return;
    }
    const { title, subtitle, kind, coverUrl, refId, note, year, isFavorite, rating } =
      req.body as Partial<ShelfItem>;
    if (!title?.trim()) {
      res.status(400).json({ error: 'Informe o título do item.' });
      return;
    }
    const cleanTitle = title.trim();
    const existingDup = shelf.items.find(
      (i) =>
        (refId && i.refId === refId) ||
        i.title.trim().toLowerCase() === cleanTitle.toLowerCase()
    );
    if (existingDup) {
      res.status(200).json({ shelf });
      return;
    }
    const item: ShelfItem = {
      id: makeId('shitem'),
      title: cleanTitle,
      subtitle: (subtitle || '').trim(),
      kind: kind || 'outro',
      coverUrl: coverUrl || '',
      refId,
      note: note?.trim(),
      year: year?.trim(),
      isFavorite: Boolean(isFavorite),
      rating: typeof rating === 'number' ? rating : undefined,
      addedAt: new Date().toISOString(),
    };
    shelf.items.unshift(item);
    saveDb();
    res.status(201).json({ shelf });
  });

  app.patch('/api/shelves/:id/items/:itemId', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const shelf = db.shelves.find((s) => s.id === req.params.id);
    if (!shelf || shelf.userId !== req.userId) {
      res.status(404).json({ error: 'Estante não encontrada.' });
      return;
    }
    const item = shelf.items.find((i) => i.id === req.params.itemId);
    if (!item) {
      res.status(404).json({ error: 'Obra não encontrada na estante.' });
      return;
    }
    const { title, subtitle, kind, coverUrl, note, year, isFavorite, rating } =
      req.body as Partial<ShelfItem>;
    if (title !== undefined && title.trim()) item.title = title.trim();
    if (subtitle !== undefined) item.subtitle = subtitle.trim();
    if (kind !== undefined) item.kind = kind;
    if (coverUrl !== undefined) item.coverUrl = coverUrl.trim();
    if (note !== undefined) item.note = note.trim();
    if (year !== undefined) item.year = year.trim();
    if (isFavorite !== undefined) item.isFavorite = Boolean(isFavorite);
    if (rating !== undefined) item.rating = rating;
    saveDb();
    res.json({ shelf });
  });

  app.post('/api/shelves/:id/items/reorder', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const shelf = db.shelves.find((s) => s.id === req.params.id);
    if (!shelf || shelf.userId !== req.userId) {
      res.status(404).json({ error: 'Estante não encontrada.' });
      return;
    }
    const { orderedItemIds } = req.body as { orderedItemIds?: string[] };
    if (!Array.isArray(orderedItemIds)) {
      res.status(400).json({ error: 'Ordem inválida.' });
      return;
    }
    const map = new Map(shelf.items.map((i) => [i.id, i]));
    const reordered: ShelfItem[] = [];
    orderedItemIds.forEach((id) => {
      const found = map.get(id);
      if (found) {
        reordered.push(found);
        map.delete(id);
      }
    });
    for (const remaining of map.values()) reordered.push(remaining);
    shelf.items = reordered;
    saveDb();
    res.json({ shelf });
  });

  app.delete('/api/shelves/:id/items/:itemId', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const shelf = db.shelves.find((s) => s.id === req.params.id);
    if (!shelf || shelf.userId !== req.userId) {
      res.status(404).json({ error: 'Estante não encontrada.' });
      return;
    }
    shelf.items = shelf.items.filter((i) => i.id !== req.params.itemId);
    saveDb();
    res.json({ shelf });
  });

  // ---------------- FAVORITES & PRIVATE COLLECTIONS ----------------
  app.get('/api/favorites', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const items = getSavedItemsEnriched(req.userId!);
    const collections = db.favoriteCollections.filter((c) => c.userId === req.userId);
    res.json({ items, collections });
  });

  app.post('/api/favorites/toggle', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const { postId, category, collectionId } = req.body as {
      postId?: string;
      category?: FavoriteCategory;
      collectionId?: string | null;
    };
    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    const idx = db.savedItems.findIndex((s) => s.userId === req.userId && s.postId === post.id);
    let saved = false;
    if (idx >= 0) {
      db.savedItems.splice(idx, 1);
    } else {
      db.savedItems.push({
        id: makeId('fav'),
        userId: req.userId!,
        postId: post.id,
        category: category || mapPostCategoryToFavoriteCategory(post.category, post.type),
        collectionId: collectionId || null,
        savedAt: new Date().toISOString(),
      });
      saved = true;
    }
    saveDb();
    res.json({ saved, post: enrichPost(post, req.userId) });
  });

  app.patch('/api/favorites/assign', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const { savedId, category, collectionId } = req.body as {
      savedId?: string;
      category?: FavoriteCategory;
      collectionId?: string | null;
    };
    const item = db.savedItems.find((s) => s.id === savedId && s.userId === req.userId);
    if (!item) {
      res.status(404).json({ error: 'Favorito não encontrado.' });
      return;
    }
    if (category) item.category = category;
    if (collectionId !== undefined) item.collectionId = collectionId;
    saveDb();
    res.json({ items: getSavedItemsEnriched(req.userId!) });
  });

  app.post('/api/favorites/collections', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const { name, description, isPrivate } = req.body as { name?: string; description?: string; isPrivate?: boolean };
    if (!name?.trim()) {
      res.status(400).json({ error: 'Informe um nome para a coleção.' });
      return;
    }
    const col: FavoriteCollection = {
      id: makeId('favcol'),
      userId: req.userId!,
      name: name.trim(),
      description: (description || '').trim(),
      isPrivate: isPrivate !== undefined ? Boolean(isPrivate) : true,
      createdAt: new Date().toISOString(),
    };
    db.favoriteCollections.push(col);
    saveDb();
    res.status(201).json({ collection: col });
  });

  app.delete('/api/favorites/collections/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    db.favoriteCollections = db.favoriteCollections.filter(
      (c) => !(c.id === req.params.id && c.userId === req.userId)
    );
    db.savedItems.forEach((s) => {
      if (s.userId === req.userId && s.collectionId === req.params.id) {
        s.collectionId = null;
      }
    });
    saveDb();
    res.json({ ok: true });
  });

  // ---------------- NOTIFICATIONS / ACTIVITY ----------------
  app.get('/api/notifications', requireAuth, (req: AuthRequest, res) => {
    res.json({ notifications: getNotificationsEnriched(req.userId!) });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    db.notifications.forEach((n) => {
      if (n.userId === req.userId) n.read = true;
    });
    saveDb();
    res.json({ notifications: getNotificationsEnriched(req.userId!) });
  });

  app.post('/api/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === req.userId);
    if (notif) notif.read = true;
    saveDb();
    res.json({ notifications: getNotificationsEnriched(req.userId!) });
  });

  // ---------------- GLOBAL SEARCH & EXPLORE ----------------
  app.get('/api/search', (req: AuthRequest, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const db = getDb();
    const viewerId = req.userId || null;
    const blockedIds = viewerId
      ? new Set(db.blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId))
      : new Set<string>();

    const users = db.users
      .filter((u) => !blockedIds.has(u.id))
      .filter(
        (u) =>
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.bio.toLowerCase().includes(q)
      )
      .map((u) => toPublicUser(u, viewerId));

    const posts = db.posts
      .filter(
        (p) =>
          p.status === 'published' &&
          !blockedIds.has(p.authorId) &&
          (p.type as string) !== 'descoberta' &&
          (p.category as string) !== 'Descobertas'
      )
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          (p.subtitle || '').toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.reviewMeta?.workTitle || '').toLowerCase().includes(q) ||
          (p.reviewMeta?.creator || '').toLowerCase().includes(q)
      )
      .map((p) => enrichPost(p, viewerId));

    const cultural = db.culturalItems.filter(
      (c) =>
        !blockedIds.has(c.userId) &&
        (!q ||
          c.title.toLowerCase().includes(q) ||
          c.creator.toLowerCase().includes(q) ||
          c.review.toLowerCase().includes(q) ||
          c.listName.toLowerCase().includes(q))
    );

    const shelves = db.shelves
      .filter(
        (s) =>
          s.isPublic &&
          !blockedIds.has(s.userId) &&
          (!q ||
            s.title.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.items.some((i) => i.title.toLowerCase().includes(q)))
      )
      .map((s) => {
        const owner = db.users.find((u) => u.id === s.userId);
        return {
          ...s,
          ownerName: owner?.displayName || '',
          ownerUsername: owner?.username || '',
        };
      });

    res.json({ users, posts, cultural, shelves });
  });

  app.get('/api/explore', (req: AuthRequest, res) => {
    const db = getDb();
    const viewerId = req.userId || null;
    const blockedIds = viewerId
      ? new Set(db.blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId))
      : new Set<string>();

    const popularPosts = db.posts
      .filter(
        (p) =>
          p.status === 'published' &&
          !blockedIds.has(p.authorId) &&
          (p.type as string) !== 'descoberta' &&
          (p.category as string) !== 'Descobertas'
      )
      .map((p) => enrichPost(p, viewerId))
      .sort((a, b) => b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount))
      .slice(0, 8);

    const recommendedAuthors = db.users
      .filter((u) => u.id !== viewerId && !blockedIds.has(u.id))
      .map((u) => toPublicUser(u, viewerId));

    const publicShelves = db.shelves
      .filter((s) => s.isPublic && s.items.length > 0 && !blockedIds.has(s.userId))
      .map((s) => {
        const owner = db.users.find((u) => u.id === s.userId);
        return { ...s, ownerName: owner?.displayName || '', ownerUsername: owner?.username || '' };
      })
      .slice(0, 6);

    const culturalHighlights = db.culturalItems
      .filter((c) => c.rating >= 4 && !blockedIds.has(c.userId))
      .slice(0, 6);

    res.json({ popularPosts, recommendedAuthors, publicShelves, culturalHighlights });
  });

  // ---------------- MÓDULO 1: NOTÍCIAS (RSS 30-MIN SYNC) ----------------
  app.get('/api/news', async (req, res) => {
    ensureNewsLoaded();
    const current = getNewsSnapshot();
    const isStale =
      !current.lastSyncedAt ||
      Date.now() - new Date(current.lastSyncedAt).getTime() > 30 * 60 * 1000;
    if (IS_VERCEL && (current.articles.length === 0 || isStale)) {
      await Promise.race([
        syncAllNews().catch(() => null),
        new Promise((resolve) => setTimeout(resolve, 4500)),
      ]);
    }
    const { source, category, q } = req.query as Record<string, string>;
    res.json(getNewsSnapshot({ source, category, q }));
  });

  app.post('/api/news/sync', async (_req, res) => {
    const snapshot = await syncAllNews();
    res.json(snapshot);
  });

  app.get('/api/news/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const unsubscribe = subscribeNewsUpdates((payload) => {
      res.write(`event: news_synced\ndata: ${JSON.stringify(payload)}\n\n`);
    });

    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  // ---------------- MÓDULO 2 & 3: SPOTIFY & BIBLIOTECA MUSICAL ----------------
  function getSpotifySessionKey(req: AuthRequest): string {
    return req.userId || `anon_${req.ip || 'guest'}`;
  }

  app.get('/api/spotify/status', (req: AuthRequest, res) => {
    res.json(getUserSpotifyStatus(getSpotifySessionKey(req)));
  });

  app.get('/api/spotify/auth-url', requireAuth, (req: AuthRequest, res) => {
    const url = buildSpotifyAuthUrl(getSpotifySessionKey(req));
    if (!url) {
      res.status(400).json({
        error: 'Spotify OAuth não configurado. Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no ambiente do servidor.',
      });
      return;
    }
    res.json({ url });
  });

  const spotifyCallbackHandler = async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error || !code || !state) {
      res.status(400).send(`
        <html><body style="font-family:sans-serif;padding:24px;">
          <h3>Autorização do Spotify cancelada ou inválida</h3>
          <p>${error || 'Parâmetros ausentes.'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'SPOTIFY_OAUTH_ERROR', error: ${JSON.stringify(error || 'Autorização cancelada')} }, '*');
              window.close();
            }
          </script>
        </body></html>
      `);
      return;
    }

    const sessionKey = resolvePendingState(state);
    if (!sessionKey) {
      res.status(400).send('<p>Estado OAuth inválido ou expirado. Feche esta janela e tente novamente.</p>');
      return;
    }

    try {
      await exchangeSpotifyCode(code, sessionKey);
      res.send(`
        <html>
          <body style="font-family:sans-serif;padding:24px;background:#FBF9F5;color:#1C1917;">
            <p>Conta Spotify conectada à Thinklive. Esta janela será fechada automaticamente.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'SPOTIFY_OAUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar Spotify';
      res.status(500).send(`
        <html><body style="font-family:sans-serif;padding:24px;">
          <p>${msg}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'SPOTIFY_OAUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
              window.close();
            }
          </script>
        </body></html>
      `);
    }
  };

  app.get(['/api/spotify/callback', '/api/spotify/callback/'], spotifyCallbackHandler);

  app.post('/api/spotify/disconnect', requireAuth, (req: AuthRequest, res) => {
    disconnectSpotifySession(getSpotifySessionKey(req));
    res.json({ ok: true });
  });

  app.get('/api/spotify/search', async (req: AuthRequest, res) => {
    const q = String(req.query.q || '').trim();
    const rawType = String(req.query.type || 'track,artist,album,playlist');
    if (!q) {
      res.json({ tracks: [], artists: [], albums: [], playlists: [] });
      return;
    }
    const allowed = ['track', 'artist', 'album', 'playlist'] as const;
    const types = rawType
      .split(',')
      .map((t) => t.trim())
      .filter((t): t is (typeof allowed)[number] => (allowed as readonly string[]).includes(t));

    try {
      const results = await searchSpotifyCatalog(
        q,
        types.length > 0 ? types : ['track', 'artist', 'album', 'playlist'],
        getSpotifySessionKey(req)
      );
      res.json(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao pesquisar no Spotify.';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/spotify/discoveries', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getSpotifyPersonalDiscoveries(getSpotifySessionKey(req));
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao carregar descobertas do Spotify.' });
    }
  });

  // Profile Music Library ("Minha biblioteca musical")
  app.get('/api/music-library', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (!user.musicLibrary) user.musicLibrary = makeDefaultMusicLibrary();
    res.json({ musicLibrary: user.musicLibrary });
  });

  app.patch('/api/music-library', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const current = user.musicLibrary || makeDefaultMusicLibrary();
    const body = req.body as Partial<MusicLibrary> & {
      addArtist?: SpotifyItemRef;
      removeArtistId?: string;
      addAlbum?: SpotifyItemRef;
      removeAlbumId?: string;
      addPlaylist?: SpotifyItemRef;
      removePlaylistId?: string;
    };

    if (body.favoriteTrack !== undefined) current.favoriteTrack = body.favoriteTrack;
    if (body.addArtist) {
      if (!current.favoriteArtists.some((a) => a.id === body.addArtist!.id)) {
        current.favoriteArtists.unshift(body.addArtist);
      }
    }
    if (body.removeArtistId) {
      current.favoriteArtists = current.favoriteArtists.filter((a) => a.id !== body.removeArtistId);
    }
    if (body.addAlbum) {
      if (!current.favoriteAlbums.some((a) => a.id === body.addAlbum!.id)) {
        current.favoriteAlbums.unshift(body.addAlbum);
      }
    }
    if (body.removeAlbumId) {
      current.favoriteAlbums = current.favoriteAlbums.filter((a) => a.id !== body.removeAlbumId);
    }
    if (body.addPlaylist) {
      if (!current.playlists.some((p) => p.id === body.addPlaylist!.id)) {
        current.playlists.unshift(body.addPlaylist);
      }
    }
    if (body.removePlaylistId) {
      current.playlists = current.playlists.filter((p) => p.id !== body.removePlaylistId);
    }

    user.musicLibrary = current;
    saveDb();
    res.json({ musicLibrary: current, user: toPublicUser(user, user.id) });
  });

  app.post('/api/music-library/collections', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (!user.musicLibrary) user.musicLibrary = makeDefaultMusicLibrary();
    const { name, description, initialItem } = req.body as {
      name?: string;
      description?: string;
      initialItem?: SpotifyItemRef;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: 'Informe um nome para a coleção musical.' });
      return;
    }
    const newCol = {
      id: makeId('mcol'),
      name: name.trim(),
      description: (description || '').trim(),
      items: initialItem ? [initialItem] : [],
      createdAt: new Date().toISOString(),
    };
    user.musicLibrary.collections.unshift(newCol);
    saveDb();
    res.status(201).json({ musicLibrary: user.musicLibrary, collection: newCol });
  });

  app.post('/api/music-library/collections/:id/items', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (!user.musicLibrary) user.musicLibrary = makeDefaultMusicLibrary();
    const col = user.musicLibrary.collections.find((c) => c.id === req.params.id);
    if (!col) {
      res.status(404).json({ error: 'Coleção musical não encontrada.' });
      return;
    }
    const item = req.body as SpotifyItemRef;
    if (!item?.id || !item?.name) {
      res.status(400).json({ error: 'Item musical inválido.' });
      return;
    }
    if (!col.items.some((i) => i.id === item.id)) {
      col.items.unshift(item);
      saveDb();
    }
    res.json({ musicLibrary: user.musicLibrary });
  });

  app.delete('/api/music-library/collections/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.userId);
    if (!user || !user.musicLibrary) {
      res.status(404).json({ error: 'Coleção não encontrada.' });
      return;
    }
    user.musicLibrary.collections = user.musicLibrary.collections.filter((c) => c.id !== req.params.id);
    saveDb();
    res.json({ musicLibrary: user.musicLibrary });
  });

  // ---------------- CATÁLOGO DE FILMES, SÉRIES E LIVROS (APIs REAIS + AVALIAÇÕES) ----------------
  app.get('/api/catalog/movies', async (req, res) => {
    try {
      const { kind, genre, year, sort, q } = req.query as Record<string, string | undefined>;
      if (q && q.trim()) {
        const result = await searchMoviesSeries({ q: q.trim(), kind, genre, year, sort });
        res.json({
          provider: result.provider,
          featuredReleases: [],
          suggestions: [],
          items: result.items,
          genres: [],
        });
        return;
      }
      const result = await discoverMoviesSeries({ kind, genre, year, sort });
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Não foi possível carregar o catálogo de filmes e séries.',
      });
    }
  });

  app.get('/api/catalog/books', async (req, res) => {
    try {
      const { genre, sort, q, mode } = req.query as Record<string, string | undefined>;
      if (q && q.trim()) {
        const searchMode = mode === 'title' || mode === 'author' ? mode : 'all';
        const result = await searchBooks({ q: q.trim(), mode: searchMode, genre, sort });
        res.json({
          provider: result.provider,
          featured: [],
          items: result.items,
          genres: [],
        });
        return;
      }
      const result = await discoverBooks({ genre, sort });
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Não foi possível carregar a biblioteca de livros.',
      });
    }
  });

  app.get('/api/catalog/work/:workId', async (req: AuthRequest, res) => {
    try {
      const workId = String(req.params.workId);
      let work = await resolveCatalogWork(workId);
      const db = getDb();

      // Fallback from persisted snapshot if external API temporarily unavailable
      if (!work) {
        const snap =
          db.mediaReviews.find((r) => r.workId === workId)?.workSnapshot ||
          db.mediaShelfEntries.find((s) => s.workId === workId)?.workSnapshot;
        if (snap) {
          const stats = getWorkCommunityStats(workId);
          work = {
            ...snap,
            sourceProvider: workId.startsWith('ol_') ? 'open_library' : 'imdb_tvmaze',
            synopsis: 'Sinopse indisponível no momento.',
            popularityScore: 10,
            communityAverage: stats.average,
            communityReviewCount: stats.count,
          };
        }
      }

      if (!work) {
        res.status(404).json({ error: 'Obra não encontrada.' });
        return;
      }

      const reviews = getWorkReviewsEnriched(workId, req.userId);
      const comments = getWorkCommentsEnriched(workId, req.userId);
      const myReview = req.userId
        ? reviews.find((r) => r.userId === req.userId) || null
        : null;
      const normalizeBookKey = (title?: string, creator?: string) => {
        const clean = (v?: string) =>
          (v || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
        const t = clean(title);
        const c = clean(creator);
        return t ? `${t}::${c}` : '';
      };

      const targetBookKey =
        work.mediaKind === 'livro' ? normalizeBookKey(work.title, work.creator) : '';

      const myShelf = req.userId
        ? db.mediaShelfEntries.find(
            (s) =>
              s.userId === req.userId &&
              (s.workId === workId ||
                (work.mediaKind === 'livro' &&
                  s.mediaKind === 'livro' &&
                  targetBookKey &&
                  normalizeBookKey(s.workSnapshot?.title, s.workSnapshot?.creator) === targetBookKey))
          ) || null
        : null;

      res.json({ work, reviews, comments, myReview, myShelf });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Erro ao carregar detalhes da obra.',
      });
    }
  });

  app.post('/api/catalog/work/:workId/reviews', requireAuth, async (req: AuthRequest, res) => {
    const workId = String(req.params.workId);
    const { rating, review, workSnapshot } = req.body as {
      rating?: number;
      review?: string;
      workSnapshot?: CatalogWorkSnapshot;
    };

    const numRating = Number(rating);
    if (Number.isNaN(numRating) || numRating < 0 || numRating > 10) {
      res.status(400).json({ error: 'A nota deve estar entre 0 e 10.' });
      return;
    }

    const db = getDb();
    let snapshot: CatalogWorkSnapshot | undefined = workSnapshot;
    if (!snapshot || !snapshot.title) {
      const resolved = await resolveCatalogWork(workId);
      if (resolved) {
        snapshot = {
          id: resolved.id,
          mediaKind: resolved.mediaKind,
          title: resolved.title,
          creator: resolved.creator,
          year: resolved.year,
          coverUrl: resolved.coverUrl,
          genres: resolved.genres,
          ageRating: resolved.ageRating,
        };
      }
    }

    if (!snapshot) {
      res.status(400).json({ error: 'Dados da obra ausentes para salvar a avaliação.' });
      return;
    }

    const mediaKind: CatalogMediaKind = snapshot.mediaKind || inferMediaKindFromWorkId(workId);
    const roundedRating = Math.round(numRating * 10) / 10;
    const now = new Date().toISOString();

    const existing = db.mediaReviews.find((r) => r.workId === workId && r.userId === req.userId);
    if (existing) {
      existing.rating = roundedRating;
      existing.review = (review || '').trim();
      existing.workSnapshot = { ...snapshot, id: workId, mediaKind };
      existing.updatedAt = now;
    } else {
      db.mediaReviews.unshift({
        id: makeId('mrev'),
        workId,
        userId: req.userId!,
        mediaKind,
        rating: roundedRating,
        review: (review || '').trim(),
        workSnapshot: { ...snapshot, id: workId, mediaKind },
        createdAt: now,
        updatedAt: now,
      });
    }

    saveDb();
    const reviews = getWorkReviewsEnriched(workId, req.userId);
    const myReview = reviews.find((r) => r.userId === req.userId) || null;
    const stats = getWorkCommunityStats(workId);
    res.json({
      reviews,
      myReview,
      communityAverage: stats.average,
      communityReviewCount: stats.count,
    });
  });

  app.delete('/api/catalog/work/:workId/reviews', requireAuth, (req: AuthRequest, res) => {
    const workId = String(req.params.workId);
    const db = getDb();
    const before = db.mediaReviews.length;
    db.mediaReviews = db.mediaReviews.filter((r) => !(r.workId === workId && r.userId === req.userId));
    if (db.mediaReviews.length !== before) {
      saveDb();
    }
    const reviews = getWorkReviewsEnriched(workId, req.userId);
    const stats = getWorkCommunityStats(workId);
    res.json({
      reviews,
      myReview: null,
      communityAverage: stats.average,
      communityReviewCount: stats.count,
    });
  });

  app.post('/api/catalog/work/:workId/comments', requireAuth, (req: AuthRequest, res) => {
    const workId = String(req.params.workId);
    const { content, mediaKind } = req.body as { content?: string; mediaKind?: CatalogMediaKind };
    if (!content?.trim()) {
      res.status(400).json({ error: 'Escreva um comentário antes de enviar.' });
      return;
    }

    const db = getDb();
    db.mediaComments.push({
      id: makeId('mcom'),
      workId,
      userId: req.userId!,
      mediaKind: inferMediaKindFromWorkId(workId, mediaKind),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    saveDb();
    res.status(201).json({ comments: getWorkCommentsEnriched(workId, req.userId) });
  });

  app.delete('/api/catalog/comments/:commentId', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const comment = db.mediaComments.find((c) => c.id === req.params.commentId);
    if (!comment) {
      res.status(404).json({ error: 'Comentário não encontrado.' });
      return;
    }
    if (comment.userId !== req.userId) {
      res.status(403).json({ error: 'Você só pode excluir seus próprios comentários.' });
      return;
    }
    const workId = comment.workId;
    db.mediaComments = db.mediaComments.filter((c) => c.id !== comment.id);
    saveDb();
    res.json({ comments: getWorkCommentsEnriched(workId, req.userId) });
  });

  app.put('/api/catalog/work/:workId/shelf', requireAuth, async (req: AuthRequest, res) => {
    const workId = String(req.params.workId);
    const { status, isFavorite, workSnapshot } = req.body as {
      status?: MediaShelfStatus | null;
      isFavorite?: boolean;
      workSnapshot?: CatalogWorkSnapshot;
    };

    const allowedStatuses = new Set<string>([
      'quero_assistir',
      'ja_assistido',
      'quero_ler',
      'lendo',
      'ja_li',
      'abandonado',
    ]);
    if (status !== undefined && status !== null && !allowedStatuses.has(status)) {
      res.status(400).json({ error: 'Categoria de estante inválida.' });
      return;
    }

    const db = getDb();
    let snapshot = workSnapshot;
    const directExisting = db.mediaShelfEntries.find(
      (s) => s.workId === workId && s.userId === req.userId
    );
    if (!snapshot || !snapshot.title) {
      snapshot = directExisting?.workSnapshot;
    }
    if (!snapshot || !snapshot.title) {
      const resolved = await resolveCatalogWork(workId);
      if (resolved) {
        snapshot = {
          id: resolved.id,
          mediaKind: resolved.mediaKind,
          title: resolved.title,
          creator: resolved.creator,
          year: resolved.year,
          coverUrl: resolved.coverUrl,
          genres: resolved.genres,
          ageRating: resolved.ageRating,
        };
      }
    }

    const cleanNorm = (v?: string) =>
      (v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const incomingKind = snapshot?.mediaKind || inferMediaKindFromWorkId(workId);
    const incomingBookKey =
      incomingKind === 'livro' && snapshot?.title
        ? `${cleanNorm(snapshot.title)}::${cleanNorm(snapshot.creator)}`
        : '';

    const isMatchingEntry = (s: (typeof db.mediaShelfEntries)[number]) => {
      if (s.userId !== req.userId) return false;
      if (s.workId === workId) return true;
      if (incomingBookKey && s.mediaKind === 'livro' && s.workSnapshot?.title) {
        const entryKey = `${cleanNorm(s.workSnapshot.title)}::${cleanNorm(s.workSnapshot.creator)}`;
        return entryKey === incomingBookKey;
      }
      return false;
    };

    const matchingEntries = db.mediaShelfEntries.filter(isMatchingEntry);
    const existing =
      matchingEntries.find((s) => s.workId === workId) || matchingEntries[0] || null;

    const nextStatus = status !== undefined ? status : existing?.status ?? null;
    const nextFavorite = isFavorite !== undefined ? Boolean(isFavorite) : existing?.isFavorite ?? false;

    if (!nextStatus && !nextFavorite) {
      if (matchingEntries.length > 0) {
        db.mediaShelfEntries = db.mediaShelfEntries.filter((s) => !isMatchingEntry(s));
        saveDb();
      }
      res.json({ myShelf: null });
      return;
    }

    if (!snapshot) {
      snapshot = existing?.workSnapshot;
    }
    if (!snapshot) {
      res.status(400).json({ error: 'Dados da obra ausentes para atualizar a estante.' });
      return;
    }

    const mediaKind = snapshot.mediaKind || inferMediaKindFromWorkId(workId);
    const now = new Date().toISOString();

    // Remove any duplicate entries for the same work/book before updating or inserting
    if (matchingEntries.length > 0) {
      db.mediaShelfEntries = db.mediaShelfEntries.filter((s) => !isMatchingEntry(s));
    }

    const updatedEntry = {
      id: existing?.id || makeId('mshelf'),
      userId: req.userId!,
      workId: existing?.workId || workId,
      mediaKind,
      status: nextStatus,
      isFavorite: nextFavorite,
      workSnapshot: { ...snapshot, id: existing?.workId || workId, mediaKind },
      updatedAt: now,
    };

    db.mediaShelfEntries.unshift(updatedEntry);
    saveDb();
    res.json({ myShelf: updatedEntry });
  });

  app.get('/api/catalog/my-library', requireAuth, (req: AuthRequest, res) => {
    const library = getUserMediaLibrary(req.userId!, req.userId);
    res.json(library);
  });

  // ---------------- DIÁRIO (PRIVADO / PÚBLICO COM CONTROLE DE ACESSO REAL) ----------------
  app.get('/api/diary/public', (req: AuthRequest, res) => {
    const db = getDb();
    const viewerId = req.userId || null;
    const blockedIds = viewerId
      ? new Set(db.blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId))
      : new Set<string>();
    const sort = String(req.query.sort || 'newest');
    const q = String(req.query.q || '').trim().toLowerCase();
    const month = String(req.query.month || '').trim();

    let entries = db.diaryEntries.filter((e) => e.visibility === 'public' && !blockedIds.has(e.userId));
    if (q) {
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          (e.mood || '').toLowerCase().includes(q)
      );
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      entries = entries.filter((e) => e.createdAt.startsWith(month));
    }
    entries.sort((a, b) =>
      sort === 'oldest'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ entries: entries.map((e) => enrichDiaryEntry(e, viewerId)) });
  });

  app.get('/api/diary/mine', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const sort = String(req.query.sort || 'newest');
    const visibility = String(req.query.visibility || 'all');
    const q = String(req.query.q || '').trim().toLowerCase();
    const month = String(req.query.month || '').trim();

    let entries = db.diaryEntries.filter((e) => e.userId === req.userId);
    if (visibility === 'private' || visibility === 'public') {
      entries = entries.filter((e) => e.visibility === visibility);
    }
    if (q) {
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          (e.mood || '').toLowerCase().includes(q)
      );
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      entries = entries.filter((e) => e.createdAt.startsWith(month));
    }
    entries.sort((a, b) =>
      sort === 'oldest'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ entries: entries.map((e) => enrichDiaryEntry(e, req.userId)) });
  });

  app.get('/api/diary/:id', (req: AuthRequest, res) => {
    const db = getDb();
    const entry = db.diaryEntries.find((e) => e.id === req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Registro não encontrado.' });
      return;
    }
    if (entry.visibility === 'private' && entry.userId !== req.userId) {
      res.status(403).json({ error: 'Este pensamento é privado e visível apenas para o autor.' });
      return;
    }
    res.json({ entry: enrichDiaryEntry(entry, req.userId) });
  });

  app.post('/api/diary', requireAuth, (req: AuthRequest, res) => {
    const { title, content, visibility, mood } = req.body as {
      title?: string;
      content?: string;
      visibility?: DiaryVisibility;
      mood?: string;
    };
    if (!title?.trim() && !content?.trim()) {
      res.status(400).json({ error: 'Escreva um título ou texto para salvar no diário.' });
      return;
    }
    const now = new Date().toISOString();
    const entry: DiaryEntry = {
      id: makeId('diary'),
      userId: req.userId!,
      title: (title || 'Pensamento do dia').trim(),
      content: (content || '').trim(),
      visibility: visibility === 'public' ? 'public' : 'private',
      mood: (mood || '').trim().slice(0, 32) || undefined,
      createdAt: now,
      updatedAt: now,
    };
    const db = getDb();
    db.diaryEntries.unshift(entry);
    saveDb();
    res.status(201).json({ entry: enrichDiaryEntry(entry, req.userId) });
  });

  app.patch('/api/diary/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const entry = db.diaryEntries.find((e) => e.id === req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Registro não encontrado.' });
      return;
    }
    if (entry.userId !== req.userId) {
      res.status(403).json({ error: 'Você só pode editar seus próprios registros do diário.' });
      return;
    }
    const { title, content, visibility, mood } = req.body as Partial<DiaryEntry>;
    if (title !== undefined) entry.title = title.trim() || 'Pensamento do dia';
    if (content !== undefined) entry.content = content.trim();
    if (visibility === 'private' || visibility === 'public') entry.visibility = visibility;
    if (mood !== undefined) entry.mood = mood.trim().slice(0, 32) || undefined;
    entry.updatedAt = new Date().toISOString();
    saveDb();
    res.json({ entry: enrichDiaryEntry(entry, req.userId) });
  });

  app.delete('/api/diary/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const entry = db.diaryEntries.find((e) => e.id === req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Registro não encontrado.' });
      return;
    }
    if (entry.userId !== req.userId) {
      res.status(403).json({ error: 'Você só pode excluir seus próprios registros do diário.' });
      return;
    }
    db.diaryEntries = db.diaryEntries.filter((e) => e.id !== entry.id);
    db.diaryLikes = db.diaryLikes.filter((l) => l.entryId !== entry.id);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/diary/:id/like', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const entry = db.diaryEntries.find((e) => e.id === req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Registro não encontrado.' });
      return;
    }
    if (entry.visibility === 'private' && entry.userId !== req.userId) {
      res.status(403).json({ error: 'Acesso negado a pensamento privado.' });
      return;
    }
    const idx = db.diaryLikes.findIndex((l) => l.entryId === entry.id && l.userId === req.userId);
    if (idx >= 0) db.diaryLikes.splice(idx, 1);
    else db.diaryLikes.push({ userId: req.userId!, entryId: entry.id, createdAt: new Date().toISOString() });
    saveDb();
    res.json({ entry: enrichDiaryEntry(entry, req.userId) });
  });

  // ---------------- PODCASTS (RSS REAIS, PREFERÊNCIAS, FAVORITOS & PROGRESSO) ----------------
  app.get('/api/podcasts/catalog', async (req: AuthRequest, res) => {
    try {
      const genreParam = String(req.query.genre || '').trim() as PodcastGenre | '';
      const q = String(req.query.q || '').trim();
      const validGenre = PODCAST_GENRES.includes(genreParam as PodcastGenre)
        ? (genreParam as PodcastGenre)
        : undefined;

      const items = q
        ? await searchPodcastCatalog(q, validGenre)
        : (await getPodcastCatalog()).filter((e) => !validGenre || e.genre === validGenre);

      const allCached = await getPodcastCatalog();
      const recent = allCached.slice(0, 12);

      let userState = null;
      let recommended = allCached.slice(0, 8);
      if (req.userId) {
        userState = getOrCreatePodcastState(req.userId);
        if (userState.favoriteGenres.length > 0) {
          const prefSet = new Set(userState.favoriteGenres);
          const matched = allCached.filter((e) => prefSet.has(e.genre));
          if (matched.length > 0) recommended = matched.slice(0, 10);
        }
      }

      res.json({
        genres: PODCAST_GENRES,
        items,
        recent,
        recommended,
        userState,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erro ao carregar catálogo de podcasts.',
      });
    }
  });

  app.put('/api/podcasts/preferences', requireAuth, (req: AuthRequest, res) => {
    const { favoriteGenres } = req.body as { favoriteGenres?: PodcastGenre[] };
    const state = getOrCreatePodcastState(req.userId!);
    const valid = Array.isArray(favoriteGenres)
      ? favoriteGenres.filter((g) => PODCAST_GENRES.includes(g))
      : [];
    state.favoriteGenres = Array.from(new Set(valid));
    saveDb();
    res.json({ userState: state });
  });

  app.post('/api/podcasts/favorites', requireAuth, (req: AuthRequest, res) => {
    const { episode } = req.body as { episode?: PodcastEpisode };
    if (!episode?.id) {
      res.status(400).json({ error: 'Episódio inválido.' });
      return;
    }
    const state = getOrCreatePodcastState(req.userId!);
    const exists = state.favoriteEpisodeIds.includes(episode.id);
    if (exists) {
      state.favoriteEpisodeIds = state.favoriteEpisodeIds.filter((id) => id !== episode.id);
      state.favoriteEpisodes = state.favoriteEpisodes.filter((e) => e.id !== episode.id);
    } else {
      state.favoriteEpisodeIds.unshift(episode.id);
      state.favoriteEpisodes = [episode, ...state.favoriteEpisodes.filter((e) => e.id !== episode.id)];
    }
    saveDb();
    res.json({ userState: state, isFavorite: !exists });
  });

  app.put('/api/podcasts/progress', requireAuth, (req: AuthRequest, res) => {
    const { episodeId, positionSec, durationSec, episodeSnapshot } = req.body as {
      episodeId?: string;
      positionSec?: number;
      durationSec?: number;
      episodeSnapshot?: PodcastEpisode;
    };
    if (!episodeId || typeof positionSec !== 'number') {
      res.status(400).json({ error: 'Dados de progresso inválidos.' });
      return;
    }
    const state = getOrCreatePodcastState(req.userId!);
    const safePos = Math.max(0, Math.floor(positionSec));
    const safeDur = Math.max(safePos, Math.floor(durationSec || episodeSnapshot?.durationSec || 0));
    state.progressMap[episodeId] = {
      episodeId,
      positionSec: safePos,
      durationSec: safeDur,
      updatedAt: new Date().toISOString(),
      episodeSnapshot: episodeSnapshot || state.progressMap[episodeId]?.episodeSnapshot,
    };
    saveDb();
    res.json({ userState: state });
  });

  app.get('/api/podcasts/stream', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl || (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://'))) {
      res.status(400).json({ error: 'URL de áudio inválida.' });
      return;
    }
    try {
      const parsed = new URL(rawUrl);
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.')
      ) {
        res.status(403).json({ error: 'Destino não permitido.' });
        return;
      }

      const headers: Record<string, string> = {
        'User-Agent': 'ThinkliveAudioPlayer/1.0',
      };
      if (req.headers.range) headers['Range'] = String(req.headers.range);

      const upstream = await fetch(rawUrl, { headers, redirect: 'follow' });
      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status).end();
        return;
      }

      res.status(upstream.status);
      const copyHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
      for (const h of copyHeaders) {
        const val = upstream.headers.get(h);
        if (val) res.setHeader(h, val);
      }
      if (!upstream.headers.get('content-type')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }

      if (!upstream.body) {
        res.end();
        return;
      }
      const reader = upstream.body.getReader();
      req.on('close', () => {
        reader.cancel().catch(() => {});
      });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
      res.end();
    } catch {
      res.status(502).end();
    }
  });

  // ---------------- ARTE E CULTURA (ACERVOS CC0 & DOMÍNIO PÚBLICO) ----------------
  const artImageCache = new Map<string, { contentType: string; buf: Buffer }>();

  app.get('/api/art-culture', async (req, res) => {
    try {
      const theme = String(req.query.theme || '').trim();
      const q = String(req.query.q || '').trim().toLowerCase();
      let items = await getArtCultureCatalog();
      if (theme && theme !== 'Todos') {
        items = items.filter((i) => i.theme === theme);
      }
      if (q) {
        items = items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.artistOrAuthor.toLowerCase().includes(q) ||
            i.summary.toLowerCase().includes(q) ||
            i.curiosityOrExcerpt.toLowerCase().includes(q) ||
            (i.movementOrContext || '').toLowerCase().includes(q)
        );
      }
      res.json({ themes: ART_CULTURE_THEMES, items });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erro ao carregar acervo cultural.',
      });
    }
  });

  app.get('/api/art-culture/image', async (req, res) => {
    const imageId = String(req.query.imageId || '').trim();
    if (!imageId || !/^[a-zA-Z0-9_-]+$/.test(imageId)) {
      res.status(400).end();
      return;
    }
    const cached = artImageCache.get(imageId);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(cached.buf);
      return;
    }
    try {
      const iiifUrl = `https://www.artic.edu/iiif/2/${encodeURIComponent(imageId)}/full/843,/0/default.jpg`;
      const upstream = await fetch(iiifUrl, {
        headers: { 'User-Agent': 'ThinkliveMuseumGallery/1.0' },
      });
      if (!upstream.ok) {
        res.status(404).end();
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      if (artImageCache.size > 60) {
        const firstKey = artImageCache.keys().next().value;
        if (firstKey) artImageCache.delete(firstKey);
      }
      artImageCache.set(imageId, { contentType, buf });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buf);
    } catch {
      res.status(502).end();
    }
  });


  return app;
}
