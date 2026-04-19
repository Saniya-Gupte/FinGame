const BASE_URL = process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com'
const API_KEY = process.env.NESSIE_API_KEY!

async function nessieGet(path: string) {
  const separator = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${path}${separator}key=${API_KEY}`)
  if (!res.ok) throw new Error(`Nessie API error: ${res.status} ${path}`)
  return res.json()
}

async function nessiePost(path: string, body: object) {
  const separator = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${path}${separator}key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Nessie API error: ${res.status} ${path}`)
  return res.json()
}

export async function getCustomers() {
  return nessieGet('/customers')
}

export async function createCustomer(firstName: string, lastName: string) {
  return nessiePost('/customers', {
    first_name: firstName,
    last_name: lastName,
    address: { street_number: '123', street_name: 'Main St', city: 'Anytown', state: 'CA', zip: '90210' },
  })
}

export async function getAccounts(customerId: string) {
  return nessieGet(`/customers/${customerId}/accounts`)
}

export async function createAccount(customerId: string, balance: number) {
  return nessiePost(`/customers/${customerId}/accounts`, {
    type: 'Checking',
    nickname: 'FortifyFi Account',
    rewards: 0,
    balance,
  })
}

export async function getPurchases(accountId: string) {
  return nessieGet(`/accounts/${accountId}/purchases`)
}

export async function createPurchase(accountId: string, merchantId: string, merchantName: string, amount: number, date: string) {
  return nessiePost(`/accounts/${accountId}/purchases`, {
    merchant_id: merchantId,
    medium: 'balance',
    purchase_date: date,
    amount,
    description: merchantName,
    status: 'completed',
  })
}

export async function getDeposits(accountId: string) {
  return nessieGet(`/accounts/${accountId}/deposits`)
}
