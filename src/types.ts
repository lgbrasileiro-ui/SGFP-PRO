/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'Receita' | 'Despesa';

export interface Transaction {
  id: number | string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  macro: string; // e.g., 'Necessidades' | 'Desejos' | 'Poupança e Dívidas' for Despesa, or 'Renda Principal' | 'Renda Extra' | 'Investimentos/Resgates' for Receita
  micro: string; // e.g., 'Salário', 'Aluguel', 'Supermercado', 'Financiamento', 'Lazer'
  desc: string;  // Description
  amount: number; // Value in BRL (R$)
}

export interface BudgetRule {
  necessidades: number; // e.g., 50
  desejos: number;      // e.g., 30
  poupanca: number;     // e.g., 20
}

export interface MonthOption {
  value: string; // e.g., '2026-05'
  label: string; // e.g., 'Maio de 2026'
}

export const MACRO_DESPESAS = [
  'Necessidades',
  'Desejos',
  'Poupança e Dívidas'
];

export const MACRO_RECEITAS = [
  'Renda Principal',
  'Renda Extra',
  'Rendimentos'
];

// Presets for micro categories aligned with their macros
export const MICRO_PRESETS: Record<string, string[]> = {
  'Necessidades': [
    'Moradia & Aluguel',
    'Alimentação Básica',
    'Supermercado',
    'Transporte & Combustível',
    'Saúde & Convênio',
    'Educação',
    'Contas de Consumo (Água, Luz, Internet)',
    'Impostos & Seguros'
  ],
  'Desejos': [
    'Bares e Restaurantes',
    'Lazer e Entretenimento',
    'Viagens & Hospedagem',
    'Compras (Roupas, Eletrônicos)',
    'Assinaturas & Streaming',
    'Estética & Salão',
    'Presentes & Doações'
  ],
  'Poupança e Dívidas': [
    'Investimentos (Ações, Tesouro)',
    'Reserva de Emergência',
    'Previdência Privada',
    'Pagamento de Empréstimos',
    'Financiamento (Amortização)'
  ],
  'Renda Principal': [
    'Salário CLT',
    'Pró-labore',
    'Aposentadoria',
    'Prestação de Serviços'
  ],
  'Renda Extra': [
    'Freelance',
    'Venda de Bens',
    'Comissões & Prêmios',
    'Aulas & Palestras'
  ],
  'Rendimentos': [
    'Dividendos & FIIs',
    'Juros sobre Capital',
    'Rendimento de Poupança / Renda Fixa'
  ]
};
