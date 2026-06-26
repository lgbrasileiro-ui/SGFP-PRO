/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, PieChart, TrendingUp, DollarSign } from 'lucide-react';
import { Transaction } from '../types';

interface CashFlowChartProps {
  transactions: Transaction[];
  currentMonth: string; // 'all' or 'YYYY-MM'
}

type ChartType = 'flow' | 'category';

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions, currentMonth }) => {
  const [chartType, setChartType] = useState<ChartType>('flow');
  const [flowMode, setFlowMode] = useState<'monthly' | 'daily'>('monthly');

  // Cores do tema para o gráfico de pizza (Muted & Premium)
  const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#14b8a6', '#64748b'];

  // --- 1. Dados para o Comparativo Mensal (Todos os meses, lado a lado) ---
  const monthlyComparisonData = useMemo(() => {
    const groups: Record<string, { month: string; Receita: number; Despesa: number; totalDate: Date }> = {};
    
    transactions.forEach((t) => {
      const [year, month] = t.date.split('-');
      // Nome simplificado em PT-BR para o mês
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthLabel = `${monthNames[parseInt(month) - 1]}/${year.substring(2)}`;
      const groupKey = `${year}-${month}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          month: monthLabel,
          Receita: 0,
          Despesa: 0,
          totalDate: new Date(parseInt(year), parseInt(month) - 1, 1),
        };
      }

      if (t.type === 'Receita') {
        groups[groupKey].Receita += t.amount;
      } else {
        groups[groupKey].Despesa += t.amount;
      }
    });

    // Ordenar cronologicamente
    return Object.values(groups).sort((a, b) => a.totalDate.getTime() - b.totalDate.getTime());
  }, [transactions]);

  // --- 2. Dados Diários (Se um mês específico estiver selecionado) ---
  const dailyFlowData = useMemo(() => {
    if (currentMonth === 'all') return [];

    const filtered = transactions.filter((t) => t.date.startsWith(currentMonth));
    const days: Record<string, { label: string; dateNum: number; Receita: number; Despesa: number }> = {};
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentMonth}-${String(i).padStart(2, '0')}`;
      days[dateStr] = {
        label: `${String(i).padStart(2, '0')}`,
        dateNum: i,
        Receita: 0,
        Despesa: 0,
      };
    }

    filtered.forEach((t) => {
      if (days[t.date]) {
        if (t.type === 'Receita') {
          days[t.date].Receita += t.amount;
        } else {
          days[t.date].Despesa += t.amount;
        }
      }
    });

    return Object.values(days).sort((a, b) => a.dateNum - b.dateNum);
  }, [transactions, currentMonth]);

  // Mantemos o flowData legado para compatibilidade, selecionando o ideal
  const flowData = currentMonth === 'all' ? monthlyComparisonData : dailyFlowData;

  // --- 2. Dados de Categoria (Somente Despesas no período especificado) ---
  const categoryData = useMemo(() => {
    const periodTransactions = currentMonth === 'all' 
      ? transactions 
      : transactions.filter((t) => t.date.startsWith(currentMonth));
    
    const expenses = periodTransactions.filter((t) => t.type === 'Despesa');
    
    // Agrupa por micro categoria
    const groups: Record<string, { name: string; value: number }> = {};
    expenses.forEach((t) => {
      if (!groups[t.micro]) {
        groups[t.micro] = { name: t.micro, value: 0 };
      }
      groups[t.micro].value += t.amount;
    });

    // Converte para array e ordena decrescente
    return Object.values(groups)
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({
        ...item,
        color: COLORS[index % COLORS.length],
      }));
  }, [transactions, currentMonth]);

  const totalSpentPeriod = useMemo(() => {
    return categoryData.reduce((acc, c) => acc + c.value, 0);
  }, [categoryData]);

  const formatTooltipBRL = (value: any) => {
    return [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, ''];
  };

  return (
    <div id="financial-charts-card" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full justify-between">
      <div>
        {/* Header com botões de alternação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-50 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 font-display">
              {chartType === 'flow' ? (
                <>
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  Fluxo de Caixa
                </>
              ) : (
                <>
                  <PieChart className="w-5 h-5 text-slate-400" />
                  Distribuição de Despesas
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentMonth === 'all' ? 'Dados consolidados de todo o período' : `Análise para o mês de ${currentMonth.split('-')[1]}/2026`}
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
            <button
              id="chart-toggle-flow"
              onClick={() => setChartType('flow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'flow'
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Entradas vs Saídas
            </button>
            <button
              id="chart-toggle-category"
              onClick={() => setChartType('category')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'category'
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              Gastos por Categoria
            </button>
          </div>
        </div>

        {/* Corpo do Gráfico */}
        <div className="relative min-h-[250px] w-full flex flex-col justify-between">
          
          {/* Sub-toggles de modo para o fluxo de caixa (mensal vs diário) */}
          {chartType === 'flow' && currentMonth !== 'all' && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-150/50 border border-slate-200/40 rounded-xl max-w-fit mb-4">
              <button
                onClick={() => setFlowMode('monthly')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  flowMode === 'monthly'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Comparativo Mensal (Barras)
              </button>
              <button
                onClick={() => setFlowMode('daily')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  flowMode === 'daily'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Evolução Diária (Área)
              </button>
            </div>
          )}

          {chartType === 'flow' ? (
            (currentMonth === 'all' || flowMode === 'monthly') ? (
              monthlyComparisonData.length === 0 ? (
                <div className="text-center text-slate-400 py-10 font-sans w-full">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="font-medium text-sm">Sem dados suficientes para gerar fluxo de caixa.</p>
                </div>
              ) : (
                /* Gráfico de Barras Agrupado para Visão Anual/Completa - COMPARATIVO MENSAL LADO A LADO */
                <div className="w-full h-[250px] font-mono text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#94a3b8" />
                      <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                      <Tooltip
                        formatter={formatTooltipBRL}
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="Receita" name="Receita (R$)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Despesa" name="Despesa (R$)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            ) : (
              dailyFlowData.length === 0 ? (
                <div className="text-center text-slate-400 py-10 font-sans w-full">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p className="font-medium text-sm">Sem dados suficientes para gerar fluxo de caixa diário.</p>
                </div>
              ) : (
                /* Gráfico de Linha/Área Suave para Visualização Mensal Diária */
                <div className="w-full h-[250px] font-mono text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#94a3b8" />
                      <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                      <Tooltip
                        formatter={formatTooltipBRL}
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Area type="monotone" dataKey="Receita" name="Receita (R$)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIn)" />
                      <Area type="monotone" dataKey="Despesa" name="Despesa (R$)" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOut)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )
            )
          ) : (
            /* Gráfico de Pizza de Categorias de Despesas */
            categoryData.length === 0 ? (
              <div className="text-center text-slate-400 py-10 font-sans">
                <PieChart className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="font-medium text-sm">Nenhuma despesa para exibir no período selecionado.</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-around w-full h-[250px] gap-4">
                <div className="w-[160px] h-[160px] flex-shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatTooltipBRL} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  
                  {/* Centro da Rosca */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      R$ {totalSpentPeriod.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Legendas customizadas e roláveis no mobile */}
                <div className="flex-1 max-h-[180px] overflow-y-auto w-full px-2 space-y-2">
                  {categoryData.slice(0, 5).map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: category.color }}></span>
                        <span className="truncate font-medium text-slate-600" title={category.name}>{category.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800 whitespace-nowrap">
                        R$ {category.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({((category.value / totalSpentPeriod) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                  {categoryData.length > 5 && (
                    <p className="text-[10px] text-center text-slate-400 italic">
                      + {categoryData.length - 5} outras categorias de gastos menores
                    </p>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Roda-pé decorativo informativo */}
      {chartType === 'flow' && flowData.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-sans">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Entradas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Saídas
          </span>
          <span className="text-slate-500 italic">Atualizado em tempo real</span>
        </div>
      )}
    </div>
  );
};
