import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { api, type ApiError } from '../../lib/api';

const EMAIL_DOMAIN = 'wiadupla.com';

async function requestReset(email: string) {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
  return data.message;
}

export const ForgotPasswordPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState('');

  const request = useMutation<string, ApiError, string>({ mutationFn: requestReset });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    request.mutate(email.trim().toLowerCase());
  };

  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-slate-200 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Esqueci minha senha</h1>
          <p className="text-sm text-slate-500 mt-1">
            Informe o seu e-mail institucional. Se ele estiver cadastrado, enviaremos um link para criar uma nova
            senha.
          </p>
        </div>

        {request.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{request.data}</span>
            </p>
            <p className="text-xs text-slate-500">O link vale por 1 hora e só pode ser usado uma vez.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder={`nome@${EMAIL_DOMAIN}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {request.isError && <p className="text-sm text-rose-600">{request.error.message}</p>}

            <button
              type="submit"
              disabled={request.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {request.isPending ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </button>
      </div>
    </div>
  );
};