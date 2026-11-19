import { Headphones, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { AMBIENT_SOUND_OPTIONS } from '../lib/ambientAudio';
import { useAmbientSound } from './AmbientSoundContext';

export function GlobalAmbientSoundWidget() {
  const {
    globalPlaying,
    globalSoundId,
    globalVolume,
    toggleGlobal,
    selectGlobalSound,
    setGlobalVolume,
    panelOpen: open,
    setPanelOpen: setOpen,
    togglePanelOpen,
  } = useAmbientSound();

  const currentOpt = AMBIENT_SOUND_OPTIONS.find((o) => o.id === globalSoundId) || AMBIENT_SOUND_OPTIONS[0];

  return (
    <div className="fixed bottom-[4.5rem] md:bottom-20 right-3 md:right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Atmosfera sonora do site"
          className="w-[300px] sm:w-[325px] rounded-2xl bg-tl-creme border border-tl-marrom/18 editorial-shadow p-4 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-tl-areia/70">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-tl-terracota">
                Atmosfera do site
              </div>
              <div className="font-editorial text-lg font-semibold text-tl-marrom leading-tight">
                Som ambiente
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar painel de som ambiente"
              className="p-1.5 rounded-full text-tl-marrom-suave hover:bg-tl-bege cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Play/Pause & Volume */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleGlobal}
              className={`px-3.5 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                globalPlaying
                  ? 'bg-tl-laranja text-tl-creme hover:bg-tl-terracota'
                  : 'bg-tl-marrom text-tl-creme hover:bg-tl-terracota'
              }`}
            >
              {globalPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{globalPlaying ? 'Pausar' : 'Ativar som'}</span>
            </button>

            <div className="flex-1 flex items-center gap-2">
              {globalVolume === 0 || !globalPlaying ? (
                <VolumeX className="w-4 h-4 text-tl-marrom-suave shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-tl-laranja shrink-0" />
              )}
              <input
                type="range"
                aria-label="Volume do som ambiente"
                min={0}
                max={1}
                step={0.02}
                value={globalVolume}
                onChange={(e) => setGlobalVolume(Number(e.target.value))}
                className="w-full accent-tl-laranja cursor-pointer"
              />
            </div>
          </div>

          {/* 8 Environments Selector */}
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
            {AMBIENT_SOUND_OPTIONS.map((opt) => {
              const selected = globalSoundId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectGlobalSound(opt.id)}
                  className={`text-left px-2.5 py-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                    selected
                      ? 'bg-tl-bege border-tl-laranja text-tl-marrom font-semibold'
                      : 'bg-tl-bege/35 border-tl-marrom/10 text-tl-marrom-suave hover:border-tl-marrom/30 hover:text-tl-marrom'
                  }`}
                >
                  <div className="truncate">{opt.label}</div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-tl-marrom-suave leading-snug">
            {globalPlaying
              ? `Tocando agora: ${currentOpt.label} — continua suave enquanto você navega.`
              : 'Desligado por padrão. Ative quando desejar um fundo sonoro.'}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {globalPlaying && !open && (
          <button
            type="button"
            onClick={toggleGlobal}
            aria-label="Pausar som ambiente"
            title="Pausar som ambiente"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-tl-creme border border-tl-marrom/18 text-tl-terracota editorial-shadow hover:bg-tl-bege cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={togglePanelOpen}
          aria-expanded={open}
          aria-label="Som ambiente do site"
          className={`autumn-glow-surface h-9 px-3.5 rounded-full border text-xs font-medium inline-flex items-center gap-2 editorial-shadow cursor-pointer transition-colors ${
            globalPlaying
              ? 'bg-tl-marrom text-tl-creme border-tl-terracota/30'
              : 'bg-tl-creme/95 text-tl-marrom border-tl-marrom/18 hover:border-tl-laranja'
          }`}
        >
          <Headphones className={`w-3.5 h-3.5 ${globalPlaying ? 'text-tl-laranja' : 'text-tl-terracota'}`} />
          <span className="whitespace-nowrap">
            {globalPlaying ? currentOpt.label : 'Som ambiente'}
          </span>
        </button>
      </div>
    </div>
  );
}
