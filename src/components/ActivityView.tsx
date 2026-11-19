import { Bell, CheckCheck, Heart, MessageCircle, Sparkles, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { formatRelativeDate } from '../lib/api';
import { NotificationEnriched, UserPublic } from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { UserAvatar } from './ImageWithFallback';

interface ActivityViewProps {
  currentUser: UserPublic | null;
  notifications: NotificationEnriched[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onOpenPostId: (postId: string) => void;
  onOpenAuthor: (username: string) => void;
  onRequireAuth: () => void;
}

export function ActivityView({
  currentUser,
  notifications,
  onMarkAllRead,
  onMarkRead,
  onOpenPostId,
  onOpenAuthor,
  onRequireAuth,
}: ActivityViewProps) {
  const [filter, setFilter] = useState<'todas' | 'follow' | 'like' | 'comment' | 'new_post'>('todas');

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-tl-creme border border-tl-marrom/15 text-tl-terracota flex items-center justify-center">
          <Bell className="w-7 h-7" strokeWidth={1.6} />
        </div>
        <h1 className="font-editorial text-4xl font-semibold text-tl-marrom">Central de atividade</h1>
        <p className="font-literary text-sm text-tl-marrom-suave">
          Entre na sua conta para acompanhar novos seguidores, curtidas, respostas e publicações de autores seguidos.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="autumn-glow-btn px-6 py-2.5 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95 cursor-pointer"
        >
          Entrar ou cadastrar
        </button>
      </div>
    );
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'todas') return true;
    if (filter === 'comment') return n.type === 'comment' || n.type === 'reply';
    return n.type === filter;
  });

  function renderIcon(type: NotificationEnriched['type']) {
    if (type === 'follow') return <UserPlus className="w-4 h-4 text-tl-laranja" />;
    if (type === 'like') return <Heart className="w-4 h-4 text-tl-terracota" />;
    if (type === 'comment' || type === 'reply') return <MessageCircle className="w-4 h-4 text-tl-marrom" />;
    return <Sparkles className="w-4 h-4 text-tl-laranja" />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-7 md:py-10 pb-28 space-y-6">
      <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-6 md:p-8 editorial-shadow flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-tl-terracota block mb-1.5">
            Notificações
          </span>
          <h1 className="font-editorial text-4xl font-semibold text-tl-marrom">Atividade</h1>
          <BotanicalDivider className="w-24 h-3 text-tl-laranja mt-1" />
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="autumn-glow-link text-xs font-medium text-tl-laranja hover:text-tl-terracota hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar border-b border-tl-marrom/12 pb-2">
        {[
          { id: 'todas', label: 'Todas' },
          { id: 'follow', label: 'Seguidores' },
          { id: 'like', label: 'Curtidas' },
          { id: 'comment', label: 'Comentários e respostas' },
          { id: 'new_post', label: 'Autores seguidos' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`autumn-glow-link relative py-1.5 text-xs whitespace-nowrap cursor-pointer ${
              filter === tab.id ? 'text-tl-terracota font-semibold' : 'text-tl-marrom-suave hover:text-tl-marrom'
            }`}
          >
            {tab.label}
            {filter === tab.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-laranja" />}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-3xl bg-tl-creme border border-tl-marrom/14 text-center text-sm text-tl-marrom-suave">
          Nenhuma notificação nesta categoria ainda.
        </div>
      ) : (
        <div className="divide-y divide-tl-areia/65 bg-tl-creme border border-tl-marrom/14 rounded-3xl overflow-hidden editorial-shadow">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) onMarkRead(n.id);
                if (n.postId) onOpenPostId(n.postId);
                else onOpenAuthor(n.actor.username);
              }}
              className={`autumn-glow-surface p-4 md:p-5 flex items-start gap-3.5 cursor-pointer hover:bg-tl-bege/65 ${
                !n.read ? 'bg-tl-bege/45' : ''
              }`}
            >
              <div className="mt-1 shrink-0">{renderIcon(n.type)}</div>
              <UserAvatar src={n.actor.avatarUrl} name={n.actor.displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-tl-marrom leading-snug">
                  <span className="font-semibold">{n.actor.displayName}</span>{' '}
                  <span className="text-tl-marrom-suave">{n.message}</span>
                </p>
                <span className="text-xs text-tl-marrom-suave mt-1 block">{formatRelativeDate(n.createdAt)}</span>
              </div>
              {!n.read && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-tl-terracota shrink-0">
                  Nova
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
