import { chat } from '@/lib/ollama'
import { getPurchases, getDeposits } from '@/lib/nessie'
import { createAuthClient } from '@/lib/supabase'
import type { FinancialProfile, SpendingCategory, Transaction } from '@/lib/types'

const SYSTEM_PROMPT = `You are a financial analyst agent. You will be given a list of transactions and must:
1. Categorize each transaction into one of: food, subscriptions, shopping, transport, entertainment, utilities, other
2. Identify flagged transactions (wasteful, risky, or recurring charges the user may have forgotten)
3. Return ONLY valid JSON with no explanation.

Response format:
{
  "categories": { "food": 0, "subscriptions": 0, "shopping": 0, "transport": 0, "entertainment": 0, "utilities": 0, "other": 0 },
  "flagged": [{ "merchant": "...", "reason": "..." }]
}`

function calculateScore(totalSpent: number, totalIncome: number, goalAmount: number): number {
  if (totalIncome === 0) return 50
  const savingsRate = (totalIncome - totalSpent) / totalIncome
  const withinGoal = totalSpent <= goalAmount ? 1 : goalAmount / totalSpent
  const raw = savingsRate * 0.5 + withinGoal * 0.5
  return Math.max(0, Math.min(100, Math.round(raw * 100)))
}

export async function runAnalystAgent(
  userId: string, accountId: string, goalAmount: number, token: string
): Promise<FinancialProfile> {
  const db = createAuthClient(token)

  const [purchases, deposits] = await Promise.all([
    getPurchases(accountId),
    getDeposits(accountId),
  ])

  const totalSpent: number  = purchases.reduce((sum: number, p: any) => sum + p.amount, 0)
  const totalIncome: number = deposits.reduce((sum: number, d: any) => sum + d.amount, 0)

  // Only send last 20 transactions to keep LLM response fast
  const recentPurchases = [...purchases].sort((a: any, b: any) =>
    new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
  ).slice(0, 20)

  const transactionList = recentPurchases
    .map((p: any) => `${p.description || p.merchant_id}: $${p.amount} on ${p.purchase_date}`)
    .join('\n')

  const llmResponse = await chat(
    SYSTEM_PROMPT,
    `Analyze these transactions and return JSON:\n${transactionList}`
  )

  let parsed: { categories: Record<SpendingCategory, number>; flagged: { merchant: string; reason: string }[] }
  try {
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { categories: {}, flagged: [] }
  } catch {
    parsed = {
      categories: { food: 0, subscriptions: 0, shopping: 0, transport: 0, entertainment: 0, utilities: 0, other: totalSpent },
      flagged: [],
    }
  }

  const score = calculateScore(totalSpent, totalIncome, goalAmount)

  const transactionRows = purchases.map((p: any) => ({
    user_id: userId,
    nessie_id: p._id,
    amount: p.amount,
    merchant: p.description || p.merchant_id,
    transaction_date: p.purchase_date,
    category: Object.entries(parsed.categories).find(([, v]) => typeof v === 'number' && v > 0)?.[0] ?? 'other',
    flagged: parsed.flagged.some((f) => f.merchant === (p.description || p.merchant_id)),
    flag_reason: parsed.flagged.find((f) => f.merchant === (p.description || p.merchant_id))?.reason ?? null,
  }))

  await db.from('transactions').delete().eq('user_id', userId)
  await db.from('transactions').insert(transactionRows)
  await db.from('weekly_goals')
    .update({ actual_spent: totalSpent, score })
    .eq('user_id', userId)
    .eq('completed', false)

  const flaggedTransactions: Transaction[] = transactionRows
    .filter((t: typeof transactionRows[0]) => t.flagged)
    .map((t: typeof transactionRows[0]) => ({ ...t, id: '', created_at: '' }))

  return {
    score,
    total_spent: totalSpent,
    total_income: totalIncome,
    categories: parsed.categories as Record<SpendingCategory, number>,
    flagged_transactions: flaggedTransactions,
    savings_rate: totalIncome > 0 ? (totalIncome - totalSpent) / totalIncome : 0,
  }
}
