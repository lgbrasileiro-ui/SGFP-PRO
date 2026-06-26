/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PieChart, Sliders, AlertTriangle, Check, BookOpen } from 'lucide-react';
import { BudgetRule } from '../types';

interface BudgetOverviewProps {
  rule: BudgetRule;
  onUpdateRule: (newRule: BudgetRule) => void;
  gastoNecessidades: number;
  gastoDesejos: number;
  gastoPoupanca: number;
  totalReceitas: number;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  rule,
  onUpdateRule,
  gastoNecessidades,
  gastoDesejos,
  gastoPoupanca,
  totalReceitas,
}) => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [tempNecessidades, setTempNecessidades] = useState(rule.necessidades);
  const [tempDesejos, setTempDesejos] = useState(rule.desejos);
  const [tempPoupanca, setTempPoupanca] = useState(rule.poupanca);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calcula valores de teto com base no orçamento e receita total (ou uma receita base mínima de R$ 1.000 se sem renda para ter base visual)
  const baseReceita = totalReceitas > 0 ? totalReceitas : 1000;
  
  const orcamentoNec = baseReceita * (rule.necessidades / 100);
  const orcamentoDes = baseReceita * (rule.desejos / 100);
  const orcamentoPou = baseReceita * (rule.poupanca / 100);

  const getPercent = (spent: number, budget: number) => {
    if (budget === 0) return 0;
    return Math.min((spent / budget) * 100, 100);
  };

  const getPercentLabel = (spent: number, budget: number) => {
    if (budget === 0) return '0%';
    return `${((spent / budget) * 100).toFixed(0)}%`;
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSaveRule = () => {
    const total = tempNecessidades + tempDesejos + tempPoupanca;
    if (total !== 100) {
      setErrorMsg(`A soma precisa ser exatamente 100%. Atualmente está em ${total}%.`);
      return;
    }
    setErrorMsg(null);
    onUpdateRule({
      necessidades: tempNecessidades,
      desejos: tempDesejos,
      poupanca: tempPoupanca,
    });
    setIsConfiguring(false);
  };

  return (
    <div id="budget-overview" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 font-display">
            <PieChart className="w-5 h-5 text-slate-400" />
            Meta Orçamentária ({rule.necessidades}/{rule.desejos}/{rule.poupanca})
          </h2>
          <button
            id="btn-config-rule"
            onClick={() => {
              setTempNecessidades(rule.necessidades);
              setTempDesejos(rule.desejos);
              setTempPoupanca(rule.poupanca);
              setErrorMsg(null);
              setIsConfiguring(!isConfiguring);
            }}
            className="p-1 px-2 text-xs flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            Ajustar Regra
          </button>
        </div>

        {totalReceitas === 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
            Nenhuma receita cadastrada neste período. Usando base de demonstração de R$ 1.000,00 para estimativas da regra.
          </div>
        )}

        {isConfiguring ? (
          <div id="rule-config-panel" className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Distribuir Recursos (100%)</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Necessidades: {tempNecessidades}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={tempNecessidades}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTempNecessidades(val);
                  }}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Desejos: {tempDesejos}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={tempDesejos}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTempDesejos(val);
                  }}
                  className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Poupança / Pagamento Dívidas: {tempPoupanca}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={tempPoupanca}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTempPoupanca(val);
                  }}
                  className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Soma visual */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                <span className="text-xs font-medium text-slate-500">Total somado:</span>
                <span className={`text-sm font-bold ${tempNecessidades + tempDesejos + tempPoupanca === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tempNecessidades + tempDesejos + tempPoupanca}% / 100%
                </span>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Salvar Regra
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfiguring(false)}
                  className="py-1.5 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Categoria 1: Necessidades */}
        <div id="budget-necessidades" className="mb-5 last:mb-0">
          <div className="flex justify-between text-xs items-baseline mb-1 font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0"></span>
              <span className="font-semibold text-slate-700">Necessidades ({rule.necessidades}%)</span>
            </div>
            <div className="text-slate-400 font-mono">
              <span className="font-bold text-slate-700">{formatBRL(gastoNecessidades)}</span> / {formatBRL(orcamentoNec)}
            </div>
          </div>
          
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                gastoNecessidades > orcamentoNec ? 'bg-rose-500' : 'bg-blue-500'
              }`}
              style={{ width: `${getPercent(gastoNecessidades, orcamentoNec)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
            <span>Essenciais e Contas Fixas</span>
            {gastoNecessidades > orcamentoNec ? (
              <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Limite excedido em {getPercentLabel(gastoNecessidades, orcamentoNec)}
              </span>
            ) : orcamentoNec > 0 ? (
              <span className="text-emerald-600">Disponível: {formatBRL(orcamentoNec - gastoNecessidades)}</span>
            ) : null}
          </div>
        </div>

        {/* Categoria 2: Desejos */}
        <div id="budget-desejos" className="mb-5 last:mb-0">
          <div className="flex justify-between text-xs items-baseline mb-1 font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0"></span>
              <span className="font-semibold text-slate-700">Desejos ({rule.desejos}%)</span>
            </div>
            <div className="text-slate-400 font-mono">
              <span className="font-bold text-slate-700">{formatBRL(gastoDesejos)}</span> / {formatBRL(orcamentoDes)}
            </div>
          </div>
          
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                gastoDesejos > orcamentoDes ? 'bg-rose-500' : 'bg-purple-500'
              }`}
              style={{ width: `${getPercent(gastoDesejos, orcamentoDes)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
            <span>Estilo de Vida e Lazer</span>
            {gastoDesejos > orcamentoDes ? (
              <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Limite excedido em {getPercentLabel(gastoDesejos, orcamentoDes)}
              </span>
            ) : orcamentoDes > 0 ? (
              <span className="text-emerald-600">Disponível: {formatBRL(orcamentoDes - gastoDesejos)}</span>
            ) : null}
          </div>
        </div>

        {/* Categoria 3: Poupança */}
        <div id="budget-poupanca" className="mb-5 last:mb-0">
          <div className="flex justify-between text-xs items-baseline mb-1 font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="font-semibold text-slate-700">Poupança e Dívidas ({rule.poupanca}%)</span>
            </div>
            <div className="text-slate-400 font-mono">
              <span className="font-bold text-slate-700">{formatBRL(gastoPoupanca)}</span> / {formatBRL(orcamentoPou)}
            </div>
          </div>
          
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${getPercent(gastoPoupanca, orcamentoPou)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
            <span>Investimentos e Amortizações</span>
            {orcamentoPou > 0 && (
              <span className={gastoPoupanca >= orcamentoPou ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                Progresso: {getPercentLabel(gastoPoupanca, orcamentoPou)} da meta
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-50 flex items-start gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed font-sans">
        <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700 block mb-0.5">O que é a regra {rule.necessidades}-{rule.desejos}-{rule.poupanca}?</span>
          Uma diretriz popular de finanças onde você divide suas receitas pós-impostos em {rule.necessidades}% para o que você <span className="text-blue-600 font-medium">precisa</span>, {rule.desejos}% para o que você <span className="text-purple-600 font-medium">deseja</span> e {rule.poupanca}% para <span className="text-emerald-600 font-medium">poupar ou quitar dívidas</span>.
        </div>
      </div>
    </div>
  );
};
