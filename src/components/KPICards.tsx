import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Percent, Pencil, Check, X } from 'lucide-react';

interface KPICardsProps {
  saldo: number;
  totalReceitas: number;
  totalDespesas: number;
  savingsRate: number;
  targetSavings: number;
  onUpdateReceitas?: (newVal: number | null) => void;
  isReceitasOverridden?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({
  saldo,
  totalReceitas,
  totalDespesas,
  savingsRate,
  targetSavings,
  onUpdateReceitas,
  isReceitasOverridden = false,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempValue, setTempValue] = React.useState('');

  const formatBRL = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getSavingsRateColor = () => {
    if (savingsRate >= targetSavings) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100';
    if (savingsRate >= targetSavings * 0.5) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100';
    return 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100';
  };

  const handleSave = () => {
    const parsed = parseFloat(tempValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateReceitas?.(parsed);
    } else if (tempValue.trim() === '') {
      onUpdateReceitas?.(null);
    }
    setIsEditing(false);
  };

  return (
    <div id="kpi-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Saldo Secção */}
      <div
        id="kpi-saldo"
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-250 group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans mb-1">
            Saldo Atual
          </p>
          <h3
            className={`text-2xl font-bold tracking-tight font-display transition-colors ${
              saldo >= 0 ? 'text-slate-800' : 'text-rose-600'
            }`}
          >
            {formatBRL(saldo)}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 font-sans">Receitas Líquidas</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 text-slate-500 group-hover:bg-slate-100 transition-colors">
          <Wallet className="w-6 h-6" />
        </div>
      </div>

      {/* Receitas Secção */}
      <div
        id="kpi-receitas"
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-250 group relative"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans mb-1">
            Receitas (Entradas)
          </p>
          {isEditing ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                step="any"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder={totalReceitas.toString()}
                className="w-28 px-2 py-0.5 text-xs font-bold border border-emerald-400 bg-emerald-50 rounded-lg text-emerald-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button
                onClick={handleSave}
                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded bg-white border border-slate-150 cursor-pointer"
                title="Salvar valor"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded bg-white border border-slate-150 cursor-pointer"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/val">
              <h3
                onClick={() => {
                  if (onUpdateReceitas) {
                    setTempValue(totalReceitas.toString());
                    setIsEditing(true);
                  }
                }}
                className="text-2xl font-bold tracking-tight text-emerald-600 font-display cursor-pointer hover:bg-emerald-50/60 rounded-md px-1 -mx-1 transition-colors flex items-center gap-1.5 min-h-[32px]"
                title="Clique para editar as receitas"
              >
                {formatBRL(totalReceitas)}
                {onUpdateReceitas && (
                  <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover/val:text-emerald-500 opacity-20 group-hover/val:opacity-100 transition-all" />
                )}
              </h3>

              {/* Reset button removed as requested */}
            </div>
          )}
          <p className="text-xs text-emerald-500 mt-1.5 font-sans flex items-center gap-1 font-medium">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${isReceitasOverridden ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            {isReceitasOverridden ? 'Valor personalizado' : 'Total do período'}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>

      {/* Despesas Secção */}
      <div
        id="kpi-despesas"
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-250 group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans mb-1">
            Despesas (Saídas)
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-rose-600 font-display">
            {formatBRL(totalDespesas)}
          </h3>
          <p className="text-xs text-rose-500 mt-1.5 font-sans flex items-center gap-1 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Dinheiro gasto
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

      {/* Taxa de Poupança Secção */}
      <div
        id="kpi-savings"
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md duration-250 group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans mb-1">
            Taxa de Poupança
          </p>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-800 font-display">
            {savingsRate.toFixed(1)}%
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 font-sans">
            Meta: <span className="font-semibold text-emerald-600">{targetSavings}%</span> (Regra)
          </p>
        </div>
        <div className={`p-3.5 rounded-2xl border group-hover:opacity-90 transition-opacity ${getSavingsRateColor()}`}>
          <Percent className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
