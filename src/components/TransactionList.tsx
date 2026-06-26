/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ListFilter,
  Search,
  ArrowUpDown,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  X,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string | number) => void;
  currentMonth: string; // 'all' or 'YYYY-MM'
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  onImportTransactions: (imported: Transaction[]) => void;
}

type SortField = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  currentMonth,
  onMonthChange,
  availableMonths,
  onImportTransactions,
}) => {
  // Filtros internos
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'Todos'>('Todos');
  const [filterMacro, setFilterMacro] = useState<string>('Todos');

  // Ordenação
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reseta a página se os filtros mudarem
  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  // 1. Filtros e Pesquisa
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Filtro de mês (passado de cima)
      if (currentMonth !== 'all' && !t.date.startsWith(currentMonth)) {
        return false;
      }

      // Filtro de receita / despesa
      if (filterType !== 'Todos' && t.type !== filterType) {
        return false;
      }

      // Filtro de categoria macro
      if (filterMacro !== 'Todos' && t.macro !== filterMacro) {
        return false;
      }

      // Filtro de texto de busca (descrição, categoria específica ou macro)
      const keyword = search.toLowerCase();
      if (keyword) {
        const matchDesc = t.desc.toLowerCase().includes(keyword);
        const matchMicro = t.micro.toLowerCase().includes(keyword);
        const matchMacro = t.macro.toLowerCase().includes(keyword);
        return matchDesc || matchMicro || matchMacro;
      }

      return true;
    });
  }, [transactions, currentMonth, filterType, filterMacro, search]);

  // Lista única das categorias Macro disponíveis na lista atual para popular o filtro dinâmico
  const availableMacros = useMemo(() => {
    const macros = new Set<string>();
    transactions.forEach((t) => {
      // Se tiver filtro de tipo, só mostra macros daquele tipo
      if (filterType === 'Todos' || t.type === filterType) {
        macros.add(t.macro);
      }
    });
    return Array.from(macros);
  }, [transactions, filterType]);

  // 2. Ordenação
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredTransactions, sortField, sortOrder]);

  // 3. Paginação
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage) || 1;

  // Toggle de ordenação por cabeçalho
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getMacroBadgeColor = (macro: string) => {
    switch (macro) {
      case 'Necessidades':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Desejos':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Poupança e Dívidas':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Renda Principal':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Renda Extra':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const parseExcelDate = (val: any): string => {
    if (typeof val === 'number') {
      // SheetJS reads date numbers as days since 1899-12-30
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    
    const str = String(val).trim();
    // Ex: 22/05/2026
    const dmYRegex = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/;
    const matchDmy = str.match(dmYRegex);
    if (matchDmy) {
      const [_, d, m, y] = matchDmy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Ex: 2026-05-22
    const YmdRegex = /^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/;
    const matchYmd = str.match(YmdRegex);
    if (matchYmd) {
      const [_, y, m, d] = matchYmd;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Tenta Date parse standard
    const attemptDate = new Date(str);
    if (!isNaN(attemptDate.getTime())) {
      const y = attemptDate.getFullYear();
      const m = String(attemptDate.getMonth() + 1).padStart(2, '0');
      const d = String(attemptDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return new Date().toISOString().substring(0, 10);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para Array de Arrays
        const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (!sheetData || sheetData.length === 0) {
          alert('A planilha importada está vazia.');
          return;
        }

        // Encontrar cabeçalhos inteligentes
        const firstRow = sheetData[0];
        let dateIdx = -1;
        let typeIdx = -1;
        let macroIdx = -1;
        let microIdx = -1;
        let descIdx = -1;
        let amountIdx = -1;

        if (Array.isArray(firstRow)) {
          const headers = firstRow.map((h) => String(h ?? '').toLowerCase().trim());
          headers.forEach((h, idx) => {
            if (h.includes('dat') || h.includes('dia') || h.includes('vencimento')) dateIdx = idx;
            else if (h.includes('tip') || h.includes('type')) typeIdx = idx;
            else if (h.includes('macro') || h.includes('regra') || h.includes('classifica') || h.includes('grupo') || h.includes('categoria macro')) macroIdx = idx;
            else if (h.includes('micro') || h.includes('categoria') || h.includes('subcategoria') || h.includes('item')) microIdx = idx;
            else if (h.includes('desc') || h.includes('hist') || h.includes('origem') || h.includes('detalhe')) descIdx = idx;
            else if (h.includes('val') || h.includes('quant') || h.includes('import') || h.includes('receit') || h.includes('despes') || h.includes('pre') || h.includes('tot') || h.includes('amount')) amountIdx = idx;
          });
        }

        // Se nenhum mapeamento deu certo, usa posições padrão
        const hasHeaders = dateIdx !== -1 || descIdx !== -1 || amountIdx !== -1;
        const startIndex = hasHeaders ? 1 : 0;

        if (dateIdx === -1) dateIdx = 0;
        if (descIdx === -1) descIdx = 1;
        if (amountIdx === -1) amountIdx = 2;
        if (typeIdx === -1) typeIdx = 3;
        if (macroIdx === -1) macroIdx = 4;
        if (microIdx === -1) microIdx = 5;

        const importedTxns: Transaction[] = [];

        for (let i = startIndex; i < sheetData.length; i++) {
          const row = sheetData[i];
          if (!row || row.length === 0) continue;

          // Extrair data
          const rawDate = row[dateIdx];
          if (rawDate === undefined || rawDate === null || rawDate === '') continue;
          const parsedDate = parseExcelDate(rawDate);

          // Extrair descrição
          const desc = String(row[descIdx] ?? '').trim() || 'Importado via Planilha';

          // Extrair valor
          const rawAmount = row[amountIdx];
          let amount = 0;
          if (typeof rawAmount === 'number') {
            amount = Math.abs(rawAmount);
          } else if (rawAmount !== undefined && rawAmount !== null) {
            // Se for string, tentar limpar os caracteres (R$, pontos, espaços)
            const cleanStr = String(rawAmount)
              .replace(/R\$/gi, '')
              .replace(/\s/g, '')
              .replace(/\./g, '') // remove ponto de milhar
              .replace(',', '.'); // transforma virgula em ponto decimal
            amount = Math.abs(parseFloat(cleanStr)) || 0;
          }
          if (amount <= 0) continue; // ignora valores zerados/inválidos

          // Extrair tipo
          let rawType = String(row[typeIdx] ?? '').trim().toLowerCase();
          let type: 'Receita' | 'Despesa' = 'Despesa';
          if (rawType.includes('receit') || rawType.includes('rend') || rawType.includes('ganho') || rawType.includes('entr') || rawType.includes('income') || rawType.includes('+')) {
            type = 'Receita';
          } else if (rawType.includes('despes') || rawType.includes('gast') || rawType.includes('saida') || rawType.includes('pago') || rawType.includes('expense') || rawType.includes('-')) {
            type = 'Despesa';
          } else {
            // Tentar descobrir pelo sinal do valor se for especificado como negativo no excel
            if (typeof rawAmount === 'number' && rawAmount < 0) {
              type = 'Despesa';
            } else if (desc.toLowerCase().includes('receb') || desc.toLowerCase().includes('salari') || desc.toLowerCase().includes('renda')) {
              type = 'Receita';
            }
          }

          // Extrair categoria macro
          let macro = String(row[macroIdx] ?? '').trim();
          if (!macro) {
            macro = type === 'Receita' ? 'Renda Principal' : 'Necessidades';
          }

          // Extrair subcategoria
          let micro = String(row[microIdx] ?? '').trim();
          if (!micro) {
            micro = 'Outros';
          }

          importedTxns.push({
            id: `txn_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`,
            date: parsedDate,
            type,
            macro,
            micro,
            desc,
            amount,
          });
        }

        onImportTransactions(importedTxns);
      } catch (err) {
        console.error('Erro na importação', err);
        alert('Falha ao importar o arquivo. Verifique se o formato está correto.');
      }
      
      // Limpa input
      e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

  // Função para exportar em formato Excel (.xlsx) real
  const handleExportXLSX = () => {
    if (sortedTransactions.length === 0) return;

    // Cabeçalhos inteligentes formatados
    const headers = ['ID', 'Data', 'Tipo', 'Categoria Macro', 'Categoria Específica', 'Descrição', 'Valor (R$)'];
    
    // Preparar dados
    const data = sortedTransactions.map((t) => [
      t.id,
      t.date,
      t.type,
      t.macro,
      t.micro,
      t.desc,
      t.amount, // número real para o Excel somar adequadamente!
    ]);

    // Criar planilha
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Criar Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transações');

    // Salvar arquivo
    XLSX.writeFile(wb, `SGFP_Planilha_Transacoes_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Função para exportar os dados exibidos em formato CSV
  const handleExportCSV = () => {
    if (sortedTransactions.length === 0) return;

    // Cabeçalhos do CSV
    const headers = ['ID', 'Data', 'Tipo', 'Categoria Macro', 'Categoria Específica', 'Descrição', 'Valor (R$)'];
    
    // Linhas
    const rows = sortedTransactions.map((t) => [
      t.id,
      t.date,
      t.type,
      `"${t.macro.replace(/"/g, '""')}"`,
      `"${t.micro.replace(/"/g, '""')}"`,
      `"${t.desc.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
    ]);

    // Montando o conteúdo
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Gatilho de download
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SGFP_Exportacao_Transacoes_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="transactions-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
      <div>
        
        {/* Cabeçalho do Card */}
        <div className="p-6 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 font-display">
              <ListFilter className="w-5 h-5 text-slate-400" />
              Livro de Transações
            </h2>
            <p className="text-xs text-slate-500">
              Gerencie, filtre e examine todas as receitas e despesas registradas
            </p>
          </div>

          {/* Importação e Exportação XLSX e CSV */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <input
              type="file"
              id="import-excel-file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleImportExcel}
            />
            <label
              htmlFor="import-excel-file"
              className="p-2 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              title="Importar transações (.xlsx, .xls, .csv)"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar XLS/XLSX
            </label>

            <button
              id="btn-export-xlsx"
              disabled={sortedTransactions.length === 0}
              onClick={handleExportXLSX}
              className="p-2 px-3 text-xs font-semibold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title="Exportar dados filtrados para Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar XLSX
            </button>

            <button
              id="btn-export-csv"
              disabled={sortedTransactions.length === 0}
              onClick={handleExportCSV}
              className="p-2 px-3 text-xs font-semibold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title="Exportar dados filtrados para arquivo CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Pesquisa */}
        <div className="p-6 border-b border-slate-50 bg-white space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Pesquisa por texto */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Pesquisar transação..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleFilterChange(setSearch, '')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Seleção de Período (Mês / Ano) */}
            <div className="relative">
              <select
                value={currentMonth}
                onChange={(e) => handleFilterChange(onMonthChange, e.target.value)}
                className="w-full p-2.5 px-3.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white appearance-none cursor-pointer pr-8"
              >
                <option value="all">Período: Todos os meses</option>
                {availableMonths.map((ym) => {
                  const [year, month] = ym.split('-');
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const label = `${monthNames[parseInt(month) - 1]} / ${year}`;
                  return (
                    <option key={ym} value={ym}>
                      Mês: {label}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">
                ▼
              </div>
            </div>

            {/* 3. Seleção de Tipo (Receita / Despesa) */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => {
                  handleFilterChange(setFilterType, e.target.value);
                  setFilterMacro('Todos'); // Reseta a macro para evitar conflito de tipo
                }}
                className="w-full p-2.5 px-3.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white appearance-none cursor-pointer pr-8"
              >
                <option value="Todos">Tipo: Todos</option>
                <option value="Receita">Tipo: Receitas (+)</option>
                <option value="Despesa">Tipo: Despesas (-)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">
                ▼
              </div>
            </div>

            {/* 4. Seleção de Macro Categoria */}
            <div className="relative">
              <select
                value={filterMacro}
                onChange={(e) => handleFilterChange(setFilterMacro, e.target.value)}
                className="w-full p-2.5 px-3.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white appearance-none cursor-pointer pr-8"
              >
                <option value="Todos">Categoria: Todas</option>
                {availableMacros.map((macro) => (
                  <option key={macro} value={macro}>
                    Macro: {macro}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">
                ▼
              </div>
            </div>

          </div>

          {/* Ribbon Informativa / Chips de Filtros Ativados */}
          {(search || currentMonth !== 'all' || filterType !== 'Todos' || filterMacro !== 'Todos') && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filtros ativos:</span>
              
              {currentMonth !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-medium text-slate-600">
                  Período: {(() => {
                    const [year, month] = currentMonth.split('-');
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    return `${monthNames[parseInt(month) - 1]} / ${year}`;
                  })()}
                  <button onClick={() => onMonthChange('all')} className="hover:text-rose-600 cursor-pointer text-slate-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterType !== 'Todos' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[11px] font-medium text-indigo-700">
                  Tipo: {filterType}
                  <button onClick={() => setFilterType('Todos')} className="hover:text-rose-600 cursor-pointer text-indigo-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterMacro !== 'Todos' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full text-[11px] font-medium text-amber-700">
                  Macro: {filterMacro}
                  <button onClick={() => setFilterMacro('Todos')} className="hover:text-rose-600 cursor-pointer text-amber-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full text-[11px] font-medium text-blue-700">
                  Busca: "{search}"
                  <button onClick={() => setSearch('')} className="hover:text-rose-600 cursor-pointer text-blue-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={() => {
                  setSearch('');
                  setFilterType('Todos');
                  setFilterMacro('Todos');
                  onMonthChange('all');
                  setCurrentPage(1);
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline ml-2 transition-all cursor-pointer"
              >
                Limpar Tudo
              </button>

              <span className="text-[10px] text-slate-400 ml-auto font-mono italic">
                {filteredTransactions.length} encontrados
              </span>
            </div>
          )}

          {/* Se nenhum filtro tiver ativo, mostra resumo simples */}
          {!(search || currentMonth !== 'all' || filterType !== 'Todos' || filterMacro !== 'Todos') && (
            <div className="text-[11px] text-slate-400 font-mono italic text-right pt-1 pb-1">
              Exibindo todos os {filteredTransactions.length} registros sem filtros ativos
            </div>
          )}

        </div>

        {/* Tabela de Transações */}
        <div className="overflow-x-auto">
          {paginatedTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-sans flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-semibold text-sm">Nenhuma transação encontrada</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Tente reajustar seus filtros de pesquisa ou cadastrar uma nova transação.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th
                    className="py-3 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors select-none font-sans"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      Data
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'date' ? 'text-slate-800' : 'text-slate-400'}`} />
                    </div>
                  </th>
                  <th className="py-3 px-6 font-sans">Descrição / Origem</th>
                  <th className="py-3 px-6 font-sans hidden md:table-cell">Regra / Categoria Macro</th>
                  <th
                    className="py-3 px-6 text-right cursor-pointer hover:bg-slate-100/80 transition-colors select-none font-sans"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Valor (BRL)
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'amount' ? 'text-slate-800' : 'text-slate-400'}`} />
                    </div>
                  </th>
                  <th className="py-3 px-6 text-center font-sans w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((txn) => {
                  const isIncome = txn.type === 'Receita';
                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-slate-50/50 transition-colors group align-middle text-xs"
                    >
                      {/* Data */}
                      <td className="py-4 px-6 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(txn.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>

                      {/* Descricao & Categoria Específica */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800 group-hover:text-slate-900 leading-snug">
                          {txn.desc}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                          {txn.micro}
                        </div>
                      </td>

                      {/* Macro Categorias com Badges */}
                      <td className="py-4 px-6 hidden md:table-cell whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 border text-[10px] font-semibold rounded-full items-center gap-1 leading-none ${getMacroBadgeColor(txn.macro)}`}>
                          <span className={`w-1 h-1 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {txn.macro}
                        </span>
                      </td>

                      {/* Valor Formatado */}
                      <td className="py-4 px-6 text-right font-semibold font-mono whitespace-nowrap">
                        <span className={isIncome ? 'text-emerald-600' : 'text-slate-800'}>
                          {isIncome ? '+' : '-'} {formatBRL(txn.amount)}
                        </span>
                      </td>

                      {/* Botões Editar / Deletar */}
                      <td className="py-4 px-6 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEdit(txn)}
                            className="p-1 px-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-50 transition-all cursor-pointer"
                            title="Editar Transação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(txn.id)}
                            className="p-1 px-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50/80 transition-all cursor-pointer"
                            title="Deletar Transação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Roda-pé de Paginação */}
      {sortedTransactions.length > itemsPerPage && (
        <div className="p-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-500 font-sans">
            Mostrando <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * itemsPerPage, sortedTransactions.length)}
            </span>{' '}
            de <span className="font-bold text-slate-800">{sortedTransactions.length}</span> transações
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="font-semibold text-slate-800 font-sans px-1">
              Pág. {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
