import { SpotifyItemRef } from '../src/types/thinklive';

export interface SpotifyOAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  displayName?: string;
  spotifyUserId?: string;
  spotifyUrl?: string;
}

// Ephemeral in-memory stores ONLY (never persisted to disk, never exposed to client)
const oauthSessions = new Map<string, SpotifyOAuthSession>();
const pendingStates = new Map<string, { sessionKey: string; createdAt: number }>();

let clientCredentialsCache: { accessToken: string; expiresAt: number } | null = null;

export function getSpotifyConfig() {
  const clientId = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const redirectUri = `${appUrl}/api/spotify/callback`;
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

export function buildSpotifyAuthUrl(sessionKey: string): string | null {
  const cfg = getSpotifyConfig();
  if (!cfg.configured) return null;

  const state = `${sessionKey}_${Math.random().toString(36).slice(2, 12)}`;
  pendingStates.set(state, { sessionKey, createdAt: Date.now() });

  // Clean expired pending states (> 15 min)
  for (const [k, v] of pendingStates.entries()) {
    if (Date.now() - v.createdAt > 15 * 60 * 1000) pendingStates.delete(k);
  }

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: cfg.redirectUri,
    state,
    scope: 'user-read-private user-top-read playlist-read-private playlist-read-collaborative',
    show_dialog: 'true',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function resolvePendingState(state: string): string | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  return entry.sessionKey;
}

export async function exchangeSpotifyCode(code: string, sessionKey: string): Promise<SpotifyOAuthSession> {
  const cfg = getSpotifyConfig();
  if (!cfg.configured) {
    throw new Error('Credenciais do Spotify não configuradas no servidor.');
  }

  const basicAuth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
  });

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Falha ao autenticar no Spotify: ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // Fetch public display profile without storing personal credentials on disk
  let displayName = 'Conta Spotify conectada';
  let spotifyUserId = '';
  let spotifyUrl = '';
  try {
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        id: string;
        display_name?: string;
        external_urls?: { spotify?: string };
      };
      displayName = me.display_name || me.id;
      spotifyUserId = me.id;
      spotifyUrl = me.external_urls?.spotify || '';
    }
  } catch {
    // ignore profile read failure
  }

  const session: SpotifyOAuthSession = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000,
    displayName,
    spotifyUserId,
    spotifyUrl,
  };

  oauthSessions.set(sessionKey, session);
  return session;
}

async function refreshUserSession(sessionKey: string, session: SpotifyOAuthSession): Promise<string | null> {
  if (!session.refreshToken) return null;
  const cfg = getSpotifyConfig();
  if (!cfg.configured) return null;

  const basicAuth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    oauthSessions.delete(sessionKey);
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  session.accessToken = data.access_token;
  session.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  if (data.refresh_token) session.refreshToken = data.refresh_token;
  oauthSessions.set(sessionKey, session);
  return session.accessToken;
}

export async function getUserSpotifyToken(sessionKey: string): Promise<string | null> {
  const session = oauthSessions.get(sessionKey);
  if (!session) return null;
  if (Date.now() < session.expiresAt) return session.accessToken;
  return refreshUserSession(sessionKey, session);
}

export function getUserSpotifyStatus(sessionKey: string) {
  const cfg = getSpotifyConfig();
  const session = oauthSessions.get(sessionKey);
  return {
    configured: cfg.configured,
    redirectUri: cfg.redirectUri,
    connected: Boolean(session),
    account: session
      ? {
          displayName: session.displayName,
          spotifyUserId: session.spotifyUserId,
          spotifyUrl: session.spotifyUrl,
        }
      : null,
  };
}

export function disconnectSpotifySession(sessionKey: string) {
  oauthSessions.delete(sessionKey);
}

async function getClientCredentialsToken(): Promise<string | null> {
  const cfg = getSpotifyConfig();
  if (!cfg.configured) return null;

  if (clientCredentialsCache && Date.now() < clientCredentialsCache.expiresAt) {
    return clientCredentialsCache.accessToken;
  }

  const basicAuth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
  clientCredentialsCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return clientCredentialsCache.accessToken;
}

