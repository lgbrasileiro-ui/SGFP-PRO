/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, Sparkles, TrendingUp, HelpCircle, RefreshCcw, Check, Download, AlertTriangle, Menu, X, LayoutDashboard, Receipt, PieChart, Landmark, PiggyBank } from 'lucide-react';

import { Transaction, BudgetRule, MACRO_DESPESAS, MACRO_RECEITAS, MICRO_PRESETS } from './types';
import { KPICards } from './components/KPICards';
import { BudgetOverview } from './components/BudgetOverview';
import { CashFlowChart } from './components/CashFlowChart';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { SavingsGoalsPage } from './components/SavingsGoalsPage';

// Firebase integrations
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { LoginPage } from './components/LoginPage';

export default function App() {
  // --- Estados do Firebase Auth ---
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // --- Estados de Navegação e Menu (Sleek Interface) ---
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'transactions' | 'budgets' | 'demo' | 'savings'>('dashboard');

  const scrollToSection = (id: string, menuKey: 'dashboard' | 'transactions' | 'budgets' | 'demo' | 'savings') => {
    setActiveMenu(menuKey);
    setIsMobileSidebarOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- Estados de Dados Principais ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetRule, setBudgetRule] = useState<BudgetRule>({ necessidades: 50, desejos: 30, poupanca: 20 });
  const [receitasOverrides, setReceitasOverrides] = useState<Record<string, number>>({});

  // Filtro de Mês atual: default para Maio de 2026 ou 'all'
  const [currentMonth, setCurrentMonth] = useState<string>('2026-05');

  // Estados dos Modais e Transação sendo editada
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sistema de Toasts (Notificação Simples)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Monitoramento do Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  // Monitoramento do Firestore Data State
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgetRule({ necessidades: 50, desejos: 30, poupanca: 20 });
      setReceitasOverrides({});
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    let loadedSettings = false;
    let loadedTransactions = false;

    const checkLoaded = () => {
      if (loadedSettings && loadedTransactions) {
        setLoadingData(false);
      }
    };

    // Snapshot para configurações do Usuário
    const userDocRef = doc(db, 'users', user.uid);
    const unsubSettings = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.budgetRule) setBudgetRule(data.budgetRule);
        if (data.receitasOverrides) setReceitasOverrides(data.receitasOverrides);
      } else {
        // Inicializar o documento de configurações do usuário na nuvem
        setDoc(userDocRef, {
          budgetRule: { necessidades: 50, desejos: 30, poupanca: 20 },
          receitasOverrides: {},
          customMacrosDespesa: MACRO_DESPESAS,
          customMacrosReceita: MACRO_RECEITAS,
          customMicroPresets: MICRO_PRESETS
        }, { merge: true }).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        });
      }
      loadedSettings = true;
      checkLoaded();
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      loadedSettings = true;
      checkLoaded();
    });

    // Snapshot para transações do Usuário
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
    const unsubTransactions = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Transaction);
      });
      setTransactions(list);
      loadedTransactions = true;
      checkLoaded();
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}/transactions`);
      loadedTransactions = true;
      checkLoaded();
    });

    return () => {
      unsubSettings();
      unsubTransactions();
    };
  }, [user]);

  // Autodismiss do Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      triggerToast('Sessão encerrada com sucesso.', 'info');
    } catch (err) {
      console.error('Erro ao deslogar', err);
    }
  };


  // --- Processamento de Listas e Filtros Dinâmicos ---
  // Obtém todos os meses únicos das transações de forma dinâmica
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      const ym = t.date.substring(0, 7); // extrai YYYY-MM
      months.add(ym);
    });
    // Ordena de forma decrescente (mais recente primeiro)
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // --- Cálculos de KPIS do Período Filtrado ---
  const periodData = useMemo(() => {
    const filtered = currentMonth === 'all'
      ? transactions
      : transactions.filter((t) => t.date.startsWith(currentMonth));

    const calculatedReceitas = filtered.filter((t) => t.type === 'Receita').reduce((acc, t) => acc + t.amount, 0);
    const totalDespesas = filtered.filter((t) => t.type === 'Despesa').reduce((acc, t) => acc + t.amount, 0);

    const hasOverride = receitasOverrides[currentMonth] !== undefined;
    const totalReceitas = hasOverride ? receitasOverrides[currentMonth] : calculatedReceitas;
    const saldo = totalReceitas - totalDespesas;

    // Gastos por categoria macro para a regra de orçamento 50/30/20
    const gastoNecessidades = filtered.filter((t) => t.macro === 'Necessidades').reduce((acc, t) => acc + t.amount, 0);
    const gastoDesejos = filtered.filter((t) => t.macro === 'Desejos').reduce((acc, t) => acc + t.amount, 0);
    const gastoPoupanca = filtered.filter((t) => t.macro === 'Poupança e Dívidas').reduce((acc, t) => acc + t.amount, 0);

    // Economias reais (Receita - Necessidades - Desejos)
    const poupancaPotencial = totalReceitas - (gastoNecessidades + gastoDesejos);
    const savingsRate = totalReceitas > 0 ? (poupancaPotencial / totalReceitas) * 100 : 0;

    return {
      totalReceitas,
      totalDespesas,
      saldo,
      gastoNecessidades,
      gastoDesejos,
      gastoPoupanca,
      savingsRate,
      isReceitasOverridden: hasOverride,
    };
  }, [transactions, currentMonth, receitasOverrides]);

  // --- Handlers de Transações ---
  const handleSaveTransaction = async (txnData: any) => {
    if (!user) return;
    const pathForWrite = `users/${user.uid}/transactions`;
    
    try {
      if (txnData.id) {
        // Edição
        const docRef = doc(db, pathForWrite, txnData.id.toString());
        await updateDoc(docRef, {
          date: txnData.date,
          type: txnData.type,
          macro: txnData.macro,
          micro: txnData.micro,
          desc: txnData.desc || '',
          amount: parseFloat(txnData.amount),
          updatedAt: serverTimestamp()
        });
        triggerToast('Transação atualizada com sucesso!');
      } else {
        // Criação
        const newId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const docRef = doc(db, pathForWrite, newId);
        
        await setDoc(docRef, {
          id: newId,
          date: txnData.date,
          type: txnData.type,
          macro: txnData.macro,
          micro: txnData.micro,
          desc: txnData.desc || '',
          amount: parseFloat(txnData.amount),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        const addedMonth = txnData.date.substring(0, 7);
        setCurrentMonth(addedMonth);
        triggerToast('Nova transação cadastrada com sucesso!');
      }
    } catch (err) {
      handleFirestoreError(err, txnData.id ? OperationType.UPDATE : OperationType.CREATE, pathForWrite);
      triggerToast('Erro ao salvar transação.', 'error');
    }
    setTransactionToEdit(null);
  };

  const handleDeleteTransaction = async (id: string | number) => {
    if (!user) return;
    const pathForDelete = `users/${user.uid}/transactions/${id}`;
    try {
      await deleteDoc(doc(db, pathForDelete));
      triggerToast('Transação removida de sua base.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pathForDelete);
      triggerToast('Erro ao remover transação.', 'error');
    }
  };

  const handleImportTransactions = async (imported: Transaction[]) => {
    if (imported.length === 0) {
      triggerToast('A planilha está vazia ou não possui transações válidas.', 'error');
      return;
    }
    if (!user) return;

    try {
      const existingKeys = new Set(transactions.map((t) => `${t.date}_${t.type}_${t.desc.trim()}_${t.amount.toFixed(2)}`));
      const filteredNew = imported.filter((t) => !existingKeys.has(`${t.date}_${t.type}_${t.desc.trim()}_${t.amount.toFixed(2)}`));
      
      if (filteredNew.length === 0) {
        triggerToast('Todas as transações do arquivo já existem no sistema.', 'info');
        return;
      }

      const batch = writeBatch(db);
      filteredNew.forEach((txnData) => {
        const newId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${Math.floor(Math.random() * 1000)}`;
        const docRef = doc(db, `users/${user.uid}/transactions`, newId);
        batch.set(docRef, {
          id: newId,
          date: txnData.date,
          type: txnData.type,
          macro: txnData.macro,
          micro: txnData.micro,
          desc: txnData.desc || '',
          amount: parseFloat(txnData.amount.toString()),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      triggerToast(`${filteredNew.length} novas transações importadas! 🎉`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/transactions`);
      triggerToast('Erro ao importar transações.', 'error');
    }
  };

  const handleEditTransaction = (txn: Transaction) => {
    setTransactionToEdit(txn);
    setIsTransactionModalOpen(true);
  };

  const handleResetDemoData = async () => {
    if (!user) return;
    try {
      // Busca todas as transações diretamente do banco na nuvem para garantir a remoção
      const txColRef = collection(db, 'users', user.uid, 'transactions');
      const querySnapshot = await getDocs(txColRef);
      
      const batch = writeBatch(db);
      
      // Deleta cada documento encontrado no Firestore
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      const userDocRef = doc(db, 'users', user.uid);
      batch.set(userDocRef, {
        budgetRule: { necessidades: 50, desejos: 30, poupanca: 20 },
        receitasOverrides: {},
        customMacrosDespesa: MACRO_DESPESAS,
        customMacrosReceita: MACRO_RECEITAS,
        customMicroPresets: MICRO_PRESETS
      });

      await batch.commit();
      triggerToast('Todos os valores foram zerados com sucesso no banco de dados 🎉', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      triggerToast('Erro ao zerar dados no banco de dados.', 'error');
    }
    setCurrentMonth('all');
    setShowResetConfirm(false);
  };

  const formatPeriodTitle = () => {
    if (currentMonth === 'all') return 'Consolidado Geral';
    const [year, month] = currentMonth.split('-');
    const monthsPT = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthsPT[parseInt(month) - 1]} de ${year}`;
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse font-mono">SGFP PRO • Verificando Sessão...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginError={(err) => triggerToast(err, 'error')} />;
  }

  if (loadingData) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">SGFP PRO • Carregando orçamento em nuvem...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* Sidebar Nav: visible on md and up, toggleable on mobile */}
      <aside
        id="sidebar-nav"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-400 flex flex-col border-r border-slate-800 transition-transform duration-300 md:translate-x-0 md:static md:h-full flex-shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-900">
              <span className="font-bold text-lg font-display tracking-tighter">S</span>
            </div>
            <span className="text-white font-bold tracking-tight text-lg font-display">SGFP PRO</span>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 space-y-1.5 mt-4">
          <button
            onClick={() => scrollToSection('welcome-header', 'dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer text-left ${
              activeMenu === 'dashboard'
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 text-slate-400" />
            Visão Geral
          </button>

          <button
            onClick={() => scrollToSection('section-transactions', 'transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer text-left ${
              activeMenu === 'transactions'
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-5 h-5 text-slate-400" />
            Transações
          </button>

          <button
            onClick={() => scrollToSection('section-analytics', 'budgets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer text-left ${
              activeMenu === 'budgets'
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-5 h-5 text-slate-400" />
            Orçamentos
          </button>

          <button
            id="sidebar-btn-savings"
            onClick={() => {
              setActiveMenu('savings');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer text-left ${
              activeMenu === 'savings'
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <PiggyBank className="w-5 h-5 text-emerald-400" />
            Poupança e Metas
          </button>

          <div className="pt-6 border-t border-slate-800/50 my-4">
            <span className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Simulação</span>
            <button
              id="sidebar-btn-restore-demo"
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-rose-450 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer text-left"
            >
              <RefreshCcw className="w-4 h-4" />
              Zerar Demo
            </button>
          </div>
        </div>

        {/* Profile Card at Bottom */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/25">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-slate-700/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase block flex-shrink-0">
                  {user?.displayName ? user.displayName.substring(0, 2) : 'US'}
                </div>
              )}
              <div className="text-xs min-w-0 flex-1">
                <p className="text-white font-semibold truncate">{user?.displayName || 'Usuário'}</p>
                <p className="text-slate-500 truncate text-[10px]" title={user?.email || ''}>{user?.email || ''}</p>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="px-2.5 py-1.5 rounded-lg text-rose-450 hover:bg-rose-500/15 font-bold text-[10.5px] transition-colors cursor-pointer border border-rose-500/10 block flex-shrink-0"
              title="Encerrar sessão"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Main Container Window */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-6 h-16 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-slate-800 tracking-tight font-display text-sm">SGFP PRO</span>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Minimal Indicators on Mobile Header */}
            <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50">
              <Sparkles className="w-3 h-3 text-slate-500 animate-pulse" />
              <span>Sinc</span>
            </div>
          </div>
        </header>

        {/* Desktop Header Bar */}
        <header className="hidden md:flex items-center justify-between px-10 h-16 bg-white border-b border-slate-100 flex-shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel</span>
            <span className="text-slate-300">/</span>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
              {activeMenu === 'dashboard' ? 'Visão Geral' : activeMenu === 'transactions' ? 'Transações' : activeMenu === 'budgets' ? 'Orçamentos' : 'Poupança e Metas'}
            </span>
          </div>
          
          <div>
            {activeMenu !== 'savings' && (
              <button
                id="topbar-new-transaction"
                onClick={() => {
                  setTransactionToEdit(null);
                  setIsTransactionModalOpen(true);
                }}
                className="p-2 px-4 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl shadow-md shadow-emerald-650/15 transition-all flex items-center gap-2 cursor-pointer border border-emerald-500/10"
                title="Adicionar uma nova transação financeira"
              >
                <Plus className="w-4 h-4" /> Nova Transação
              </button>
            )}
          </div>
        </header>

        {/* Main Content Pane (scrollable) */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:p-10 scroll-smooth">
          {activeMenu === 'savings' ? (
            <SavingsGoalsPage user={user} triggerToast={triggerToast} />
          ) : (
            <>
              {/* Header section with Premium look from Sleek template */}
              <div id="welcome-header" className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display leading-none">
                Dashboard Financeiro
              </h1>
              <p className="text-slate-500 mt-2 text-xs md:text-sm">
                {currentMonth === 'all' 
                  ? 'Visão consolidada do seu patrimônio acumulado' 
                  : `${formatPeriodTitle()} • Visão Geral da Conta`}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Select Month wrapper with sleek borders */}
              <div className="relative">
                <select
                  id="select-month"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="w-full md:w-auto p-2.5 px-3 bg-white text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 appearance-none cursor-pointer pr-9 shadow-2xs hover:bg-slate-50/50 transition-colors"
                >
                  <option value="all">Ver Período Inteiro</option>
                  {availableMonths.map((ym) => {
                    const [year, month] = ym.split('-');
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const label = `${monthNames[parseInt(month) - 1]} / ${year}`;
                    return (
                      <option key={ym} value={ym}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* --- Camada 1: KPIs Financeiros --- */}
          <section id="section-kpis" className="mb-8">
            <KPICards
              saldo={periodData.saldo}
              totalReceitas={periodData.totalReceitas}
              totalDespesas={periodData.totalDespesas}
              savingsRate={periodData.savingsRate}
              targetSavings={budgetRule.poupanca}
              isReceitasOverridden={periodData.isReceitasOverridden}
              onUpdateReceitas={async (val) => {
                if (!user) return;
                const userDocRef = doc(db, 'users', user.uid);
                try {
                  const updatedOverrides = { ...receitasOverrides };
                  if (val === null) {
                    delete updatedOverrides[currentMonth];
                    await setDoc(userDocRef, { receitasOverrides: updatedOverrides }, { merge: true });
                    triggerToast('Valor manual de receitas removido!', 'info');
                  } else {
                    updatedOverrides[currentMonth] = val;
                    await setDoc(userDocRef, { receitasOverrides: updatedOverrides }, { merge: true });
                    triggerToast(`Valor de receita alterado manualmente para R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
                  }
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                  triggerToast('Erro ao reconfigurar receita manual.', 'error');
                }
              }}
            />
          </section>

          {/* --- Camada 2: Análises de Orçamento (Regra) e Gráficos de Fluxo --- */}
          <section id="section-analytics" className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            
            {/* Card da Regra de Orçamento 50/30/20 */}
            <div className="lg:col-span-4 flex flex-col justify-between">
              <BudgetOverview
                rule={budgetRule}
                onUpdateRule={async (newRule) => {
                  if (!user) return;
                  const userDocRef = doc(db, 'users', user.uid);
                  try {
                    await setDoc(userDocRef, { budgetRule: newRule }, { merge: true });
                    triggerToast('Regra de orçamento reconfigurada!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                    triggerToast('Erro ao atualizar limites orçamentários.', 'error');
                  }
                }}
                gastoNecessidades={periodData.gastoNecessidades}
                gastoDesejos={periodData.gastoDesejos}
                gastoPoupanca={periodData.gastoPoupanca}
                totalReceitas={periodData.totalReceitas}
              />
            </div>

            {/* Gráfico Recharts de Fluxo / Pizza de Categoria */}
            <div className="lg:col-span-8">
              <CashFlowChart
                transactions={transactions}
                currentMonth={currentMonth}
              />
            </div>

          </section>

          {/* --- Camada 3: Tabela de Filtro de Dados --- */}
          <section id="section-transactions">
            <TransactionList
              transactions={transactions}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              availableMonths={availableMonths}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onImportTransactions={handleImportTransactions}
            />
          </section>
            </>
          )}
        </main>
      </div>

      {/* Modal para Cadastro/Edição de Transação */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setTransactionToEdit(null);
        }}
        onSave={handleSaveTransaction}
        transactionToEdit={transactionToEdit}
      />

      {/* Modal Personalizado de Confirmação para Reset de Dados (Evita window.confirm bloqueado no iFrame) */}
      {showResetConfirm && (
        <div id="modal-reset-backdrop" className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div id="modal-reset-container" className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2 font-display">
              Zerar todos os valores?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Esta ação irá remover permanentemente todas as suas transações e limpar todos os valores financeiros cadastrados, deixando o sistema completamente zerado.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                id="btn-reset-confirm-cancel"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-reset-confirm-proceed"
                onClick={handleResetDemoData}
                className="py-2.5 px-4 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md shadow-amber-600/10 cursor-pointer"
              >
                Sim, zerar tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sistema Móvel Flutuante de Toasts */}
      {toast && (
        <div
          id="toast-floating"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 p-3.5 px-4 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-250 ${
            toast.type === 'success'
              ? 'bg-slate-900 border-slate-800 text-white'
              : toast.type === 'info'
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}
        >
          {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
