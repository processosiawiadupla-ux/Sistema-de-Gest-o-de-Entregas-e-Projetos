import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import type { ApiError } from '../../lib/api';

const MIN_LENGTH = 10;

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none';

interface LinkInfo {
  name: string;
  email: string;
  purpose: 'INVITE' | 'RESET';
}

export const SetPasswordPage: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { setPassword } = useAuth();
  const token = new URLSearchParams(window.location.search).get('token') ?? '';

  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ao abrir, confere se o link ainda vale
  useEffect(() => {
    if (!token) {
      setLinkError('Link inválido. Use o link enviado para o seu e-mail.');
      setChecking(false);
      return;
    }
    authService
      .checkToken(token)
      .then(setInfo)
      .catch((err: ApiError) => setLinkError(err.message))
      .finally(() => setChecking(false));
  }, [token]);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH || password !== confirm) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await setPassword(token, password);
      onDone(); // tira o token do endereço e abre o sistema
    } catch (err) {
      setError((err as ApiError).message ?? 'Não foi possível criar a senha.');
      setIsSubmitting(false);
    }
  };

  const isInvite = info?.purpose === 'INVITE';

  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30">
            W
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-wide">WIAFLOW</h1>
        </div>

        {checking && <p className="text-sm text-center text-slate-500">Conferindo o link...</p>}

        {!checking && linkError && (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {linkError}
            </p>
            <button onClick={onDone} className="text-sm font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
              Ir para o login
            </button>
          </div>
        )}

        {!checking && info && (
          <>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-slate-900">
                {isInvite ? `Bem-vindo(a), ${info.name}!` : `Olá, ${info.name}!`}
              </p>
              <p className="text-sm text-slate-500">
                {isInvite ? 'Crie a sua senha para acessar o Wiaflow.' : 'Crie uma senha nova para a sua conta.'}
              </p>
              <p className="text-xs text-slate-500">
                Seu acesso: <strong className="text-slate-700">{info.email}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Ajuda o gerenciador de senhas do navegador a salvar o login certo */}
              <input type="email" name="username" autoComplete="username" value={info.email} readOnly hidden />

              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className={`text-xs mt-1 ${tooShort ? 'text-rose-600' : 'text-slate-500'}`}>
                  Pelo menos {MIN_LENGTH} caracteres. Dica: uma frase longa é forte e fácil de lembrar.
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirme a senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {mismatch && <p className="text-xs mt-1 text-rose-600">As senhas não são iguais.</p>}
              </div>

              {error && (
                <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || password.length < MIN_LENGTH || password !== confirm}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-blue-600/20 text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : isInvite ? 'Criar senha e entrar' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};