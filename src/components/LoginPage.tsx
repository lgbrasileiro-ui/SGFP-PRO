/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Sparkles, Shield, RefreshCw, BarChart3, ChevronRight } from 'lucide-react';

interface LoginPageProps {
  onLoginStart?: () => void;
  onLoginError?: (error: string) => void;
}

export function LoginPage({ onLoginStart, onLoginError }: LoginPageProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    if (onLoginStart) onLoginStart();

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Erro de autenticação do Google', err);
      if (onLoginError) {
        onLoginError(err.message || 'Falha ao autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 md:p-8 select-none">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[550px]">
        
        {/* Left Section: Information and Marketing */}
        <div className="md:col-span-7 bg-slate-900 p-8 md:p-12 text-slate-300 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient light */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
          
          <div className="relative z-10">
            {/* Branding */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-emerald-500/20">
                <span className="font-extrabold text-xl font-display tracking-tighter">S</span>
              </div>
              <span className="text-white font-extrabold tracking-tight text-xl font-display">SGFP PRO</span>
            </div>

            {/* Title & Slogan */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight font-display mb-4">
              Gerencie suas finanças com a regra <span className="text-emerald-400">50/30/20</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-md mb-10 leading-relaxed font-sans">
              Um gerenciador financeiro completo e inteligente, 100% integrado na nuvem para monitorar seu orçamento de forma ultra segura.
            </p>

            {/* Features list */}
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-shrink-0 items-center justify-center text-emerald-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Privacidade e Segurança Forte</h3>
                  <p className="text-xs text-slate-400 mt-1">Conexão criptografada integrada ao Google Cloud e Firebase Fortress com isolamento absoluto de dados.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-shrink-0 items-center justify-center text-indigo-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Sincronização em Tempo Real</h3>
                  <p className="text-xs text-slate-400 mt-1">Seus lançamentos atualizados instantaneamente em qualquer dispositivo, sem duplicidades.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-shrink-0 items-center justify-center text-amber-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Análise de Categorias e Metas</h3>
                  <p className="text-xs text-slate-400 mt-1">Gere relatórios refinados de gastos de Necessidades, Desejos e Investimentos em segundos.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono relative z-10 mt-8">
            SGFP PRO v2.0 • Protegido com criptografia fim-a-fim Firebase
          </div>
        </div>

        {/* Right Section: Interactive Area */}
        <div className="md:col-span-5 p-8 md:p-12 flex flex-col justify-between bg-white text-center md:text-left">
          <div className="my-auto max-w-sm mx-auto w-full space-y-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/50 text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Nuvem Ativada</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
                Boas-vindas de volta!
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Acesse o SGFP PRO instantaneamente. Seus dados serão mantidos sincronizados em nuvem de maneira segura e individual.
              </p>
            </div>

            {/* Login CTA Button */}
            <div className="space-y-4">
              <button
                id="btn-google-login"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-between gap-4 p-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-950/10 transition-all cursor-pointer border border-transparent disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  {/* Styled Mini Google Colorful Icon with div */}
                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.68 1.39 7.56l3.85 2.99C6.18 7.37 8.87 5.04 12 5.04z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.96 3.7-8.62z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.24 14.45c-.25-.76-.39-1.57-.39-2.45s.14-1.69.39-2.45L1.39 6.56C.5 8.2 0 10.04 0 12s.5 3.8 1.39 5.44l3.85-2.99z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.1.74-2.5 1.18-4.2 1.18-3.13 0-5.82-2.33-6.76-5.51l-3.85 2.99C3.37 20.32 7.35 23 12 23z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs">
                    {loading ? 'Entrando...' : 'Entrar com o Google'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 flex gap-3 items-center text-left">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping flex-shrink-0" />
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                Integração estrita de sandbox: suas credenciais e cookies são gerenciados diretamente pelo SDK de Autenticação do Firebase do Google.
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-8">
            Termos de uso e segurança regidos em conformidade com as diretrizes do Firebase Client Sandbox.
          </p>
        </div>

      </div>
    </div>
  );
}
