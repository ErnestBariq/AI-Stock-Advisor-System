import { pgTable, serial, text, integer, numeric, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// Ported from AI-Stock-Advisor-System (Cosmos DB, see SCHEMA.md) — normalized per
// its own recommendations: portfolio split out of the user doc, no duplicated
// company/news/monthly snapshots per holding (refetch or cache separately).

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  gender: text('gender'),
  age: integer('age'),
  investmentGoal: text('investment_goal'), // Income Generation | Growth | Capital Preservation
  riskAppetite: text('risk_appetite'), // Low | Medium | High
  timeHorizon: text('time_horizon'), // Short Term | Medium Term | Long Term | Lifetime
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const holdings = pgTable('holdings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(), // USD invested
  shares: numeric('shares', { precision: 18, scale: 6 }).notNull(),
  investmentType: text('investment_type'), // Lifetime | Short Term
  purchasePrice: numeric('purchase_price', { precision: 18, scale: 4 }),
  currentPrice: numeric('current_price', { precision: 18, scale: 4 }),
  dateOfPurchase: timestamp('date_of_purchase', { withTimezone: true }),
  predictedPrice: numeric('predicted_price', { precision: 18, scale: 4 }),
  riskAssessment: text('risk_assessment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Cache court-terme des données marché (quote/overview/news) — TTL applicatif,
// jamais dupliqué dans holdings (cf recommandation §2 de SCHEMA.md).
export const quoteCache = pgTable('quote_cache', {
  symbol: text('symbol').primaryKey(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});

// TradingAgents runs — décision multi-agent + calibration a posteriori.
// Alimente la Phase 3 roadmap Millionaire (persistance & calibration).
export const decisions = pgTable('decisions', {
  id: serial('id').primaryKey(),
  ticker: text('ticker').notNull(),
  runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
  recommendation: text('recommendation').notNull(), // Buy | Hold | Sell
  convictionScore: text('conviction_score'), // faible | moyen | fort (remplace Kelly littéral, cf roadmap Phase 2)
  deepThinkingModel: text('deep_thinking_model'), // ex: gemma4:26b
  quickThinkingModel: text('quick_thinking_model'), // ex: mistral-small3.2:latest
  agentOutput: jsonb('agent_output').notNull(), // debate transcript / reasoning complet
  toolCallVerified: boolean('tool_call_verified'), // garde-fou anti-fabrication (cf feedback trader.py)
  outcome: text('outcome'), // rempli a posteriori — pas d'exécution auto
  outcomeAt: timestamp('outcome_at', { withTimezone: true }),
  notes: text('notes'),
});
