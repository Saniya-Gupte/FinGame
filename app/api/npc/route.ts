import { NextRequest, NextResponse } from 'next/server'
import { runNPCAgent, NPCType, NPCMessage, NPCContext } from '@/agents/npc'
import { createAuthClient } from '@/lib/supabase'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId, npcType, messages } = await req.json() as {
      userId: string
      npcType: NPCType
      messages: NPCMessage[]
    }

    const db = createAuthClient(token)

    // Build context from DB
    const [{ data: goal }, { data: txns }, { data: gs }] = await Promise.all([
      db.from('weekly_goals').select('goal_amount,actual_spent,score')
        .eq('user_id', userId).eq('completed', false)
        .order('created_at', { ascending: false }).limit(1).single(),
      db.from('transactions').select('merchant,amount,category,flagged,flag_reason')
        .eq('user_id', userId).order('transaction_date', { ascending: false }).limit(30),
      db.from('game_state').select('points').eq('user_id', userId).single(),
    ])

    const categories: Record<string, number> = {}
    for (const t of txns ?? []) {
      const cat = t.category ?? 'other'
      categories[cat] = (categories[cat] ?? 0) + t.amount
    }

    const context: NPCContext = {
      totalSpent:  goal?.actual_spent ?? 0,
      goalAmount:  goal?.goal_amount  ?? 500,
      score:       goal?.score        ?? 0,
      categories,
      flaggedTransactions: (txns ?? [])
        .filter(t => t.flagged)
        .map(t => ({ merchant: t.merchant ?? 'Unknown', amount: t.amount, flag_reason: t.flag_reason })),
    }

    const reply = await runNPCAgent(npcType, messages, context)
    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('[npc]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
