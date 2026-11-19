import { Eye, EyeOff, KeyRound, Lock, LogOut, ShieldBan, Upload, UserCheck, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { api, readFileAsDataUrl, setStoredToken } from '../lib/api';
import { UserPublic } from '../types/thinklive';
import { UserAvatar } from './ImageWithFallback';

interface AuthAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserPublic | null;
  onAuthChanged: (user: UserPublic | null) => void;
}

export function AuthAccountModal({ isOpen, onClose, currentUser, onAuthChanged }: AuthAccountModalProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [lookedUpHint, setLookedUpHint] = useState<string | null>(null);
  const [hintChecked, setHintChecked] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [issuedCode, setIssuedCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editPasswordHint, setEditPasswordHint] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [favCats, setFavCats] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserPublic[]>([]);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setMessage('');
    setLookedUpHint(null);
    setHintChecked(false);
    if (currentUser) {
      setEditName(currentUser.displayName);
      setEditUsername(currentUser.username);
      setEditBio(currentUser.bio);
      setEditAvatar(currentUser.avatarUrl);
      setEditPasswordHint(currentUser.passwordHint || '');
      setIsPrivate(currentUser.isPrivate);
      setFavCats(currentUser.preferences?.favoriteCategories || []);
      api.getBlockedUsers().then((r) => setBlockedUsers(r.users)).catch(() => {});
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login({ identifier, password });
      setStoredToken(res.token);
      onAuthChanged(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.register({ username, email, password, displayName, passwordHint });
      setStoredToken(res.token);
      onAuthChanged(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckPasswordHint(targetIdentifier: string) {
    setError('');
    setHintChecked(false);
    setLookedUpHint(null);
    if (!targetIdentifier.trim()) {
      setError('Digite seu e-mail ou @usuário acima para ver a dica da senha.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.getPasswordHint(targetIdentifier);
      setLookedUpHint(res.hint);
      setHintChecked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar a dica.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    setError('');
    try {
      const res = await api.demoLogin();
      setStoredToken(res.token);
      onAuthChanged(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar na conta de demonstração.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestRecovery(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.forgotPassword(recoveryEmail);
      setIssuedCode(res.recoveryCode);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.resetPassword({
        email: recoveryEmail,
        code: recoveryCode,
        newPassword,
      });
      setMessage(res.message);
      setIssuedCode('');
      setAuthTab('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const res = await api.uploadImage(dataUrl, 'avatar');
    setEditAvatar(res.url);
  }

  async function handleSaveAccount(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.updateAccount({
        displayName: editName,
        username: editUsername,
        bio: editBio,
        avatarUrl: editAvatar,
        passwordHint: editPasswordHint,
        isPrivate,
        preferences: {
          favoriteCategories: favCats,
          emailNotifications: true,
        },
      });
      onAuthChanged(res.user);
      setMessage('Alterações salvas com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar conta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    setStoredToken(null);
    onAuthChanged(null);
    onClose();
  }

  async function handleUnblock(userId: string) {
    await api.toggleBlock(userId);
    setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  return (
    <div className="fixed inset-0 z-50 bg-tl-marrom/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-tl-creme w-full max-w-lg max-h-[90vh] rounded-3xl border border-tl-marrom/18 editorial-shadow flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-tl-bege/75 border-b border-tl-marrom/12 flex items-center justify-between">
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
            {currentUser ? 'Conta e Privacidade' : 'Bem-vindo à Thinklive'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-tl-marrom hover:bg-tl-areia/60 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!currentUser ? (
            <>
              <div className="flex gap-1 p-1 bg-tl-bege border border-tl-marrom/14 rounded-full">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setError('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                    authTab === 'login' ? 'bg-tl-marrom text-tl-creme' : 'text-tl-marrom-suave'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setError('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                    authTab === 'register' ? 'bg-tl-marrom text-tl-creme' : 'text-tl-marrom-suave'
                  }`}
                >
                  Criar conta gratuita
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('forgot');
                    setError('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                    authTab === 'forgot' ? 'bg-tl-marrom text-tl-creme' : 'text-tl-marrom-suave'
                  }`}
                >
                  Recuperar senha
                </button>
              </div>

              {authTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-tl-marrom-suave mb-1">E-mail ou @usuário</label>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="seu@email.com ou @usuario"
                      className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm text-tl-marrom"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-tl-marrom-suave">Senha</label>
                      <button
                        type="button"
                        onClick={() => handleCheckPasswordHint(identifier)}
                        className="text-[11px] font-medium text-tl-laranja hover:text-tl-terracota hover:underline cursor-pointer"
                      >
                        Ver dica da senha
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 pl-3.5 pr-10 py-2.5 text-sm text-tl-marrom"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tl-marrom-suave hover:text-tl-terracota cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {hintChecked && (
                    <div className="p-3 rounded-xl bg-tl-bege border border-tl-marrom/20 text-xs text-tl-marrom">
                      {lookedUpHint ? (
                        <div>
                          <span className="font-semibold text-tl-terracota">Dica da senha: </span>
                          <span>{lookedUpHint}</span>
                        </div>
                      ) : (
                        <div className="text-tl-marrom-suave">
                          Nenhuma dica cadastrada para esta conta.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthTab('forgot');
                              setRecoveryEmail(identifier.includes('@') ? identifier : '');
                            }}
                            className="text-tl-terracota font-semibold hover:underline cursor-pointer"
                          >
                            Recuperar senha
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="autumn-glow-btn w-full py-2.5 text-sm font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-[0.98] cursor-pointer"
                  >
                    {loading ? 'Entrando…' : 'Entrar na Thinklive'}
                  </button>

                  <div className="pt-3 border-t border-tl-areia/70 space-y-2">
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      disabled={loading}
                      className="autumn-glow-surface w-full py-2.5 text-xs font-medium bg-tl-bege border border-tl-marrom/15 text-tl-marrom rounded-full hover:border-tl-laranja flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-tl-laranja" />
                      <span>Explorar com conta de demonstração (Clara Vasconcelos)</span>
                    </button>
                    <p className="text-[11px] text-center text-tl-marrom-suave">
                      Acesso de demonstração: <span className="font-semibold text-tl-marrom">demo@thinklive.app</span> · senha:{' '}
                      <span className="font-semibold text-tl-marrom">thinklive123</span>
                    </p>
                  </div>
                </form>
              )}

              {authTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Nome de exibição</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Como deseja aparecer"
                      className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm text-tl-marrom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Nome de usuário único (@)</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ex: maria_silva"
                      className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm text-tl-marrom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tl-marrom-suave mb-1">E-mail</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm text-tl-marrom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Senha (mín. 6 caracteres)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 pl-3.5 pr-10 py-2.5 text-sm text-tl-marrom"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tl-marrom-suave hover:text-tl-terracota cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tl-marrom-suave mb-1">
                      Dica da senha (opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      value={passwordHint}
                      onChange={(e) => setPasswordHint(e.target.value)}
                      placeholder="Ex.: Nome do meu livro favorito de infância"
                      className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm text-tl-marrom"
                    />
                    <p className="text-[11px] text-tl-marrom-suave mt-1">
                      Ajuda você a lembrar sua senha sem revelar a senha em si.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="autumn-glow-btn w-full py-2.5 text-sm font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota cursor-pointer"
                  >
                    {loading ? 'Criando espaço…' : 'Criar conta gratuita'}
                  </button>
                </form>
              )}

              {authTab === 'forgot' && (
                <div className="space-y-4">
                  <form onSubmit={handleRequestRecovery} className="space-y-3">
                    <label className="block text-xs font-medium text-tl-marrom-suave">
                      Informe o e-mail cadastrado para gerar um código de recuperação
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="flex-1 rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="autumn-glow-btn px-4 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota cursor-pointer"
                      >
                        Gerar código
                      </button>
                    </div>
                  </form>

                  {issuedCode && (
                    <div className="p-3 rounded-xl bg-tl-bege border border-tl-marrom/20 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-tl-terracota">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Código de verificação emitido: {issuedCode}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-3 pt-2 border-t border-tl-areia/70">
                    <input
                      type="text"
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Código de 6 dígitos"
                      className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nova senha"
                      className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 text-xs font-medium bg-tl-marrom text-tl-creme rounded-full cursor-pointer"
                    >
                      Redefinir senha
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar src={editAvatar} name={editName} size="xl" />
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-tl-bege border border-tl-marrom/15 text-tl-marrom rounded-full hover:border-tl-laranja cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Alterar foto de perfil</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Nome de exibição</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Nome de usuário único</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Biografia</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Dica da senha de acesso</label>
                <input
                  type="text"
                  maxLength={120}
                  value={editPasswordHint}
                  onChange={(e) => setEditPasswordHint(e.target.value)}
                  placeholder="Lembrete pessoal para ajudar a recordar sua senha"
                  className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-tl-bege/70 border border-tl-marrom/14 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-tl-marrom flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-tl-laranja" />
                    <span>Perfil privado</span>
                  </div>
                  <p className="text-[11px] text-tl-marrom-suave">
                    Quando ativado, apenas seguidores acompanham suas publicações e estantes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-tl-laranja cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-2">Interesses culturais</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Poemas', 'Artigos', 'Filmes & Séries', 'Livros', 'Fotografia', 'Arte e cultura'].map((cat) => {
                    const active = favCats.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setFavCats((prev) => (active ? prev.filter((c) => c !== cat) : [...prev, cat]))
                        }
                        className={`px-3 py-1 text-xs rounded-full border cursor-pointer ${
                          active
                            ? 'bg-tl-marrom text-tl-creme border-tl-marrom font-medium'
                            : 'bg-tl-bege/60 text-tl-marrom-suave border-tl-marrom/15'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {blockedUsers.length > 0 && (
                <div className="pt-3 border-t border-tl-areia/70 space-y-2">
                  <div className="text-xs font-semibold text-tl-marrom-suave flex items-center gap-1.5">
                    <ShieldBan className="w-3.5 h-3.5" />
                    <span>Usuários bloqueados</span>
                  </div>
                  {blockedUsers.map((bu) => (
                    <div key={bu.id} className="flex items-center justify-between text-xs bg-tl-bege/65 p-2.5 rounded-xl border border-tl-marrom/12">
                      <span>
                        {bu.displayName} (@{bu.username})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnblock(bu.id)}
                        className="text-tl-terracota font-semibold hover:underline cursor-pointer"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2 text-xs text-tl-terracota hover:bg-tl-bege rounded-full flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da conta</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="autumn-glow-btn px-5 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota cursor-pointer"
                >
                  {loading ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          )}

          {error && <p className="text-xs text-tl-terracota font-semibold">{error}</p>}
          {message && <p className="text-xs text-tl-marrom font-semibold">{message}</p>}
        </div>
      </div>
    </div>
  );
}
