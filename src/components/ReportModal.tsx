import { Flag, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

interface ReportModalProps {
  target: { type: 'post' | 'user' | 'comment'; id: string; label: string } | null;
  onClose: () => void;
  onSubmitted: (msg: string) => void;
}

const REASONS = [
  'Conteúdo ofensivo ou assédio',
  'Plágio ou violação autoral',
  'Spam ou propaganda indevida',
  'Desinformação ou discurso de ódio',
  'Outro motivo',
];

export function ReportModal({ target, onClose, onSubmitted }: ReportModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!target) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await api.submitReport({
        targetType: target.type,
        targetId: target.id,
        reason,
        details,
      });
      onSubmitted(res.message);
      setDetails('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-tl-marrom/55 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-tl-creme w-full max-w-md rounded-3xl p-6 border border-tl-marrom/18 editorial-shadow space-y-4 text-tl-marrom"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-2xl font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4 text-tl-laranja" />
            <span>Denunciar e moderar</span>
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-tl-marrom-suave">
          Você está enviando uma denúncia referente a: <strong className="text-tl-marrom">{target.label}</strong>
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-tl-marrom-suave">Motivo</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-tl-marrom-suave">Detalhes adicionais (opcional)</label>
          <textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Descreva o ocorrido para nossa moderação…"
            className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 p-3 text-sm text-tl-marrom"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-tl-marrom-suave cursor-pointer">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="autumn-glow-btn px-5 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota cursor-pointer"
          >
            {submitting ? 'Enviando…' : 'Enviar denúncia'}
          </button>
        </div>
      </form>
    </div>
  );
}
