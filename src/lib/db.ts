import localforage from 'localforage'
import type { Load, Expense, DetentionLog, RateEvaluation, Route, FuelBurnEstimate, UserSettings, TripStateSegment } from './types'

// Configure localforage stores
const loadStore = localforage.createInstance({ name: 'milemargin', storeName: 'loads' })
const expenseStore = localforage.createInstance({ name: 'milemargin', storeName: 'expenses' })
const detentionStore = localforage.createInstance({ name: 'milemargin', storeName: 'detentions' })
const rateEvalStore = localforage.createInstance({ name: 'milemargin', storeName: 'rateEvals' })
const routeStore = localforage.createInstance({ name: 'milemargin', storeName: 'routes' })
const settingsStore = localforage.createInstance({ name: 'milemargin', storeName: 'settings' })

// ============ Loads ============

export async function getLoads(): Promise<Load[]> {
  const items: Load[] = []
  await loadStore.iterate<Load, void>((value) => { items.push(value) })
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getLoad(id: string): Promise<Load | null> {
  return loadStore.getItem<Load>(id)
}

export async function saveLoad(load: Load): Promise<void> {
  await loadStore.setItem(load.id, load)
}

export async function deleteLoad(id: string): Promise<void> {
  await loadStore.removeItem(id)
}

// ============ Expenses ============

export async function getExpenses(): Promise<Expense[]> {
  const items: Expense[] = []
  await expenseStore.iterate<Expense, void>((value) => { items.push(value) })
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getExpense(id: string): Promise<Expense | null> {
  return expenseStore.getItem<Expense>(id)
}

export async function saveExpense(expense: Expense): Promise<void> {
  await expenseStore.setItem(expense.id, expense)
}

export async function deleteExpense(id: string): Promise<void> {
  await expenseStore.removeItem(id)
}

// ============ Detention Logs ============

export async function getDetentionLogs(): Promise<DetentionLog[]> {
  const items: DetentionLog[] = []
  await detentionStore.iterate<DetentionLog, void>((value) => { items.push(value) })
  return items.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

export async function getDetentionLog(id: string): Promise<DetentionLog | null> {
  return detentionStore.getItem<DetentionLog>(id)
}

export async function saveDetentionLog(log: DetentionLog): Promise<void> {
  await detentionStore.setItem(log.id, log)
}

export async function deleteDetentionLog(id: string): Promise<void> {
  await detentionStore.removeItem(id)
}

// ============ Rate Evaluations ============

export async function getRateEvaluations(): Promise<RateEvaluation[]> {
  const items: RateEvaluation[] = []
  await rateEvalStore.iterate<RateEvaluation, void>((value) => { items.push(value) })
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function saveRateEvaluation(eval_: RateEvaluation): Promise<void> {
  await rateEvalStore.setItem(eval_.id, eval_)
}

export async function deleteRateEvaluation(id: string): Promise<void> {
  await rateEvalStore.removeItem(id)
}

// ============ Routes (GPS Route Tracking) ============

export async function getRoutes(): Promise<Route[]> {
  const items: Route[] = []
  await routeStore.iterate<Route, void>((value) => { items.push(value) })
  return items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export async function getRoute(id: string): Promise<Route | null> {
  return routeStore.getItem<Route>(id)
}

export async function saveRoute(route: Route): Promise<void> {
  await routeStore.setItem(route.id, route)
}

export async function deleteRoute(id: string): Promise<void> {
  await routeStore.removeItem(id)
}

/** Aggregate all completed route state segments into state mileages */
export async function getStateMileagesForPeriod(): Promise<TripStateSegment[]> {
  const routes = await getRoutes()
  const completed = routes.filter(r => r.status === 'completed')
  const stateMap = new Map<string, number>()

  for (const route of completed) {
    for (const seg of route.stateSegments) {
      stateMap.set(seg.state, (stateMap.get(seg.state) || 0) + seg.miles)
    }
  }

  return Array.from(stateMap.entries())
    .map(([state, miles]) => ({ state, miles, fromPointIndex: 0, toPointIndex: 0 }))
    .sort((a, b) => b.miles - a.miles)
}

// ============ Fuel Burn Calculations ============

/** Calculate fuel burn estimate for a given distance using user's settings */
export async function calculateFuelBurn(miles: number): Promise<FuelBurnEstimate> {
  const settings = await getSettings()
  const mpg = settings.averageMpg || 6.5
  const pricePerGallon = settings.fuelPricePerGallon || 3.50
  const gallons = miles / mpg
  return {
    miles,
    mpg,
    gallons: Math.round(gallons * 100) / 100,
    pricePerGallon,
    totalFuelCost: Math.round(gallons * pricePerGallon * 100) / 100,
  }
}

/** Calculate total distance between two GPS coordinates using Haversine formula */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Compute total distance from a list of route points */
export function computeRouteDistance(points: { lat: number; lng: number }[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }
  return Math.round(total * 100) / 100
}

// ============ Settings ============

const DEFAULT_SETTINGS: UserSettings = {
  operatingCPM: 1.85,
  deadheadPercent: 15,
  fuelPricePerGallon: 3.50,
  averageMpg: 6.5,
  currency: 'USD',
  baseState: 'IN',
}

export async function getSettings(): Promise<UserSettings> {
  const settings = await settingsStore.getItem<UserSettings>('settings')
  return settings ?? DEFAULT_SETTINGS
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await settingsStore.setItem('settings', settings)
}

// ============ Analytics / Calculations ============

export async function calculateCPM(): Promise<{ totalMiles: number; totalExpenses: number; cpm: number }> {
  const loads = await getLoads()
  const expenses = await getExpenses()
  const totalMiles = loads.filter(l => l.status === 'completed').reduce((sum, l) => sum + l.miles, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const cpm = totalMiles > 0 ? totalExpenses / totalMiles : 0
  return { totalMiles, totalExpenses, cpm }
}

export async function getMonthlyExpenses(): Promise<{ month: string; total: number }[]> {
  const expenses = await getExpenses()
  const grouped = new Map<string, number>()
  for (const e of expenses) {
    const month = e.date.substring(0, 7) // YYYY-MM
    grouped.set(month, (grouped.get(month) || 0) + e.amount)
  }
  return Array.from(grouped.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export async function evaluateRate(
  revenue: number,
  miles: number,
  operatingCPM: number,
  fuelCost: number = 0,
  tolls: number = 0,
  accessorials: number = 0,
  brokerFees: number = 0,
  customer: string = '',
  origin: string = '',
  destination: string = '',
  notes?: string,
): Promise<RateEvaluation> {
  const ratePerMile = miles > 0 ? revenue / miles : 0
  const estimatedOperatingCost = miles * operatingCPM
  const totalAdditionalCosts = fuelCost + tolls + accessorials + brokerFees
  const totalCost = estimatedOperatingCost + totalAdditionalCosts
  const estimatedProfit = revenue - totalCost
  const profitMargin = revenue > 0 ? (estimatedProfit / revenue) * 100 : 0
  const isProfitable = estimatedProfit >= 0

  const evaluation: RateEvaluation = {
    id: crypto.randomUUID(),
    customer,
    origin,
    destination,
    revenue,
    miles,
    ratePerMile: Math.round(ratePerMile * 100) / 100,
    operatingCPM,
    estimatedOperatingCost: Math.round(estimatedOperatingCost * 100) / 100,
    fuelCost,
    tolls,
    accessorials,
    brokerFees,
    totalAdditionalCosts: Math.round(totalAdditionalCosts * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    isProfitable,
    notes,
    createdAt: new Date().toISOString(),
  }

  await saveRateEvaluation(evaluation)
  return evaluation
}

/** Count rate evaluations created this month (for free tier limiting) */
export async function getRateEvaluationsThisMonth(): Promise<number> {
  const all = await getRateEvaluations()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  return all.filter(e => e.createdAt >= firstOfMonth).length
}