function mapTrack(t: any): SpotifyItemRef {
  return {
    id: t.id,
    type: 'track',
    name: t.name,
    subtitle: `${(t.artists || []).map((a: any) => a.name).join(', ')}${t.album?.name ? ` · ${t.album.name}` : ''}`,
    imageUrl: t.album?.images?.[0]?.url || '',
    spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
    embedUrl: `https://open.spotify.com/embed/track/${t.id}?utm_source=generator`,
    durationMs: t.duration_ms,
    releaseDate: t.album?.release_date,
  };
}

function mapArtist(a: any): SpotifyItemRef {
  return {
    id: a.id,
    type: 'artist',
    name: a.name,
    subtitle: (a.genres || []).slice(0, 2).join(' · ') || 'Artista no Spotify',
    imageUrl: a.images?.[0]?.url || '',
    spotifyUrl: a.external_urls?.spotify || `https://open.spotify.com/artist/${a.id}`,
    embedUrl: `https://open.spotify.com/embed/artist/${a.id}?utm_source=generator`,
  };
}

function mapAlbum(al: any): SpotifyItemRef {
  return {
    id: al.id,
    type: 'album',
    name: al.name,
    subtitle: `${(al.artists || []).map((a: any) => a.name).join(', ')}${al.release_date ? ` · ${al.release_date.slice(0, 4)}` : ''}`,
    imageUrl: al.images?.[0]?.url || '',
    spotifyUrl: al.external_urls?.spotify || `https://open.spotify.com/album/${al.id}`,
    embedUrl: `https://open.spotify.com/embed/album/${al.id}?utm_source=generator`,
    releaseDate: al.release_date,
  };
}

function mapPlaylist(pl: any): SpotifyItemRef {
  return {
    id: pl.id,
    type: 'playlist',
    name: pl.name,
    subtitle: pl.owner?.display_name ? `Por ${pl.owner.display_name}` : 'Playlist no Spotify',
    imageUrl: pl.images?.[0]?.url || '',
    spotifyUrl: pl.external_urls?.spotify || `https://open.spotify.com/playlist/${pl.id}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${pl.id}?utm_source=generator`,
  };
}

export async function searchSpotifyCatalog(
  query: string,
  types: ('track' | 'artist' | 'album' | 'playlist')[],
  sessionKey: string
) {
  const token = (await getUserSpotifyToken(sessionKey)) || (await getClientCredentialsToken());
  if (!token) {
    throw new Error('Spotify Web API não configurada. Adicione SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET.');
  }

  const sp = new URLSearchParams({
    q: query,
    type: types.join(','),
    limit: '8',
    market: 'BR',
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro na pesquisa do Spotify (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as any;
  return {
    tracks: (data.tracks?.items || []).filter(Boolean).map(mapTrack),
    artists: (data.artists?.items || []).filter(Boolean).map(mapArtist),
    albums: (data.albums?.items || []).filter(Boolean).map(mapAlbum),
    playlists: (data.playlists?.items || []).filter(Boolean).map(mapPlaylist),
  };
}

export async function getSpotifyPersonalDiscoveries(sessionKey: string) {
  const token = await getUserSpotifyToken(sessionKey);
  if (!token) {
    return {
      connected: false,
      topTracks: [] as SpotifyItemRef[],
      topArtists: [] as SpotifyItemRef[],
      playlists: [] as SpotifyItemRef[],
    };
  }

  const [tracksRes, artistsRes, playlistsRes] = await Promise.all([
    fetch('https://api.spotify.com/v1/me/top/tracks?limit=8&time_range=medium_term', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch('https://api.spotify.com/v1/me/top/artists?limit=8&time_range=medium_term', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch('https://api.spotify.com/v1/me/playlists?limit=8', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const topTracks = tracksRes.ok ? (((await tracksRes.json()) as any).items || []).map(mapTrack) : [];
  const topArtists = artistsRes.ok ? (((await artistsRes.json()) as any).items || []).map(mapArtist) : [];
  const playlists = playlistsRes.ok ? (((await playlistsRes.json()) as any).items || []).filter(Boolean).map(mapPlaylist) : [];

  return {
    connected: true,
    topTracks,
    topArtists,
    playlists,
  };
}
