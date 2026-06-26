/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Trash2, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  DollarSign, 
  Calendar, 
  Compass, 
  Check, 
  Target, 
  PlusCircle, 
  Award, 
  AlertCircle,
  Lightbulb,
  X,
  Sliders,
  ChevronRight,
  TrendingDown,
  Info,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  category: 'reserva' | 'viagem' | 'compras' | 'estudos' | 'casa' | 'outro';
  createdAt?: any;
}

interface SavingsGoalsPageProps {
  user: { uid: string; email?: string | null } | null;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function SavingsGoalsPage({ user, triggerToast }: SavingsGoalsPageProps) {
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for creating/editing a goal
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<SavingGoal['category']>('reserva');

  // Active Category Filter for viewing goals
  const [activeFilter, setActiveFilter] = useState<'all' | SavingGoal['category']>('all');

  // Interactive Chart View mode
  const [chartView, setChartView] = useState<'overview' | 'monthly'>('overview');

  // Input states for adding/withdrawing funds
  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<string, string>>({});
  const [activeGoalIdForFund, setActiveGoalIdForFund] = useState<string | null>(null);
  const [activeGoalIdForWithdraw, setActiveGoalIdForWithdraw] = useState<string | null>(null);

  // Active Financial Challenges
  const [acceptedChallenges, setAcceptedChallenges] = useState<string[]>([]);

  // Simulation calculator states
  const [simMonthly, setSimMonthly] = useState<number>(300);
  const [simInterest, setSimInterest] = useState<number>(10.75); // annual % rate
  const [simYears, setSimYears] = useState<number>(3);

  // Loaded Goals real-time listener from Firestore
  useEffect(() => {
    if (!user) {
      setGoals([]);
      setIsLoading(false);
      return;
    }

    try {
      const goalsColRef = collection(db, 'users', user.uid, 'savings_goals');
      const q = query(goalsColRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: SavingGoal[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || '',
            targetAmount: Number(data.targetAmount) || 0,
            currentAmount: Number(data.currentAmount) || 0,
            deadline: data.deadline || '',
            category: data.category || 'reserva',
            createdAt: data.createdAt,
          });
        });
        setGoals(list);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/savings_goals`);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  }, [user]);

  // Load challenges from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('financial_challenges');
    if (saved) {
      try {
        setAcceptedChallenges(JSON.parse(saved));
      } catch (e) {
         // ignore
      }
    }
  }, []);

  const handleToggleChallenge = (challengeId: string) => {
    let updated: string[];
    if (acceptedChallenges.includes(challengeId)) {
      updated = acceptedChallenges.filter(id => id !== challengeId);
      triggerToast('Desafio cancelado por enquanto.', 'info');
    } else {
      updated = [...acceptedChallenges, challengeId];
      triggerToast('Desafio aceito! Foco na meta! 🚀', 'success');
    }
    setAcceptedChallenges(updated);
    localStorage.setItem('financial_challenges', JSON.stringify(updated));
  };

  // Submit new goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      triggerToast('Por favor, faça login para salvar metas.', 'error');
      return;
    }

    const parsedTarget = parseFloat(targetAmount);
    const parsedCurrent = parseFloat(currentAmount || '0');

    if (!title.trim()) {
      triggerToast('Insira um título para o seu objetivo.', 'error');
      return;
    }
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      triggerToast('Insira um valor de meta maior que zero.', 'error');
      return;
    }

    try {
      const goalsColRef = collection(db, 'users', user.uid, 'savings_goals');
      await addDoc(goalsColRef, {
        title: title.trim(),
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        deadline: deadline || null,
        category,
        createdAt: serverTimestamp()
      });

      triggerToast('Seu novo sonho foi cadastrado com sucesso! 🌱', 'success');
      
      // Reset
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setCategory('reserva');
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/savings_goals`);
      triggerToast('Erro ao gravar a meta financeira.', 'error');
    }
  };

  // Delete a goal
  const handleDeleteGoal = async (goalId: string, goalTitle: string) => {
    if (!user) return;
    if (!window.confirm(`Tem certeza que deseja apagar a meta "${goalTitle}"?`)) return;

    try {
      const goalDocRef = doc(db, 'users', user.uid, 'savings_goals', goalId);
      await deleteDoc(goalDocRef);
      triggerToast(`Meta "${goalTitle}" removida com sucesso.`, 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/savings_goals/${goalId}`);
      triggerToast('Erro ao remover a meta.', 'error');
    }
  };

  // Fund a Goal
  const handleAddFunds = async (goal: SavingGoal, directVal?: number) => {
    if (!user) return;
    const amountVal = directVal !== undefined ? directVal : parseFloat(fundAmounts[goal.id] || '0');

    if (isNaN(amountVal) || amountVal <= 0) {
      triggerToast('Insira um valor válido de aporte.', 'error');
      return;
    }

    const newAmount = goal.currentAmount + amountVal;

    try {
      const goalDocRef = doc(db, 'users', user.uid, 'savings_goals', goal.id);
      await updateDoc(goalDocRef, {
        currentAmount: newAmount
      });
      triggerToast(`Você guardou +R$ ${amountVal.toLocaleString('pt-BR')} para "${goal.title}"! 🎉`, 'success');
      
      // Clear input
      setFundAmounts(prev => ({ ...prev, [goal.id]: '' }));
      setActiveGoalIdForFund(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/savings_goals/${goal.id}`);
      triggerToast('Erro ao aportar dinheiro.', 'error');
    }
  };

  // Withdraw Funds from a goal
  const handleWithdrawFunds = async (goal: SavingGoal, directVal?: number) => {
    if (!user) return;
    const amountVal = directVal !== undefined ? directVal : parseFloat(withdrawAmounts[goal.id] || '0');

    if (isNaN(amountVal) || amountVal <= 0) {
      triggerToast('Insira um valor válido para resgatar.', 'error');
      return;
    }

    if (amountVal > goal.currentAmount) {
      triggerToast('Você não pode resgatar mais do que o saldo atual dessa meta.', 'error');
      return;
    }

    const newAmount = goal.currentAmount - amountVal;

    try {
      const goalDocRef = doc(db, 'users', user.uid, 'savings_goals', goal.id);
      await updateDoc(goalDocRef, {
        currentAmount: newAmount
      });
      triggerToast(`Você retirou R$ ${amountVal.toLocaleString('pt-BR')} da meta "${goal.title}".`, 'info');
      
      // Clear input
      setWithdrawAmounts(prev => ({ ...prev, [goal.id]: '' }));
      setActiveGoalIdForWithdraw(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/savings_goals/${goal.id}`);
      triggerToast('Erro ao resgatar valores.', 'error');
    }
  };

  // Dynamic calculations for overall metrics
  const overallMetrics = useMemo(() => {
    let totalTarget = 0;
    let totalSaved = 0;
    let activeNo = 0;
    let completedNo = 0;

    goals.forEach(g => {
      totalTarget += g.targetAmount;
      totalSaved += g.currentAmount;
      if (g.currentAmount >= g.targetAmount) {
        completedNo += 1;
      } else {
        activeNo += 1;
      }
    });

    const percentage = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    
    return {
      totalTarget,
      totalSaved,
      percentage: Math.min(100, Math.max(0, percentage)),
      activeCount: activeNo,
      completedCount: completedNo
    };
  }, [goals]);

  // Map goals to Recharts data
  const chartData = useMemo(() => {
    if (goals.length === 0) {
      return [
        {
          name: 'Viagem dos Sonhos',
          fullTitle: 'Exemplo: Viagem de Férias',
          guardado: 1500,
          total: 5000,
          mensal: 350,
          completado: 30
        },
        {
          name: 'Reserva Emergência',
          fullTitle: 'Exemplo: Reserva de Emergência',
          guardado: 6000,
          total: 12000,
          mensal: 500,
          completado: 50
        },
        {
          name: 'Notebook Novo',
          fullTitle: 'Exemplo: Notebook Profissional',
          guardado: 4500,
          total: 4500,
          mensal: 0,
          completado: 100
        }
      ];
    }
    return goals.map(g => {
      // Calculate monthly required target
      let neededMonthly = 0;
      if (g.deadline) {
        const deadlineDate = new Date(g.deadline);
        const today = new Date();
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.max(1, diffDays / 30.4);
        const remainingToSave = g.targetAmount - g.currentAmount;
        neededMonthly = Math.max(0, remainingToSave / diffMonths);
      } else {
        // Assume standard 12 months for goals without a deadline
        const remainingToSave = g.targetAmount - g.currentAmount;
        neededMonthly = Math.max(0, remainingToSave / 12);
      }

      if (isNaN(neededMonthly) || !isFinite(neededMonthly)) {
        neededMonthly = 0;
      }

      return {
        name: g.title.length > 15 ? g.title.substring(0, 15) + '...' : g.title,
        fullTitle: g.title,
        guardado: g.currentAmount,
        total: g.targetAmount,
        mensal: neededMonthly,
        completado: Math.min(100, g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0)
      };
    });
  }, [goals]);

  // Simulation Calculations
  const simulationResults = useMemo(() => {
    const monthlyRate = Math.pow(1 + (simInterest / 100), 1 / 12) - 1;
    const months = simYears * 12;
    let accumulated = 0;
    let investedVal = 0;

    for (let i = 1; i <= months; i++) {
      accumulated = (accumulated + simMonthly) * (1 + monthlyRate);
      investedVal += simMonthly;
    }

    const jurosLucro = accumulated - investedVal;

    return {
      accumulated,
      investedVal,
      jurosLucro
    };
  }, [simMonthly, simInterest, simYears]);

  // Apply simulator presets
  const handleApplySimulatorPreset = (presetType: 'reserva' | 'conquista' | 'independencia') => {
    if (presetType === 'reserva') {
      setSimMonthly(300);
      setSimInterest(10.75); // approx CDI rate
      setSimYears(2);
      triggerToast('Preset "Reserva Rápida" carregado! 🛡️', 'info');
    } else if (presetType === 'conquista') {
      setSimMonthly(600);
      setSimInterest(11.25);
      setSimYears(4);
      triggerToast('Preset "Conquista de Médio Prazo" carregado! ✈️', 'info');
    } else if (presetType === 'independencia') {
      setSimMonthly(1200);
      setSimInterest(12.5);
      setSimYears(8);
      triggerToast('Preset "Foco Investidor Constante" carregado! 🚀', 'info');
    }
  };

  // Categories helper details
  const getCategoryDetails = (cat: SavingGoal['category']) => {
    switch (cat) {
      case 'reserva':
        return { 
          label: 'Reserva de Emergência', 
          badgeStyle: 'bg-amber-50 text-amber-700 border-amber-250/30 font-semibold', 
          icon: '🛡️', 
          colorClass: 'amber' 
        };
      case 'viagem':
        return { 
          label: 'Viagem & Férias', 
          badgeStyle: 'bg-blue-50 text-blue-700 border-blue-250/30 font-semibold', 
          icon: '✈️', 
          colorClass: 'blue' 
        };
      case 'compras':
        return { 
          label: 'Bens & Projetos', 
          badgeStyle: 'bg-purple-50 text-purple-700 border-purple-250/30 font-semibold', 
          icon: '💻', 
          colorClass: 'purple' 
        };
      case 'estudos':
        return { 
          label: 'Estudos & Carreira', 
          badgeStyle: 'bg-teal-50 text-teal-700 border-teal-250/30 font-semibold', 
          icon: '🎓', 
          colorClass: 'teal' 
        };
      case 'casa':
        return { 
          label: 'Moradia & Lar', 
          badgeStyle: 'bg-rose-50 text-rose-700 border-rose-250/30 font-semibold', 
          icon: '🏠', 
          colorClass: 'rose' 
        };
      default:
        return { 
          label: 'Outros Objetivos', 
          badgeStyle: 'bg-slate-50 text-slate-700 border-slate-250/30 font-semibold', 
          icon: '🎯', 
          colorClass: 'slate' 
        };
    }
  };

  const calculateMonthlyTarget = (g: SavingGoal) => {
    if (!g.deadline) return null;
    const deadlineDate = new Date(g.deadline);
    const today = new Date();
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Meta expirou / Hoje!';
    
    const diffMonths = diffDays / 30.4;
    const remainingToSave = g.targetAmount - g.currentAmount;
    
    if (remainingToSave <= 0) return 'Concluída! 🎉';

    const neededMonthly = remainingToSave / Math.max(1, diffMonths);

    return neededMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' / mês';
  };

  const calculateDaysLeft = (dateStr?: string) => {
    if (!dateStr) return null;
    const deadlineDate = new Date(dateStr);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filtering
  const filteredGoals = useMemo(() => {
    if (activeFilter === 'all') return goals;
    return goals.filter(g => g.category === activeFilter);
  }, [goals, activeFilter]);

  // Challenges feedback
  const challengesScore = acceptedChallenges.length;
  const getChallengeTitleAndMessage = () => {
    if (challengesScore === 0) return { label: 'Iniciante do Foco 🚶', text: 'Ative um desafio abaixo para exercitar sua disciplina contra compras por impulso.' };
    if (challengesScore === 1) return { label: 'Estágio Inicial 🌱', text: 'Excelente! Siga focado nos próximos dias para consolidar um hábito saudável.' };
    if (challengesScore === 2) return { label: 'Mentalidade Forte ⚡', text: 'Dois desafios ativos. Você está blindando o seu fluxo financeiro mensal!' };
    return { label: 'Mestre da Disciplina! 🏆', text: 'Parabéns pela determinação extrema em manter suas economias blindadas!' };
  };

  const challengeFeedback = getChallengeTitleAndMessage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      
      {/* Upper Navigation Header bar - Editorial Elegant Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/60 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-850 font-medium text-xs">
            <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
            <span>Educação Financeira Aplicada</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Poupança & Objetivos
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Economizar não é sobre privação; é sobre <strong className="text-slate-805">escolher conscientemente</strong> em qual momento realizar cada sonho, garantindo liberdade, maturidade e segurança sólida.
          </p>
        </div>

        <button
          id="btn-create-goal"
          onClick={() => setShowForm(!showForm)}
          className={`h-11 px-5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border ${
            showForm 
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-250/45' 
              : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] text-white border-transparent'
          }`}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 text-emerald-100" />}
          {showForm ? 'Fechar Formulário' : 'Criar Novo Objetivo'}
        </button>
      </div>

      {/* Creation form Redesigned: Sleek, compact grid with beautiful shadows */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200 shadow-md max-w-2xl animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                Planejamento do Sonho
              </h3>
              <p className="text-slate-800 font-bold text-sm leading-tight mt-1">Defina com exatidão sua meta</p>
            </div>
          </div>
          
          <form onSubmit={handleCreateGoal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">Título do Objetivo / Sonho</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reserva para 6 Meses, Intercâmbio, Notebook Novo..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">Valor Necessário (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">Saldo Atual Já Guardado (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">Data Limite Alvo (Se houver)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-805 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block">Categoria Relevante</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SavingGoal['category'])}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="reserva">🛡️ Reserva de Emergência</option>
                <option value="viagem">✈️ Viagem & Férias</option>
                <option value="compras">💻 Bens & Aquisições</option>
                <option value="estudos">🎓 Estudos & Carreira</option>
                <option value="casa">🏠 Moradia / Lar</option>
                <option value="outro">🎯 Outros Sonhos</option>
              </select>
            </div>

            <div className="col-span-1 sm:col-span-2 pt-4 flex items-center justify-end gap-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10"
              >
                <Check className="w-4 h-4" />
                Criar Objetivo
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Aggregate Overview Stats Redesigned: Premium Slate Vault Theme */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900 text-white rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-lg border border-slate-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -mt-32 -mr-32" />
          
          <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest font-mono">Visão Integrada de Sonhos</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-display">
                Seu Cofre de Objetivos Atuais
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl font-sans">
                Você poupou o equivalente a <strong className="text-emerald-400 font-bold">{overallMetrics.percentage.toFixed(1)}%</strong> do montante financeiro total estipulado para suas metas vigentes. Continue firme no caminho da regularidade!
              </p>
            </div>

            {/* General progress bar */}
            <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800/65">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs">
                <div className="text-slate-400">
                  Total Acumulado: <span className="text-emerald-400 font-bold block sm:inline text-sm font-mono ml-0.5">{overallMetrics.totalSaved.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                
                <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{overallMetrics.percentage.toFixed(1)}% Completo</span>
                </div>

                <div className="text-slate-405 text-slate-400 sm:text-right">
                  Alvo de Todas as Metas: <span className="text-white font-bold block sm:inline text-sm font-mono ml-0.5">{overallMetrics.totalTarget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden block">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700" 
                  style={{ width: `${overallMetrics.percentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-850 rounded-xl p-5 flex flex-col justify-between relative z-10 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Princípio Pedagógico</span>
              <p className="text-slate-300 text-xs leading-relaxed mt-2 italic font-sans">
                "Não economize o que sobra depois de gastar; gaste o que sobra depois de economizar."
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Ativas</span>
                <span className="text-sm font-black text-amber-400 font-mono">{overallMetrics.activeCount}</span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Concluídas</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{overallMetrics.completedCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[10px] uppercase font-mono">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conceito: Pague-se Primeiro</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Goals Ledger Column + Side Interactive widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Core Left Column: Focus List & Simulator */}
        <div className="lg:col-span-8 space-y-6">

          {/* Visual Analytics Bar Chart Card */}
          <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
            {goals.length === 0 && (
              <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center z-20 rounded-xl">
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl max-w-sm space-y-3.5 border border-slate-800 animate-in zoom-in-95 duration-200">
                  <div className="w-10 h-10 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <TrendingUp className="w-5 h-5 animate-bounce" />
                  </div>
                  <h4 className="text-sm font-extrabold font-display text-white">Análise de Objetivos</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Você ainda não possui metas cadastradas. Desative a visualização de demonstração criando seu primeiro objetivo no botão <strong className="text-emerald-400">Criar Novo Objetivo</strong>!
                  </p>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      const element = document.getElementById('btn-create-goal');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="p-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer w-full select-none"
                  >
                    Começar Meu Planejamento 🌱
                  </button>
                </div>
              </div>
            )}
            
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 ${goals.length === 0 ? 'opacity-30 select-none' : ''}`}>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Análise Prática de Investimento {goals.length === 0 && <span className="text-[9px] bg-slate-100 border text-slate-500 px-1.5 py-0.5 rounded font-mono font-medium">Visualização de Exemplo</span>}
                </h3>
                <p className="text-[11px] text-slate-500 font-sans">
                  Acompanhe o progresso das suas metas ativas em relação ao objetivo total e saiba o aporte ideal estimado.
                </p>
              </div>

              {/* Custom Interactive Tabs */}
              <div className="flex items-center gap-1 bg-slate-150 p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setChartView('overview')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    chartView === 'overview'
                      ? 'bg-white text-slate-900 shadow-3xs border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Saldo vs. Objetivo
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    chartView === 'monthly'
                      ? 'bg-white text-slate-900 shadow-3xs border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Meta Sugerida / Mês
                </button>
              </div>
            </div>

            <div className={`h-64 sm:h-80 w-full pt-1 ${goals.length === 0 ? 'opacity-25 select-none pointer-events-none' : ''}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(val) => 
                      val.toLocaleString('pt-BR', { notation: 'compact', compactDisplay: 'short' })
                    }
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as any;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 shadow-md text-xs space-y-1.5 font-sans">
                            <p className="font-bold border-b border-slate-850 pb-1 mb-1 text-slate-200">{data.fullTitle}</p>
                            {chartView === 'overview' ? (
                              <>
                                <p className="flex justify-between gap-4 text-emerald-400 font-medium">
                                  <span>Já Guardado:</span>
                                  <span className="font-mono font-bold">{data.guardado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </p>
                                <p className="flex justify-between gap-4 text-slate-350 font-medium">
                                  <span>Meta do Sonho:</span>
                                  <span className="font-mono font-bold">{data.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </p>
                                <p className="flex justify-between gap-4 text-indigo-300 font-medium border-t border-slate-850 pt-1">
                                  <span>Fração Completa:</span>
                                  <span className="font-mono font-bold text-white">{data.completado.toFixed(1)}%</span>
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="flex justify-between gap-4 text-indigo-400 font-medium">
                                  <span>Aporte Mensal:</span>
                                  <span className="font-mono font-bold">{data.mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / mês</span>
                                </p>
                                <p className="flex justify-between gap-4 text-slate-400 font-medium text-[10px]">
                                  <span>Meta Total:</span>
                                  <span className="font-mono">{data.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </p>
                              </>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, fontWeight: 500, fill: '#64748b' }}
                  />
                  {chartView === 'overview' ? (
                    <>
                      <Bar 
                        name="Já Guardado (R$)" 
                        dataKey="guardado" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        barSize={24}
                      />
                      <Bar 
                        name="Objetivo Definido (R$)" 
                        dataKey="total" 
                        fill="#94a3b8" 
                        radius={[4, 4, 0, 0]} 
                        barSize={24}
                      />
                    </>
                  ) : (
                    <Bar 
                      name="Aporte Mensal Ideal (R$/mês)" 
                      dataKey="mensal" 
                      fill="#6366f1" 
                      radius={[4, 4, 0, 0]} 
                      barSize={24}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              Seu Plano de Metas Ativas {goals.length > 0 && `(${goals.length})`}
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
              Real-time Firestore
            </span>
          </div>

          {/* Filtering Pivot Badges Bar */}
          {goals.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin flex-nowrap">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`h-9 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  activeFilter === 'all' 
                    ? 'bg-slate-900 text-white border-transparent shadow-sm' 
                    : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todos ({goals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('reserva')}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                  activeFilter === 'reserva' 
                    ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' 
                    : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🛡️</span>
                <span>Emergência ({goals.filter(g => g.category === 'reserva').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('viagem')}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                  activeFilter === 'viagem' 
                    ? 'bg-blue-50 text-blue-805 text-blue-800 border-blue-200 shadow-sm' 
                    : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>✈️</span>
                <span>Viagem ({goals.filter(g => g.category === 'viagem').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('compras')}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                  activeFilter === 'compras' 
                    ? 'bg-purple-50 text-purple-800 border-purple-200 shadow-sm' 
                    : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>💻</span>
                <span>Bens ({goals.filter(g => g.category === 'compras').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('estudos')}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                  activeFilter === 'estudos' 
                    ? 'bg-teal-50 text-teal-800 border-teal-200 shadow-sm' 
                    : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🎓</span>
                <span>Estudos ({goals.filter(g => g.category === 'estudos').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('casa')}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                  activeFilter === 'casa' 
                    ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-sm' 
                    : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🏠</span>
                <span>Lar ({goals.filter(g => g.category === 'casa').length})</span>
              </button>
            </div>
          )}

          {/* Loader and Empty Redesign States */}
          {isLoading ? (
            <div className="bg-white border rounded-xl p-12 text-center text-slate-500 font-medium">
              <span className="inline-block animate-spin mr-2">⏳</span> Carregando seus objetivos seguros do Firestore...
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-lg mx-auto border border-slate-200 border-dashed">
                📂
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-mono">Nenhum Objetivo Ativo</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Você ainda não cadastrou metas nesta categoria. Comece hoje a dar um rumo estratégico e de investimento ao seu dinheiro!
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveFilter('all');
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Cadastrar Seu Primeiro Sonho
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGoals.map((g) => {
                const percentage = Math.min(100, g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0);
                const isCompleted = percentage >= 100;
                const catDetails = getCategoryDetails(g.category);
                const daysLeft = calculateDaysLeft(g.deadline);
                const showFundForm = activeGoalIdForFund === g.id;
                const showWithdrawForm = activeGoalIdForWithdraw === g.id;

                return (
                  <div 
                    key={g.id} 
                    className={`bg-white rounded-xl p-5 md:p-6 border transition-all duration-300 relative ${
                      isCompleted ? 'border-emerald-300 bg-emerald-50/5 shadow-emerald-500/5' : 'border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    {/* Goal Card Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none select-none">{catDetails.icon}</span>
                          <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">
                            {g.title}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border tracking-wide font-medium ${catDetails.badgeStyle}`}>
                            {catDetails.label}
                          </span>
                          {g.deadline && (
                            <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 rounded-full px-2.5 py-0.5 flex items-center gap-1 font-mono font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Prazo: {new Date(g.deadline).toLocaleDateString('pt-BR')} 
                              {daysLeft !== null && (
                                <strong className={`ml-1 ${daysLeft <= 30 && !isCompleted ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                  ({daysLeft}d restando)
                                </strong>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteGoal(g.id, g.title)}
                        className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                        title="Remover meta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress indicators and graphic bar */}
                    <div className="my-5 space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs">
                        <div className="text-slate-500">
                          Guardado: <span className="text-slate-900 font-bold font-mono text-sm">{g.currentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <span className="text-emerald-700 bg-emerald-100/90 text-[10px] font-bold rounded-md px-2.5 py-0.5 flex items-center gap-1 border border-emerald-200">
                              Alcançado! 🏆
                            </span>
                          ) : (
                            <span className="text-slate-550 text-[10px] bg-white border border-slate-205 text-slate-500 px-2 py-0.5 rounded font-mono font-medium">
                              Faltam R$ {(g.targetAmount - g.currentAmount).toLocaleString('pt-BR')}
                            </span>
                          )}
                          <span className={`text-sm font-black font-mono ${isCompleted ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Micro Progress Track */}
                      <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden block relative p-[1px]">
                        <div 
                          className={`h-full rounded-full transition-all duration-750 ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                              : 'bg-gradient-to-r from-indigo-600 to-indigo-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Smart Advisory monthly recommendation */}
                    {g.deadline && !isCompleted && (
                      <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-4">
                        <div className="flex items-center gap-1.5 text-slate-655 text-slate-600">
                          <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="font-medium">Para atingir o prazo sugerimos guardar mensalmente:</span>
                        </div>
                        <span className="font-bold text-indigo-700 bg-white px-2.5 py-1 rounded font-mono border border-indigo-100 shadow-3xs">
                          {calculateMonthlyTarget(g)}
                        </span>
                      </div>
                    )}

                    {/* Action buttons inside Goals ledger cards */}
                    <div className="flex items-center gap-3 border-t border-slate-100 pt-4 flex-wrap select-none">
                      {!showFundForm && !showWithdrawForm && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full justify-between sm:items-center">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setActiveGoalIdForFund(g.id);
                                setActiveGoalIdForWithdraw(null);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200/50"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Aportar
                            </button>
                            
                            {g.currentAmount > 0 && (
                              <button
                                onClick={() => {
                                  setActiveGoalIdForWithdraw(g.id);
                                  setActiveGoalIdForFund(null);
                                }}
                                className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                                Retirar
                              </button>
                            )}
                          </div>

                          {/* Instant express presets */}
                          {!isCompleted && (
                            <div className="flex items-center gap-1 sm:self-center bg-slate-50/50 p-1 rounded-lg border border-slate-205">
                              <span className="text-[9px] text-slate-400 uppercase font-black px-2 mt-0.5 font-mono">Aportes Express:</span>
                              <button
                                type="button"
                                onClick={() => handleAddFunds(g, 50)}
                                className="px-2.5 py-1 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded bg-white border border-slate-200 cursor-pointer text-slate-600"
                              >
                                +R$ 50
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFunds(g, 100)}
                                className="px-2.5 py-1 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded bg-white border border-slate-200 cursor-pointer text-slate-600"
                              >
                                +R$ 100
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddFunds(g, 500)}
                                className="px-2.5 py-1 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded bg-white border border-slate-200 cursor-pointer text-slate-600"
                              >
                                +R$ 500
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Deposit panel */}
                      {showFundForm && (
                        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/80 animate-in slide-in-from-left-2 duration-200">
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <PlusCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-800">Aporte Monetário:</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={fundAmounts[g.id] || ''}
                                onChange={(e) => setFundAmounts(prev => ({ ...prev, [g.id]: e.target.value }))}
                                placeholder="0.00"
                                className="p-1.5 pl-7 border border-slate-200 rounded text-xs font-bold text-slate-900 w-28 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                autoFocus
                              />
                            </div>
                            
                            <button
                              onClick={() => handleAddFunds(g)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded px-3 cursor-pointer transition-colors"
                            >
                              Aportar
                            </button>

                            {/* Shortcut panel inside active fund state */}
                            <div className="flex items-center gap-1 bg-white border border-slate-205 rounded p-0.5">
                              <button
                                type="button"
                                onClick={() => setFundAmounts(prev => ({ ...prev, [g.id]: '100' }))}
                                className="px-2 py-0.5 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded"
                              >
                                100
                              </button>
                              <button
                                type="button"
                                onClick={() => setFundAmounts(prev => ({ ...prev, [g.id]: '500' }))}
                                className="px-2 py-0.5 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded"
                              >
                                500
                              </button>
                              <button
                                type="button"
                                onClick={() => setFundAmounts(prev => ({ ...prev, [g.id]: '1000' }))}
                                className="px-2 py-0.5 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded"
                              >
                                1k
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setFundAmounts(prev => ({ ...prev, [g.id]: '' }));
                                setActiveGoalIdForFund(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer ml-auto sm:ml-2"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Withdraw panel */}
                      {showWithdrawForm && (
                        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3 bg-rose-50/30 p-4 rounded-xl border border-rose-100/80 animate-in slide-in-from-left-2 duration-200">
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <DollarSign className="w-4 h-4 text-rose-600" />
                            <span className="text-xs font-bold text-slate-800">Registrar Saque / Ajuste:</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={withdrawAmounts[g.id] || ''}
                                onChange={(e) => setWithdrawAmounts(prev => ({ ...prev, [g.id]: e.target.value }))}
                                placeholder="0.00"
                                className="p-1.5 pl-7 border border-slate-200 rounded text-xs font-bold text-slate-900 w-28 bg-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
                                autoFocus
                              />
                            </div>
                            
                            <button
                              onClick={() => handleWithdrawFunds(g)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded px-4 cursor-pointer transition-colors"
                            >
                              Confirmar Retirada
                            </button>

                            <button
                              onClick={() => {
                                setWithdrawAmounts(prev => ({ ...prev, [g.id]: '' }));
                                setActiveGoalIdForWithdraw(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer ml-auto sm:ml-2"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SIMULATOR DO DINHEIRO INTELIGENTE Redesigned: Premium slider deck with real-time interest visuals */}
          <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none -mt-10 -mr-10" />
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
                    Simulador de Constância Financeira
                  </h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-lg font-sans">
                  Avalie o impacto multiplicador de aplicar valores recorrentes todos os meses em títulos de renda fixa e juros compostos ao longo do tempo.
                </p>
              </div>

              {/* Presets links */}
              <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleApplySimulatorPreset('reserva')}
                  className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-3xs transition-colors font-sans"
                >
                  Reserva Rápida
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySimulatorPreset('conquista')}
                  className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-3xs transition-colors font-sans"
                >
                  Médio Prazo
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySimulatorPreset('independencia')}
                  className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-3xs transition-colors font-sans"
                >
                  Max Investidor
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
              
              <div className="space-y-4">
                {/* slideraporte */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 font-medium">Aporte Mensal:</span>
                    <span className="text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded font-mono border border-indigo-100 shadow-3xs font-extrabold">R$ {simMonthly}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="5000"
                    step="50"
                    value={simMonthly}
                    onChange={(e) => setSimMonthly(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>R$ 50</span>
                    <span>R$ 5.000</span>
                  </div>
                </div>
                
                {/* slider taxa */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 font-medium">Taxa de Juros Anual (CDI/Prefixado):</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded font-mono border border-emerald-100 shadow-3xs font-extrabold">{simInterest}% a.a.</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="18"
                    step="0.25"
                    value={simInterest}
                    onChange={(e) => setSimInterest(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>2% a.a.</span>
                    <span>18% a.a.</span>
                  </div>
                </div>

                {/* slider years */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 font-medium">Anos Poupando:</span>
                    <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded font-mono border border-rose-100 shadow-3xs font-extrabold">{simYears} {simYears === 1 ? 'ano' : 'anos'}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={simYears}
                    onChange={(e) => setSimYears(Number(e.target.value))}
                    className="w-full accent-rose-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>1 ano</span>
                    <span>20 anos</span>
                  </div>
                </div>
              </div>

              {/* results cards */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-3xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Economizado</span>
                  <p className="text-base font-black text-slate-800 mt-0.5 font-mono">
                    {simulationResults.investedVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <span className="text-[9px] text-slate-400 block font-medium">Apenas seu Capital Inicial</span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-3xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Juros Acumulados</span>
                  <p className="text-base font-black text-emerald-600 mt-0.5 font-mono">
                    + {simulationResults.jurosLucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <span className="text-[9px] text-emerald-500 block font-medium">O que o dinheiro rendeu</span>
                </div>

                <div className="sm:col-span-2 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-100 rounded-lg relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-emerald-850 tracking-wider block">Patrimônio Líquido Acumulado</span>
                      <p className="text-xl font-bold text-slate-900 mt-1 font-mono leading-none">
                        {simulationResults.accumulated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <span className="text-xl select-none">💎</span>
                  </div>
                  <p className="text-[10.5px] text-emerald-800 mt-2 font-medium leading-relaxed">
                    Escolha de mestre! Sob rendimento anual aproximado de <strong className="text-emerald-990 font-bold">{simInterest}%</strong>, você acumulou um excelente patrimônio através da constância resiliente!
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Sidebar Column - Guidance & Daily Micro-Habit Tracker Game */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Guide Card Editorial Style */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-mono">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Diretrizes de Finanças Pessoais
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              O bem-estar e a paz de espírito não residem no volume ganho, mas no **direcionamento e constância do que retemos**.
            </p>

            <div className="space-y-4 border-t border-slate-100 pt-4 text-xs text-slate-800 font-sans">
              
              {/* Point 1 */}
              <div className="space-y-1 bg-slate-50/65 p-3 rounded-lg border border-slate-100/50 hover:bg-slate-50 transition-all duration-200">
                <div className="flex gap-2 items-center text-slate-900 font-bold">
                  <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] border border-amber-200">
                    1
                  </span>
                  <span>A Regra dos Três Dias</span>
                </div>
                <p className="text-slate-500 font-medium pl-7 leading-relaxed">
                  Para compras impulsivas online, salve nos favoritos e espere 3 dias inteiros. Se ainda parecer imprescindível, compre. Isso evita 80% das compras emocionais.
                </p>
              </div>

              {/* Point 2 */}
              <div className="space-y-1 bg-slate-50/65 p-3 rounded-lg border border-slate-100/50 hover:bg-slate-50 transition-all duration-200">
                <div className="flex gap-2 items-center text-slate-900 font-bold">
                  <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] border border-blue-200">
                    2
                  </span>
                  <span>Aporte Imediato</span>
                </div>
                <p className="text-slate-500 font-medium pl-7 leading-relaxed">
                  No instantâneo em que receber seu pagamento, realize primeiro o aporte na poupança dos sonhos. Esperar "sobrar no fim do mês" costuma resultar em poupança zero.
                </p>
              </div>

              {/* Point 3 */}
              <div className="space-y-1 bg-slate-50/65 p-3 rounded-lg border border-slate-100/50 hover:bg-slate-50 transition-all duration-200">
                <div className="flex gap-2 items-center text-slate-900 font-bold">
                  <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] border border-emerald-200">
                    3
                  </span>
                  <span>Saneamento de Assinaturas</span>
                </div>
                <p className="text-slate-500 font-medium pl-7 leading-relaxed">
                  Pequenas faturas de serviços recorrentes inativos parecem inócuas, mas sangram o seu poder financeiro anual. Cancele e direcione os valores a um objetivo real.
                </p>
              </div>

            </div>
          </div>

          {/* Gamified Weekly Challenges Widget */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider font-mono">Hábitos Práticos de Economia</span>
              <h3 className="text-sm font-extrabold tracking-tight font-display">Semana da Blindagem</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Assuma um dos compromissos voluntários abaixo para aprimorar sua disciplina financeira nos próximos dias.
            </p>

            {/* Interactive Progress Meter */}
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-xs font-sans">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-400 text-[9px] tracking-wide font-bold uppercase font-mono">Desafios Atuais:</span>
                <span className="text-emerald-400 font-bold font-mono text-[10.5px]">{challengesScore}/3 Concluídos</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden block">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    challengesScore === 3 ? 'bg-gradient-to-r from-teal-400 to-emerald-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(challengesScore / 3) * 100}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-white mt-2 leading-none">
                {challengeFeedback.label}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                {challengeFeedback.text}
              </p>
            </div>

            <div className="space-y-3.5 pt-4 border-t border-slate-800/80 font-sans">
              
              {/* Challenge 1 */}
              <div className="flex gap-3 text-xs items-start">
                <button
                  type="button"
                  onClick={() => handleToggleChallenge('impulse_free')}
                  className={`w-5 h-5 rounded border cursor-pointer flex-shrink-0 flex items-center justify-center transition-all ${
                    acceptedChallenges.includes('impulse_free')
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {acceptedChallenges.includes('impulse_free') && <Check className="w-3.5 h-3.5 font-bold text-slate-900" />}
                </button>
                <div className="space-y-0.5">
                  <h4 className={`font-bold leading-tight ${acceptedChallenges.includes('impulse_free') ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                    Sem Custos Supérfluos (7 dias)
                  </h4>
                  <p className="text-[10.5px] text-slate-400 leading-normal select-none">
                    Zero aquisições dispensáveis além das compras regulares essenciais de sobrevivência e transporte.
                  </p>
                </div>
              </div>

              {/* Challenge 2 */}
              <div className="flex gap-3 text-xs items-start">
                <button
                  type="button"
                  onClick={() => handleToggleChallenge('eat_home')}
                  className={`w-5 h-5 rounded border cursor-pointer flex-shrink-0 flex items-center justify-center transition-all ${
                    acceptedChallenges.includes('eat_home')
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {acceptedChallenges.includes('eat_home') && <Check className="w-3.5 h-3.5 font-bold text-slate-900" />}
                </button>
                <div className="space-y-0.5">
                  <h4 className={`font-bold leading-tight ${acceptedChallenges.includes('eat_home') ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                    Limitar Deliveries (Fim de semana)
                  </h4>
                  <p className="text-[10.5px] text-slate-400 leading-normal select-none">
                    Corte os deliveries e prepare suas próprias refeições caseiras para treinar paciência e gerar economia expressa.
                  </p>
                </div>
              </div>

              {/* Challenge 3 */}
              <div className="flex gap-3 text-xs items-start">
                <button
                  type="button"
                  onClick={() => handleToggleChallenge('extra_deposit')}
                  className={`w-5 h-5 rounded border cursor-pointer flex-shrink-0 flex items-center justify-center transition-all ${
                    acceptedChallenges.includes('extra_deposit')
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {acceptedChallenges.includes('extra_deposit') && <Check className="w-3.5 h-3.5 font-bold text-slate-900" />}
                </button>
                <div className="space-y-0.5">
                  <h4 className={`font-bold leading-tight ${acceptedChallenges.includes('extra_deposit') ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                    Transferência de Emergência
                  </h4>
                  <p className="text-[10.5px] text-slate-400 leading-normal select-none">
                    Realize um depósito voluntário extra de qualquer valor simbólico (ex: R$ 10,00) apenas para testar e validar sua regularidade.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
