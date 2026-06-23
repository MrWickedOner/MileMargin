import localforage from 'localforage'
import type { Load, Expense, DetentionLog, RateEvaluation, Route, FuelBurnEstimate, DVIRInspection, ComplianceDocument, UserSettings, TripStateSegment } from './types'

// Configure localforage stores
const loadStore = localforage.createInstance({ name: 'milemargin', storeName: 'loads' })
const expenseStore = localforage.createInstance({ name: 'milemargin', storeName: 'expenses' })
const detentionStore = localforage.createInstance({ name: 'milemargin', storeName: 'detentions' })
const rateEvalStore = localforage.createInstance({ name: 'milemargin', storeName: 'rateEvals' })
const routeStore = localforage.createInstance({ name: 'milemargin', storeName: 'routes' })
const complianceStore = localforage.createInstance({ name: 'milemargin', storeName: 'compliance' })
const dvirStore = localforage.createInstance({ name: 'milemargin', storeName: 'dvir' })
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

// ============ Compliance Documents ============

export async function getComplianceDocuments(): Promise<ComplianceDocument[]> {
  const items: ComplianceDocument[] = []
  await complianceStore.iterate<ComplianceDocument, void>((value) => { items.push(value) })
  return items.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
}

export async function getComplianceDocument(id: string): Promise<ComplianceDocument | null> {
  return complianceStore.getItem<ComplianceDocument>(id)
}

export async function saveComplianceDocument(doc: ComplianceDocument): Promise<void> {
  await complianceStore.setItem(doc.id, doc)
}

export async function deleteComplianceDocument(id: string): Promise<void> {
  await complianceStore.removeItem(id)
}

/** Compute document status based on days until expiry */
export function computeDocStatus(expirationDate: string): 'active' | 'expiring' | 'expired' {
  const now = new Date()
  const exp = new Date(expirationDate)
  const daysUntilExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 60) return 'expiring'
  return 'active'
}

/** Get count of active expiring/expired alerts for free tier limiting */
export async function getActiveComplianceAlerts(): Promise<number> {
  const docs = await getComplianceDocuments()
  return docs.filter(d => d.status !== 'active').length
}

// ============ DVIR (Driver Vehicle Inspection Reports) ============

