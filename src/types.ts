export type Interest =
  | 'food'
  | 'history'
  | 'nature'
  | 'art'
  | 'anime'
  | 'shopping'
  | 'nightlife'
  | 'wellness'
  | 'themeParks'
  | 'photography'

export type Pace = 'local' | 'balanced' | 'explorer'
export type Budget = 'smart' | 'comfortable' | 'premium'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'any'
export type DaySlot = 'morning' | 'afternoon' | 'evening'
export type TransportMode = 'train' | 'flight' | 'bus' | 'ferry' | 'car'

export interface MoneyRange {
  min: number
  max: number
}

export interface Activity {
  id: string
  title: string
  place: string
  recommendation?: string
  description: string
  slot: DaySlot
  interests: Interest[]
  seasons: Season[]
  costJPY: MoneyRange
  tip: string
}

export interface Destination {
  id: string
  name: string
  region: string
  tagline: string
  mapX: number
  mapY: number
  image: string
  imageAlt: string
  routeTags: Interest[]
  bestSeasons: Season[]
  activities: Activity[]
}

export interface TransportLeg {
  from: string
  to: string
  mode: TransportMode
  alternativeMode?: TransportMode
  durationMinutes: number
  costJPY: MoneyRange
  drivingCostJPY?: MoneyRange
  note: string
}

export interface PlannerInput {
  days: number
  travelMonth?: string
  pace: Pace
  budget: Budget
  interests: Interest[]
  willingToDrive: boolean
}

export interface ItineraryDay {
  day: number
  destination: Destination
  transfer?: TransportLeg
  morning: Activity
  afternoon: Activity
  evening: Activity
}

export interface CostBreakdown {
  airfare: MoneyRange
  accommodation: MoneyRange
  food: MoneyRange
  localAndIntercityTransport: MoneyRange
  activities: MoneyRange
  totalJPY: MoneyRange
  totalPHP: MoneyRange
}

export interface SourceMetadata {
  label: string
  url: string
  verifiedOn: string
}

export interface Itinerary {
  id: string
  title: string
  summary: string
  days: ItineraryDay[]
  destinations: Destination[]
  costs: CostBreakdown
  routeName: string
  railPassNote: string
}
