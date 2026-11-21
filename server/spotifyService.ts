import { SpotifyItemRef } from '../src/types/thinklive';

async function searchItunes(
  query: string,
  entity: 'song' | 'album' | 'musicArtist',
  limit = 8
): Promise<any[]> {
  try {
    const sp = new URLSearchParams({
      term: query,
      media: 'music',
      entity,
      country: 'BR',
      limit: String(limit),
    });
    const res = await fetch(`https://itunes.apple.com/search?${sp.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: any[] };
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

async function searchDeezer(
  query: string,
  kind: 'track' | 'album' | 'artist',
  limit = 8
): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search/${kind}?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: any[] };
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

function upscaleArtwork(url?: string): string {
  if (!url) return '';
  return url.replace(/100x100bb/g, '400x400bb');
}

function mapItunesTrack(item: any): SpotifyItemRef {
  return {
    id: `itunes_track_${item.trackId}`,
    type: 'track',
    name: item.trackName || 'Faixa sem título',
    subtitle: `${item.artistName || 'Artista'}${item.collectionName ? ` · ${item.collectionName}` : ''}`,
    imageUrl: upscaleArtwork(item.artworkUrl100 || item.artworkUrl60),
    spotifyUrl: item.trackViewUrl || item.collectionViewUrl || '',
    embedUrl: item.previewUrl || '',
    durationMs: item.trackTimeMillis,
    releaseDate: item.releaseDate ? String(item.releaseDate).slice(0, 10) : undefined,
  };
}

function mapItunesAlbum(item: any): SpotifyItemRef {
  return {
    id: `itunes_album_${item.collectionId}`,
    type: 'album',
    name: item.collectionName || 'Álbum sem título',
    subtitle: `${item.artistName || 'Artista'}${item.releaseDate ? ` · ${String(item.releaseDate).slice(0, 4)}` : ''}`,
    imageUrl: upscaleArtwork(item.artworkUrl100 || item.artworkUrl60),
    spotifyUrl: item.collectionViewUrl || '',
    embedUrl: '',
    releaseDate: item.releaseDate ? String(item.releaseDate).slice(0, 10) : undefined,
  };
}

function mapItunesArtist(item: any): SpotifyItemRef {
  return {
    id: `itunes_artist_${item.artistId}`,
    type: 'artist',
    name: item.artistName || 'Artista',
    subtitle: item.primaryGenreName || 'Música',
    imageUrl: '',
    spotifyUrl: item.artistLinkUrl || '',
    embedUrl: '',
  };
}

function mapDeezerTrack(item: any): SpotifyItemRef {
  return {
    id: `dz_track_${item.id}`,
    type: 'track',
    name: item.title || 'Faixa sem título',
    subtitle: `${item.artist?.name || 'Artista'}${item.album?.title ? ` · ${item.album.title}` : ''}`,
    imageUrl: item.album?.cover_medium || item.album?.cover || '',
    spotifyUrl: item.link || '',
    embedUrl: item.preview || '',
    durationMs: typeof item.duration === 'number' ? item.duration * 1000 : undefined,
  };
}

function mapDeezerAlbum(item: any): SpotifyItemRef {
  return {
    id: `dz_album_${item.id}`,
    type: 'album',
    name: item.title || 'Álbum sem título',
    subtitle: item.artist?.name || 'Artista',
    imageUrl: item.cover_medium || item.cover || '',
    spotifyUrl: item.link || '',
    embedUrl: '',
  };
}

function mapDeezerArtist(item: any): SpotifyItemRef {
  return {
    id: `dz_artist_${item.id}`,
    type: 'artist',
    name: item.name || 'Artista',
    subtitle: 'Artista musical',
    imageUrl: item.picture_medium || item.picture || '',
    spotifyUrl: item.link || '',
    embedUrl: '',
  };
}

/**
 * Keyless public music catalog search (iTunes + Deezer fallback).
 */
export async function searchSpotifyCatalog(
  query: string,
  types: ('track' | 'artist' | 'album' | 'playlist')[],
  _sessionKey?: string
) {
  const wantTrack = types.includes('track');
  const wantAlbum = types.includes('album');
  const wantArtist = types.includes('artist');

  const [itTracks, itAlbums, itArtists, dzTracks, dzAlbums, dzArtists] = await Promise.all([
    wantTrack ? searchItunes(query, 'song') : Promise.resolve([]),
    wantAlbum ? searchItunes(query, 'album') : Promise.resolve([]),
    wantArtist ? searchItunes(query, 'musicArtist') : Promise.resolve([]),
    wantTrack ? searchDeezer(query, 'track') : Promise.resolve([]),
    wantAlbum ? searchDeezer(query, 'album') : Promise.resolve([]),
    wantArtist ? searchDeezer(query, 'artist') : Promise.resolve([]),
  ]);

  const tracks = itTracks.length > 0 ? itTracks.map(mapItunesTrack) : dzTracks.map(mapDeezerTrack);
  const albums = itAlbums.length > 0 ? itAlbums.map(mapItunesAlbum) : dzAlbums.map(mapDeezerAlbum);
  const artists = dzArtists.length > 0 ? dzArtists.map(mapDeezerArtist) : itArtists.map(mapItunesArtist);

  return {
    tracks,
    artists,
    albums,
    playlists: [] as SpotifyItemRef[],
  };
}
