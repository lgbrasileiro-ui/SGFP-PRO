/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Maio de 2026 (Mês Atual)
  { id: '1', date: '2026-05-01', type: 'Receita', macro: 'Renda Principal', micro: 'Salário CLT', desc: 'Salário Mensal Principal', amount: 5000.00 },
  { id: '2', date: '2026-05-02', type: 'Despesa', macro: 'Necessidades', micro: 'Moradia & Aluguel', desc: 'Aluguel do Apartamento', amount: 1500.00 },
  { id: '3', date: '2026-05-05', type: 'Despesa', macro: 'Necessidades', micro: 'Supermercado', desc: 'Supermercado Mensal', amount: 600.00 },
  { id: '4', date: '2026-05-10', type: 'Despesa', macro: 'Desejos', micro: 'Bares e Restaurantes', desc: 'Jantar de Aniversário', amount: 150.00 },
  { id: '5', date: '2026-05-15', type: 'Receita', macro: 'Renda Extra', micro: 'Freelance', desc: 'Projeto UI/UX Landing Page', amount: 800.00 },
  { id: '6', date: '2026-05-18', type: 'Despesa', macro: 'Desejos', micro: 'Lazer e Entretenimento', desc: 'Ingressos Show Indie', amount: 250.00 },
  { id: '7', date: '2026-05-20', type: 'Despesa', macro: 'Poupança e Dívidas', micro: 'Investimentos (Ações, Tesouro)', desc: 'Aporte Tesouro Direto 2035', amount: 500.00 },
  { id: '8', date: '2026-05-22', type: 'Despesa', macro: 'Necessidades', micro: 'Transporte & Combustível', desc: 'Abastecimento Carro', amount: 120.00 },
  { id: '9', date: '2026-05-22', type: 'Despesa', macro: 'Necessidades', micro: 'Contas de Consumo (Água, Luz, Internet)', desc: 'Conta de Energia Elétrica', amount: 185.50 },
  
  // Abril de 2026 (Mês Anterior)
  { id: '10', date: '2026-04-01', type: 'Receita', macro: 'Renda Principal', micro: 'Salário CLT', desc: 'Salário Mensal Principal', amount: 5000.00 },
  { id: '11', date: '2026-04-02', type: 'Despesa', macro: 'Necessidades', micro: 'Moradia & Aluguel', desc: 'Aluguel do Apartamento', amount: 1500.00 },
  { id: '12', date: '2026-04-06', type: 'Despesa', macro: 'Necessidades', micro: 'Supermercado', desc: 'Compras Semanais', amount: 720.00 },
  { id: '13', date: '2026-04-12', type: 'Despesa', macro: 'Desejos', micro: 'Compras (Roupas, Eletrônicos)', desc: 'Tênis de Corrida', amount: 399.90 },
  { id: '14', date: '2026-04-15', type: 'Receita', macro: 'Renda Extra', micro: 'Freelance', desc: 'Manutenção de Site WordPress', amount: 450.00 },
  { id: '15', date: '2026-04-18', type: 'Despesa', macro: 'Desejos', micro: 'Bares e Restaurantes', desc: 'Almoço Fim de Semana', amount: 120.00 },
  { id: '16', date: '2026-04-20', type: 'Despesa', macro: 'Poupança e Dívidas', micro: 'Investimentos (Ações, Tesouro)', desc: 'Aporte CDB Liquidez Diária', amount: 1000.00 },
  { id: '17', date: '2026-04-25', type: 'Despesa', macro: 'Necessidades', micro: 'Contas de Consumo (Água, Luz, Internet)', desc: 'Fatura de Telefone & Internet', amount: 110.00 },

  // Março de 2026
  { id: '18', date: '2026-03-01', type: 'Receita', macro: 'Renda Principal', micro: 'Salário CLT', desc: 'Salário Mensal Principal', amount: 5000.00 },
  { id: '19', date: '2026-03-02', type: 'Despesa', macro: 'Necessidades', micro: 'Moradia & Aluguel', desc: 'Aluguel do Apartamento', amount: 1500.00 },
  { id: '20', date: '2026-03-05', type: 'Despesa', macro: 'Necessidades', micro: 'Supermercado', desc: 'Rancho do Mês', amount: 580.00 },
  { id: '21', date: '2026-03-10', type: 'Despesa', macro: 'Desejos', micro: 'Viagens & Hospedagem', desc: 'Passagem ônibus Fim de Semana', amount: 180.00 },
  { id: '22', date: '2026-03-15', type: 'Receita', macro: 'Renda Extra', micro: 'Freelance', desc: 'Consultoria de Design', amount: 1200.00 },
  { id: '23', date: '2026-03-20', type: 'Despesa', macro: 'Poupança e Dívidas', micro: 'Investimentos (Ações, Tesouro)', desc: 'Compra de Ações de Fundos Imobiliários', amount: 1100.00 },
  { id: '24', date: '2026-03-24', type: 'Despesa', macro: 'Desejos', micro: 'Lazer e Entretenimento', desc: 'Cinema e Pipoca', amount: 75.00 },
  { id: '25', date: '2026-03-28', type: 'Despesa', macro: 'Necessidades', micro: 'Saúde & Convênio', desc: 'Farmácia de Uso Contínuo', amount: 140.00 }
];
