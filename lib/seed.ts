import { createCustomer, createAccount, createPurchase, getAccounts } from './nessie'

const BASE_URL = process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com'
const API_KEY  = process.env.NESSIE_API_KEY!

async function createDeposit(accountId: string, amount: number, date: string, description: string) {
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/deposits?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medium: 'balance', transaction_date: date, status: 'completed', amount, description }),
  })
  return res.json()
}

// Real Nessie sandbox merchant IDs
const MERCHANTS = [
  { id: '57cf75cea73e494d8675ec4d', name: 'Ithaca Bakery',          category: 'food',          min: 8,  max: 20  },
  { id: '57cf75cea73e494d8675ec56', name: 'Ithaca Coffee Company',   category: 'food',          min: 4,  max: 9   },
  { id: '57cf75cea73e494d8675ec55', name: 'Saigon Kitchen',          category: 'food',          min: 12, max: 35  },
  { id: '57cf75cea73e494d8675ec50', name: 'Terra Rosa',              category: 'food',          min: 10, max: 28  },
  { id: '57cf75cea73e494d8675ec49', name: 'Apple',                   category: 'subscriptions', min: 10, max: 15  },
  { id: '57cf75cea73e494d8675ec53', name: 'AT&T',                    category: 'subscriptions', min: 55, max: 80  },
  { id: '57cf75cea73e494d8675ec4a', name: 'Pastimes Antiques',       category: 'shopping',      min: 20, max: 90  },
  { id: '57cf75cea73e494d8675ec52', name: 'Dollar Tree',             category: 'shopping',      min: 15, max: 40  },
  { id: '57cf75cea73e494d8675ec58', name: 'The Bookery',             category: 'shopping',      min: 12, max: 50  },
  { id: '57cf75cea73e494d8675ec51', name: 'shworldofgifts',          category: 'entertainment', min: 15, max: 60  },
  { id: '57cf75cea73e494d8675ec54', name: 'Six Mile Creek Vineyard', category: 'entertainment', min: 20, max: 45  },
  { id: '57cf75cea73e494d8675ec4c', name: 'Taughannock Farms Inn',   category: 'utilities',     min: 50, max: 120 },
  { id: '57cf75cea73e494d8675ec4e', name: 'Aurora Inn',              category: 'utilities',     min: 60, max: 100 },
]

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function seedNessieAccount(firstName: string, lastName: string) {
  const customerRes = await createCustomer(firstName, lastName)
  const customerId = customerRes.objectCreated._id

  const accountRes = await createAccount(customerId, 3000)
  const accountId = accountRes.objectCreated._id

  // Weekly income deposits (4 weeks)
  const depositPromises = [0, 7, 14, 21].map(daysBack =>
    createDeposit(accountId, rand(1800, 2200), daysAgo(daysBack), 'Paycheck')
  )

  // Daily purchases (28 days, 2-3 per day)
  const purchasePromises: Promise<any>[] = []
  for (let day = 27; day >= 0; day--) {
    const date = daysAgo(day)
    const count = Math.floor(Math.random() * 2) + 2
    for (let i = 0; i < count; i++) {
      const m = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)]
      purchasePromises.push(createPurchase(accountId, m.id, m.name, rand(m.min, m.max), date))
    }
  }

  await Promise.all([...depositPromises, ...purchasePromises])
  return { customerId, accountId }
}
