// ========================================
// MileMargin - Core Type Definitions
// ========================================

/** A tracked load/job */
export interface Load {
  id: string
  /** Customer/broker name */
  customer: string
  /** Origin city, ST */
  origin: string
  /** Destination city, ST */
  destination: string
  /** Total miles for this load */
  miles: number
  /** Gross revenue from the load */
  revenue: number
  /** Estimated cost from rate evaluator */
  estimatedCost?: number
  /** Status of the load */
  status: 'pending' | 'accepted' | 'completed' | 'cancelled'
  /** When the load was created */
  createdAt: string // ISO 8601
  /** When the load was completed */
  completedAt?: string
  /** Notes */
  notes?: string
}

/** Type of expense */
export type ExpenseCategory = 'fuel' | 'maintenance' | 'tolls' | 'food' | 'lodging' | 'insurance' | 'payment' | 'other'

/** A logged expense */
export interface Expense {
  id: string
  /** Amount in dollars */
  amount: number
  /** Category of expense */
  category: ExpenseCategory
  /** Description / vendor name */
  description: string
  /** Date of expense */
  date: string // ISO 8601
  /** Miles driven at time of expense (for CPM calc) */
  odometerMiles?: number
  /** OCR text from receipt scan */
  receiptText?: string
  /** Base64 receipt image data (small/thumb) */
  receiptImage?: string
  /** Load ID if this expense is tied to a specific load */
  loadId?: string
  /** State where fuel was purchased (for IFTA) */
  fuelState?: string
  /** Gallons of fuel purchased */
  fuelGallons?: number
}

/** A detention / wait-time event */
export interface DetentionLog {
  id: string
  /** Customer/broker name */
  customer: string
  /** Location of detention */
  location: string
  /** When waiting started */
  startTime: string // ISO 8601
  /** When waiting ended */
  endTime?: string
  /** Duration in minutes (computed on end) */
  durationMinutes?: number
  /** Status */
  status: 'active' | 'completed'
  /** GPS coordinates at start */
  startLat?: number
  startLng?: number
  /** Notes */
  notes?: string
}

/** Mileage by state (for IFTA) */
export interface StateMileage {
  id: string
  /** Two-letter state code */
  state: string
  /** Miles driven in this state */
  miles: number
  /** Reporting period */
  period: string // e.g. "2026-Q2"
}

/** IFTA quarterly report */
export interface IFTASummary {
  id: string
  period: string // e.g. "2026-Q2"
  /** Total miles across all states */
  totalMiles: number
  /** Total gallons of fuel purchased */
  totalGallons: number
  /** State-level breakdowns */
  stateMileages: StateMileage[]
  /** Calculated MPG */
  averageMpg: number
  /** Generated at */
  generatedAt: string
}

/** Rate evaluation result */
export interface RateEvaluation {
  id: string
  /** Total revenue from the load */
  revenue: number
  /** Total miles */
  miles: number
  /** Rate per mile offered */
  ratePerMile: number
  /** Operating cost per mile (user's configured CPM) */
  operatingCPM: number
  /** Estimated profit */
  estimatedProfit: number
  /** Is this profitable? */
  isProfitable: boolean
  /** User's notes */
  notes?: string
  /** When evaluated */
  createdAt: string
}

/** A single GPS coordinate point along a route */
export interface RoutePoint {
  lat: number
  lng: number
  /** ISO 8601 timestamp of when this point was recorded */
  timestamp: string
  /** Two-letter state code at this point (inferred from coordinates) */
  state?: string
}

/** A tracked route / trip with GPS trace */
export interface Route {
  id: string
  /** Load ID this route is associated with (optional) */
  loadId?: string
  /** Display name */
  name: string
  /** Origin description */
  origin?: string
  /** Destination description */
  destination?: string
  /** Full coordinate trace collected during the trip */
  points: RoutePoint[]
  /** Total distance in miles (computed from GPS trace) */
  totalMiles: number
  /** Total duration in minutes */
  durationMinutes: number
  /** State segments — how many miles driven in each state */
  stateSegments: TripStateSegment[]
  /** Fuel burn estimate (computed: miles / avgMpg) */
  fuelBurnGallons?: number
  /** Carbon / fuel cost estimate */
  fuelCostEstimate?: number
  /** Status */
  status: 'active' | 'completed'
  /** When tracking started */
  startedAt: string // ISO 8601
  /** When tracking stopped */
  completedAt?: string
}

/** Mileage driven within a single state on a trip */
export interface TripStateSegment {
  /** Two-letter state code */
  state: string
  /** Miles driven in this state on this trip */
  miles: number
  /** Index of first RoutePoint in this state */
  fromPointIndex: number
  /** Index of last RoutePoint in this state */
  toPointIndex: number
}

/** Mileage by state (for IFTA quarterly reporting) */
export interface StateMileage {
  id: string
  /** Two-letter state code */
  state: string
  /** Miles driven in this state */
  miles: number
  /** Reporting period */
  period: string // e.g. "2026-Q2"
}

/** IFTA quarterly report */
export interface IFTASummary {
  id: string
  period: string // e.g. "2026-Q2"
  /** Total miles across all states */
  totalMiles: number
  /** Total gallons of fuel purchased */
  totalGallons: number
  /** State-level breakdowns */
  stateMileages: StateMileage[]
  /** Calculated MPG */
  averageMpg: number
  /** Generated at */
  generatedAt: string
}

/** Rate evaluation result */
export interface RateEvaluation {
  id: string
  /** Customer/broker name */
  customer: string
  /** Origin description */
  origin: string
  /** Destination description */
  destination: string
  /** Total revenue from the load */
  revenue: number
  /** Total miles */
  miles: number
  /** Rate per mile offered */
  ratePerMile: number
  /** Operating cost per mile (user's configured CPM) */
  operatingCPM: number
  /** Total estimated operating cost (miles × CPM) */
  estimatedOperatingCost: number
  /** Fuel cost estimate */
  fuelCost: number
  /** Tolls expense */
  tolls: number
  /** Accessorial fees */
  accessorials: number
  /** Broker fees */
  brokerFees: number
  /** Total additional costs (fuel + tolls + accessorials + broker) */
  totalAdditionalCosts: number
  /** Total estimated cost (operating + additional) */
  totalCost: number
  /** Estimated net profit */
  estimatedProfit: number
  /** Profit margin percentage */
  profitMargin: number
  /** Is this profitable? */
  isProfitable: boolean
  /** User's notes */
  notes?: string
  /** When evaluated */
  createdAt: string
}
export interface FuelBurnEstimate {
  /** Distance in miles */
  miles: number
  /** Average MPG of the truck */
  mpg: number
  /** Gallons of fuel burned */
  gallons: number
  /** Price per gallon */
  pricePerGallon: number
  /** Total fuel cost */
  totalFuelCost: number
}

/** User settings */
export interface UserSettings {
  /** Operating cost per mile in cents/dollars */
  operatingCPM: number
  /** Default deadhead percentage */
  deadheadPercent: number
  /** Fuel price per gallon for estimates */
  fuelPricePerGallon: number
  /** Average MPG of truck */
  averageMpg: number
  /** Currency display */
  currency: string
  /** State for IFTA base */
  baseState: string
}