import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ambientAudioEngine } from '../lib/ambientAudio';
import { AmbientSoundId } from '../types/thinklive';

const STORAGE_KEY = 'thinklive_ambient_prefs_v1';

interface StoredPrefs {
  globalSoundId: AmbientSoundId;
  globalVolume: number;
  poemSoundId: AmbientSoundId;
  poemVolume: number;
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
      return {
        globalSoundId: parsed.globalSoundId || 'chuva',
        globalVolume: typeof parsed.globalVolume === 'number' ? parsed.globalVolume : 0.45,
        poemSoundId: parsed.poemSoundId || 'piano',
        poemVolume: typeof parsed.poemVolume === 'number' ? parsed.poemVolume : 0.45,
      };
    }
  } catch {
    // ignore
  }
  return {
    globalSoundId: 'chuva',
    globalVolume: 0.45,
    poemSoundId: 'piano',
    poemVolume: 0.45,
  };
}

interface AmbientSoundContextValue {
  globalPlaying: boolean;
  globalSoundId: AmbientSoundId;
  globalVolume: number;
  toggleGlobal: () => void;
  selectGlobalSound: (id: AmbientSoundId) => void;
  setGlobalVolume: (v: number) => void;
  stopGlobal: () => void;

  poemPlaying: boolean;
  poemSoundId: AmbientSoundId;
  poemVolume: number;
  activePoemPostId: string | null;
  playPoemTrack: (postId: string, soundId: AmbientSoundId) => void;
  togglePoemAtmosphere: () => void;
  selectPoemSound: (id: AmbientSoundId) => void;
  setPoemVolume: (v: number) => void;
  stopPoemAtmosphere: () => void;

  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanelOpen: () => void;
}

const AmbientSoundContext = createContext<AmbientSoundContextValue | null>(null);

export function AmbientSoundProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(() => loadPrefs());
  // Strictly OFF by default on initial load
  const [globalPlaying, setGlobalPlaying] = useState(false);
  const [poemPlaying, setPoemPlaying] = useState(false);
  const [activePoemPostId, setActivePoemPostId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanelOpen = useCallback(() => {
    setPanelOpen((v) => !v);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  useEffect(() => {
    return () => {
      ambientAudioEngine.stop();
    };
  }, []);

  const toggleGlobal = useCallback(() => {
    setGlobalPlaying((prev) => {
      const next = !prev;
      if (next) {
        setPoemPlaying(false);
        setActivePoemPostId(null);
        ambientAudioEngine.start(prefs.globalSoundId, prefs.globalVolume);
      } else {
        ambientAudioEngine.stop();
      }
      return next;
    });
  }, [prefs.globalSoundId, prefs.globalVolume]);

  const stopGlobal = useCallback(() => {
    setGlobalPlaying(false);
    if (!poemPlaying) ambientAudioEngine.stop();
  }, [poemPlaying]);

  const selectGlobalSound = useCallback(
    (id: AmbientSoundId) => {
      setPrefs((p) => ({ ...p, globalSoundId: id }));
      if (globalPlaying) {
        setPoemPlaying(false);
        setActivePoemPostId(null);
        ambientAudioEngine.start(id, prefs.globalVolume);
      }
    },
    [globalPlaying, prefs.globalVolume]
  );

  const setGlobalVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setPrefs((p) => ({ ...p, globalVolume: clamped }));
      if (globalPlaying) {
        ambientAudioEngine.setVolume(clamped);
      }
    },
    [globalPlaying]
  );

  const playPoemTrack = useCallback(
    (postId: string, soundId: AmbientSoundId) => {
      const isSameActive = poemPlaying && activePoemPostId === postId && prefs.poemSoundId === soundId;
      if (isSameActive) {
        ambientAudioEngine.stop();
        setPoemPlaying(false);
        setActivePoemPostId(null);
        return;
      }
      setGlobalPlaying(false);
      setPrefs((p) => ({ ...p, poemSoundId: soundId }));
      setActivePoemPostId(postId);
      setPoemPlaying(true);
      ambientAudioEngine.start(soundId, prefs.poemVolume);
    },
    [poemPlaying, activePoemPostId, prefs.poemSoundId, prefs.poemVolume]
  );

  const togglePoemAtmosphere = useCallback(() => {
    setPoemPlaying((prev) => {
      const next = !prev;
      if (next) {
        setGlobalPlaying(false);
        ambientAudioEngine.start(prefs.poemSoundId, prefs.poemVolume);
      } else {
        setActivePoemPostId(null);
        ambientAudioEngine.stop();
      }
      return next;
    });
  }, [prefs.poemSoundId, prefs.poemVolume]);

  const stopPoemAtmosphere = useCallback(() => {
    setPoemPlaying((prev) => {
      if (prev) ambientAudioEngine.stop();
      return false;
    });
    setActivePoemPostId(null);
  }, []);

  const selectPoemSound = useCallback(
    (id: AmbientSoundId) => {
      setPrefs((p) => ({ ...p, poemSoundId: id }));
      if (poemPlaying) {
        setGlobalPlaying(false);
        ambientAudioEngine.start(id, prefs.poemVolume);
      }
    },
    [poemPlaying, prefs.poemVolume]
  );

  const setPoemVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setPrefs((p) => ({ ...p, poemVolume: clamped }));
      if (poemPlaying) {
        ambientAudioEngine.setVolume(clamped);
      }
    },
    [poemPlaying]
  );

  return (
    <AmbientSoundContext.Provider
      value={{
        globalPlaying,
        globalSoundId: prefs.globalSoundId,
        globalVolume: prefs.globalVolume,
        toggleGlobal,
        selectGlobalSound,
        setGlobalVolume,
        stopGlobal,
        poemPlaying,
        poemSoundId: prefs.poemSoundId,
        poemVolume: prefs.poemVolume,
        activePoemPostId,
        playPoemTrack,
        togglePoemAtmosphere,
        selectPoemSound,
        setPoemVolume,
        stopPoemAtmosphere,
        panelOpen,
        setPanelOpen,
        togglePanelOpen,
      }}
    >
      {children}
    </AmbientSoundContext.Provider>
  );
}

export function useAmbientSound() {
  const ctx = useContext(AmbientSoundContext);
  if (!ctx) throw new Error('useAmbientSound must be used within AmbientSoundProvider');
  return ctx;
}