export async function getDVIRInspections(): Promise<DVIRInspection[]> {
  const items: DVIRInspection[] = []
  await dvirStore.iterate<DVIRInspection, void>((value) => { items.push(value) })
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getDVIRInspection(id: string): Promise<DVIRInspection | null> {
  return dvirStore.getItem<DVIRInspection>(id)
}

export async function saveDVIRInspection(inspection: DVIRInspection): Promise<void> {
  await dvirStore.setItem(inspection.id, inspection)
}

export async function deleteDVIRInspection(id: string): Promise<void> {
  await dvirStore.removeItem(id)
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

// ── State Boundary Detection ──
// Simplified lat/lng bounding boxes for each US state (continental)
const STATE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  AL:{minLat:30.1,maxLat:35.0,minLng:-88.5,maxLng:-84.8}, AZ:{minLat:31.3,maxLat:37.1,minLng:-114.9,maxLng:-109.0},
  AR:{minLat:33.0,maxLat:36.5,minLng:-94.6,maxLng:-89.6}, CA:{minLat:32.5,maxLat:42.0,minLng:-124.5,maxLng:-114.1},
  CO:{minLat:36.9,maxLat:41.1,minLng:-109.1,maxLng:-102.0}, CT:{minLat:40.9,maxLat:42.1,minLng:-73.7,maxLng:-71.8},
  DE:{minLat:38.4,maxLat:39.9,minLng:-75.8,maxLng:-75.0}, FL:{minLat:24.3,maxLat:31.1,minLng:-87.6,maxLng:-80.0},
  GA:{minLat:30.3,maxLat:35.1,minLng:-85.6,maxLng:-80.8}, ID:{minLat:41.9,maxLat:49.1,minLng:-117.2,maxLng:-111.0},
  IL:{minLat:36.9,maxLat:42.5,minLng:-91.5,maxLng:-87.4}, IN:{minLat:37.7,maxLat:41.8,minLng:-88.1,maxLng:-84.7},
  IA:{minLat:40.3,maxLat:43.5,minLng:-96.6,maxLng:-90.1}, KS:{minLat:36.9,maxLat:40.1,minLng:-102.1,maxLng:-94.6},
  KY:{minLat:36.4,maxLat:39.2,minLng:-89.6,maxLng:-81.9}, LA:{minLat:28.8,maxLat:33.1,minLng:-94.1,maxLng:-88.7},
  ME:{minLat:42.9,maxLat:47.5,minLng:-71.1,maxLng:-66.9}, MD:{minLat:37.8,maxLat:39.7,minLng:-79.5,maxLng:-75.0},
  MA:{minLat:41.2,maxLat:42.9,minLng:-73.5,maxLng:-69.9}, MI:{minLat:41.7,maxLat:48.3,minLng:-90.4,maxLng:-82.1},
  MN:{minLat:43.4,maxLat:49.4,minLng:-97.2,maxLng:-89.4}, MS:{minLat:30.1,maxLat:35.1,minLng:-91.7,maxLng:-88.0},
  MO:{minLat:35.9,maxLat:40.6,minLng:-95.8,maxLng:-88.9}, MT:{minLat:44.3,maxLat:49.1,minLng:-116.1,maxLng:-104.0},
  NE:{minLat:39.9,maxLat:43.1,minLng:-104.1,maxLng:-95.3}, NV:{minLat:35.0,maxLat:42.1,minLng:-120.1,maxLng:-114.0},
  NH:{minLat:42.6,maxLat:45.3,minLng:-72.6,maxLng:-70.6}, NJ:{minLat:38.8,maxLat:41.4,minLng:-75.6,maxLng:-73.8},
  NM:{minLat:31.3,maxLat:37.1,minLng:-109.1,maxLng:-103.0}, NY:{minLat:40.4,maxLat:45.1,minLng:-79.8,maxLng:-71.8},
  NC:{minLat:33.7,maxLat:36.6,minLng:-84.4,maxLng:-75.4}, ND:{minLat:45.9,maxLat:49.1,minLng:-104.1,maxLng:-96.5},
  OH:{minLat:38.4,maxLat:42.0,minLng:-84.8,maxLng:-80.5}, OK:{minLat:33.6,maxLat:37.1,minLng:-103.1,maxLng:-94.4},
  OR:{minLat:41.9,maxLat:46.3,minLng:-124.6,maxLng:-116.4}, PA:{minLat:39.7,maxLat:42.3,minLng:-80.5,maxLng:-74.6},
  RI:{minLat:41.1,maxLat:42.1,minLng:-71.9,maxLng:-71.0}, SC:{minLat:32.0,maxLat:35.2,minLng:-83.4,maxLng:-78.4},
  SD:{minLat:42.4,maxLat:45.9,minLng:-104.1,maxLng:-96.4}, TN:{minLat:34.9,maxLat:36.7,minLng:-90.3,maxLng:-81.6},
  TX:{minLat:25.8,maxLat:36.5,minLng:-106.6,maxLng:-93.5}, UT:{minLat:36.9,maxLat:42.1,minLng:-114.1,maxLng:-109.0},
  VT:{minLat:42.7,maxLat:45.1,minLng:-73.4,maxLng:-71.5}, VA:{minLat:36.5,maxLat:39.5,minLng:-83.7,maxLng:-75.1},
  WA:{minLat:45.5,maxLat:49.1,minLng:-124.8,maxLng:-116.9}, WV:{minLat:37.1,maxLat:40.6,minLng:-82.6,maxLng:-77.7},
  WI:{minLat:42.5,maxLat:47.1,minLng:-92.9,maxLng:-86.2}, WY:{minLat:40.9,maxLat:45.1,minLng:-111.1,maxLng:-104.0},
}

/** Detect which US state a GPS coordinate falls in using bounding boxes */
export function detectState(lat: number, lng: number): string | null {
  for (const [code, bounds] of Object.entries(STATE_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return code
    }
  }
  return null
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
// ============ IFTA Tax Helper ============

const STATE_TAX_RATES: Record<string, number> = {
  AL:28, AK:8.95, AZ:26, AR:28.5, CA:63, CO:28, CT:37,
  DE:24, FL:35.5, GA:31, HI:56, ID:33, IL:45, IN:33,
  IA:32.5, KS:26, KY:30, LA:22, ME:32, MD:38.5, MA:30,
  MI:31, MN:28.6, MS:22, MO:22.5, MT:30, NE:30, NV:33,
  NH:24, NJ:38.5, NM:22, NY:42, NC:36, ND:23, OH:38.5,
  OK:22, OR:36, PA:59, RI:36, SC:28, SD:30, TN:28,
  TX:20, UT:32, VT:33, VA:30, WA:52, WV:37, WI:35, WY:24,
}

export function getStateTaxRates() { return { ...STATE_TAX_RATES } }

export interface IFTADetailRow {
  state: string; miles: number; taxRate: number
  fuelConsumed: number; taxDue: number
  gallonsPurchased: number; taxPaid: number; netTax: number
}

export interface IFTACalculationResult {
  period: string; totalMiles: number; totalGallons: number
  averageMpg: number; stateEntries: IFTADetailRow[]
  totalTaxDue: number; totalTaxPaid: number; balance: number
}

export async function calculateIFTA(period: string, stateMiles: Record<string, number>) {
  const expenses = await getExpenses()
  const fuelExpenses = expenses.filter(e => e.category === 'fuel' && e.fuelGallons && e.fuelGallons > 0)
  const totalMiles = Object.values(stateMiles).reduce((s, m) => s + m, 0)
  const totalGallons = fuelExpenses.reduce((s, e) => s + (e.fuelGallons || 0), 0)
  const avgMpg = totalGallons > 0 ? totalMiles / totalGallons : 6.5
  const entries: IFTADetailRow[] = []
  let totalDue = 0, totalPaid = 0
  for (const [state, miles] of Object.entries(stateMiles)) {
    if (miles <= 0) continue
    const rate = STATE_TAX_RATES[state] || 25
    const consumed = avgMpg > 0 ? miles / avgMpg : 0
    const due = (consumed * rate) / 100
    const purchased = fuelExpenses.filter(e => (e.fuelState||'').toUpperCase() === state).reduce((s, e) => s + (e.fuelGallons||0), 0)
    const paid = (purchased * rate) / 100
    totalDue += due; totalPaid += paid
    entries.push({ state, miles, taxRate: rate, fuelConsumed: +consumed.toFixed(2), taxDue: +due.toFixed(2), gallonsPurchased: +purchased.toFixed(2), taxPaid: +paid.toFixed(2), netTax: +(paid - due).toFixed(2) })
  }
  return {
    period, totalMiles, totalGallons: +totalGallons.toFixed(2), averageMpg: +avgMpg.toFixed(2),
    stateEntries: entries.sort((a, b) => b.miles - a.miles),
    totalTaxDue: +totalDue.toFixed(2), totalTaxPaid: +totalPaid.toFixed(2), balance: +(totalPaid - totalDue).toFixed(2),
  } as IFTACalculationResult
}
