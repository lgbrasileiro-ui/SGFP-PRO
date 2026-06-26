/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, CreditCard, ChevronDown, Plus, AlertCircle } from 'lucide-react';
import { Transaction, MACRO_DESPESAS, MACRO_RECEITAS, MICRO_PRESETS, TransactionType } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionData: Omit<Transaction, 'id'> & { id?: string | number }) => void;
  transactionToEdit?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  transactionToEdit,
}) => {
  const [type, setType] = useState<TransactionType>('Despesa');
  const [date, setDate] = useState('');
  const [macro, setMacro] = useState('');
  const [micro, setMicro] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [isCustomMicro, setIsCustomMicro] = useState(false);
  const [customMicroValue, setCustomMicroValue] = useState('');

  // Categorias customizadas carregadas e salvas
  const [customMacrosDespesa, setCustomMacrosDespesa] = useState<string[]>(() => {
    const saved = localStorage.getItem('sgfp_custom_macros_despesa');
    return saved ? JSON.parse(saved) : [];
  });
  const [customMacrosReceita, setCustomMacrosReceita] = useState<string[]>(() => {
    const saved = localStorage.getItem('sgfp_custom_macros_receita');
    return saved ? JSON.parse(saved) : [];
  });
  const [customMicroPresets, setCustomMicroPresets] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('sgfp_custom_micro_presets');
    return saved ? JSON.parse(saved) : {};
  });

  const [isCustomMacro, setIsCustomMacro] = useState(false);
  const [customMacroValue, setCustomMacroValue] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const initialRef = useRef<HTMLInputElement>(null);

  // Computa macros atuais combinadas (padrão e custom)
  const currentMacros = type === 'Despesa'
    ? [...MACRO_DESPESAS, ...customMacrosDespesa]
    : [...MACRO_RECEITAS, ...customMacrosReceita];

  // Popula formulário se for edição ou limpa se for no-add
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setDate(transactionToEdit.date);
        
        // Verifica se a macro pertence à lista de conhecidas daquele tipo
        const mList = transactionToEdit.type === 'Despesa'
          ? [...MACRO_DESPESAS, ...customMacrosDespesa]
          : [...MACRO_RECEITAS, ...customMacrosReceita];
          
        if (!mList.includes(transactionToEdit.macro)) {
          // Salva nova categoria macro de forma persistente
          if (transactionToEdit.type === 'Despesa') {
            const updated = [...customMacrosDespesa, transactionToEdit.macro];
            setCustomMacrosDespesa(updated);
            localStorage.setItem('sgfp_custom_macros_despesa', JSON.stringify(updated));
          } else {
            const updated = [...customMacrosReceita, transactionToEdit.macro];
            setCustomMacrosReceita(updated);
            localStorage.setItem('sgfp_custom_macros_receita', JSON.stringify(updated));
          }
        }

        setMacro(transactionToEdit.macro);
        setIsCustomMacro(false);
        setCustomMacroValue('');
        
        // Verifica se a categoria micro do cara está nos presets padrão ou customizados da macro dele
        const defaultPresetsRef = MICRO_PRESETS[transactionToEdit.macro] || [];
        const customPresetsRef = customMicroPresets[transactionToEdit.macro] || [];
        const presets = [...defaultPresetsRef, ...customPresetsRef];
        
        if (presets.includes(transactionToEdit.micro)) {
          setMicro(transactionToEdit.micro);
          setIsCustomMicro(false);
        } else {
          setMicro('custom');
          setCustomMicroValue(transactionToEdit.micro);
          setIsCustomMicro(true);
        }
        
        setDesc(transactionToEdit.desc);
        setAmount(transactionToEdit.amount.toString());
      } else {
        // Modo Nova Transação - Valores Padrão
        setType('Despesa');
        // Define data para hoje
        const today = new Date().toISOString().substring(0, 10);
        setDate(today);
        setMacro(MACRO_DESPESAS[0]); // Necessidades
        setIsCustomMacro(false);
        setCustomMacroValue('');
        
        const defaultPresetsRef = MICRO_PRESETS[MACRO_DESPESAS[0]] || [];
        const customPresetsRef = customMicroPresets[MACRO_DESPESAS[0]] || [];
        const presets = [...defaultPresetsRef, ...customPresetsRef];

        setMicro(presets[0] || 'custom');
        setIsCustomMicro(!presets.length);
        setCustomMicroValue('');
        setDesc('');
        setAmount('');
      }
      setErrors({});
      // Autofoco
      setTimeout(() => {
        initialRef.current?.focus();
      }, 50);
    }
  }, [isOpen, transactionToEdit, customMacrosDespesa, customMacrosReceita]);

  // Altera presets de micro-categoria quando macro muda
  const handleMacroChange = (newMacro: string) => {
    setMacro(newMacro);
    const defaultPresetsRef = MICRO_PRESETS[newMacro] || [];
    const customPresetsRef = customMicroPresets[newMacro] || [];
    const presets = [...defaultPresetsRef, ...customPresetsRef];
    if (presets.length > 0) {
      setMicro(presets[0]);
      setIsCustomMicro(false);
    } else {
      setMicro('custom');
      setIsCustomMicro(true);
    }
  };

  const handleMacroSelectionChange = (val: string) => {
    if (val === 'new_custom_macro') {
      setIsCustomMacro(true);
      setMacro('');
      setMicro('custom');
      setIsCustomMicro(true);
    } else {
      setIsCustomMacro(false);
      handleMacroChange(val);
    }
  };

  // Altera categoria se mudar o tipo (Receita vs Despesa)
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const macros = newType === 'Despesa'
      ? [...MACRO_DESPESAS, ...customMacrosDespesa]
      : [...MACRO_RECEITAS, ...customMacrosReceita];
    const defaultMacro = macros[0];
    setMacro(defaultMacro);
    setIsCustomMacro(false);
    
    const defaultPresetsRef = MICRO_PRESETS[defaultMacro] || [];
    const customPresetsRef = customMicroPresets[defaultMacro] || [];
    const presets = [...defaultPresetsRef, ...customPresetsRef];
    setMicro(presets[0] || 'custom');
    setIsCustomMicro(!presets.length);
  };

  const handleMicroSelectionChange = (val: string) => {
    if (val === 'custom') {
      setIsCustomMicro(true);
      setMicro('custom');
    } else {
      setIsCustomMicro(false);
      setMicro(val);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Selecione uma data válida.';
    if (!desc.trim()) newErrors.desc = 'Descrição é obrigatória.';
    
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Insira um valor maior que R$ 0,00.';
    }

    if (isCustomMacro && !customMacroValue.trim()) {
      newErrors.macro = 'Especifique o nome da nova categoria macro.';
    }
    
    if (isCustomMicro && !customMicroValue.trim()) {
      newErrors.micro = 'Especifique a categoria ou escolha uma da lista.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let finalMacro = macro;
    if (isCustomMacro) {
      finalMacro = customMacroValue.trim();
      // Salva macro customizada de forma duradoura
      if (type === 'Despesa') {
        if (!customMacrosDespesa.includes(finalMacro) && !MACRO_DESPESAS.includes(finalMacro)) {
          const updated = [...customMacrosDespesa, finalMacro];
          setCustomMacrosDespesa(updated);
          localStorage.setItem('sgfp_custom_macros_despesa', JSON.stringify(updated));
        }
      } else {
        if (!customMacrosReceita.includes(finalMacro) && !MACRO_RECEITAS.includes(finalMacro)) {
          const updated = [...customMacrosReceita, finalMacro];
          setCustomMacrosReceita(updated);
          localStorage.setItem('sgfp_custom_macros_receita', JSON.stringify(updated));
        }
      }
    }

    const finalMicro = isCustomMicro ? customMicroValue.trim() : micro;
    if (isCustomMicro) {
      // Salva micro-categoria customizada no grupo correspondente
      const defaultPresetsRef = MICRO_PRESETS[finalMacro] || [];
      const customPresetsRef = customMicroPresets[finalMacro] || [];
      if (!defaultPresetsRef.includes(finalMicro) && !customPresetsRef.includes(finalMicro)) {
        const updatedPresetsForMacro = [...customPresetsRef, finalMicro];
        const updatedMicroPresets = {
          ...customMicroPresets,
          [finalMacro]: updatedPresetsForMacro
        };
        setCustomMicroPresets(updatedMicroPresets);
        localStorage.setItem('sgfp_custom_micro_presets', JSON.stringify(updatedMicroPresets));
      }
    }

    const finalAmount = parseFloat(amount);

    onSave({
      id: transactionToEdit?.id,
      date,
      type,
      macro: finalMacro,
      micro: finalMicro,
      desc: desc.trim(),
      amount: finalAmount,
    });
    onClose();
  };

  if (!isOpen) return null;

  const defaultPresetsRef = MICRO_PRESETS[macro] || [];
  const customPresetsRef = customMicroPresets[macro] || [];
  const currentPresets = [...defaultPresetsRef, ...customPresetsRef];

  return (
    <div id="modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div id="modal-container" className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${type === 'Receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 font-display">
                {transactionToEdit ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              <p className="text-xs text-slate-500">
                {transactionToEdit ? 'Modifique os campos abaixo' : 'Adicione uma transação ao seu financeiro'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Alternador de Tipo Receita/Despesa */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('Despesa')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === 'Despesa'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Despesa (Saída)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('Receita')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === 'Receita'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Receita (Entrada)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo Data */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white font-mono cursor-pointer ${
                  errors.date ? 'border-rose-300 ring-rose-100 ring-2' : ''
                }`}
              />
              {errors.date && <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.date}</p>}
            </div>

            {/* Campo Valor (R$) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white font-mono ${
                  errors.amount ? 'border-rose-300 ring-rose-100 ring-2' : ''
                }`}
              />
              {errors.amount && <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.amount}</p>}
            </div>
          </div>

          {/* Campo Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Descrição
            </label>
            <input
              ref={initialRef}
              type="text"
              placeholder="Ex: Supermercado do mês, Freelancer UI/UX"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={`w-full p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white ${
                errors.desc ? 'border-rose-300 ring-rose-100 ring-2' : ''
              }`}
            />
            {errors.desc && <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.desc}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Categoria Macro */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Categoria Macro ({type === 'Despesa' ? 'Regra' : 'Origem'})
              </label>
              <div className="relative">
                <select
                  value={isCustomMacro ? 'new_custom_macro' : macro}
                  onChange={(e) => handleMacroSelectionChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white appearance-none cursor-pointer"
                >
                  {currentMacros.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="new_custom_macro">+ Nova Categoria Macro...</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Categoria Micro */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Categoria Específica
              </label>
              <div className="relative">
                <select
                  value={isCustomMicro ? 'custom' : micro}
                  onChange={(e) => handleMicroSelectionChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white appearance-none cursor-pointer"
                >
                  {currentPresets.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="custom">+ Outra (Customizada)...</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Se escolheu Categoria Macro Personalizada, abre campo de texto */}
          {isCustomMacro && (
            <div className="animate-in slide-in-from-top-1.5 duration-150">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nome da Nova Categoria Macro
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Assinaturas de TI, Receita de Aluguel"
                  value={customMacroValue}
                  onChange={(e) => setCustomMacroValue(e.target.value)}
                  className={`w-full p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white pr-9 ${
                    errors.macro ? 'border-rose-300 ring-rose-100 ring-2' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
              {errors.macro && <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.macro}</p>}
            </div>
          )}

          {/* Se escolheu Categoria Específica Personalizada, abre campo texto */}
          {isCustomMicro && (
            <div className="animate-in slide-in-from-top-1.5 duration-150">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nome da Categoria Customizada
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Pet-shop, Streaming anime, Uber"
                  value={customMicroValue}
                  onChange={(e) => setCustomMicroValue(e.target.value)}
                  className={`w-full p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white pr-9 ${
                    errors.micro ? 'border-rose-300 ring-rose-100 ring-2' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
              {errors.micro && <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.micro}</p>}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`py-2.5 px-4 text-xs font-semibold text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm scroll-smooth cursor-pointer ${
                type === 'Receita'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Check className="w-4 h-4" /> R$ {transactionToEdit ? 'Salvar Edição' : 'Salvar Transação'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
