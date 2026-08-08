import {
  DAILY_BUDGETS,
  DESTINATION_BY_ID,
  JPY_TO_PHP_RATE,
  LEG_BY_PAIR,
  MANILA_AIRFARE_JPY,
  ROUTES,
  type RouteCorridor,
} from './data'
import type {
  Activity,
  Budget,
  Destination,
  Interest,
  Itinerary,
  ItineraryDay,
  MoneyRange,
  PlannerInput,
  Season,
  TransportLeg,
} from './types'

const DEFAULT_INTERESTS: Interest[] = ['food', 'history', 'nature']

const add = (...ranges: MoneyRange[]): MoneyRange => ranges.reduce(
  (total, current) => ({ min: total.min + current.min, max: total.max + current.max }),
  { min: 0, max: 0 },
)

const multiply = (value: MoneyRange, count: number): MoneyRange => ({
  min: value.min * count,
  max: value.max * count,
})

const rounded = (value: number, step = 100): number => Math.round(value / step) * step

const normalize = (input: PlannerInput): PlannerInput => ({
  ...input,
  days: Math.min(30, Math.max(3, Math.round(input.days))),
  interests: input.interests.length ? [...new Set(input.interests)] : DEFAULT_INTERESTS,
})

export const seasonFromMonth = (travelMonth?: string): Season => {
  if (!travelMonth) return 'any'
  const month = Number(travelMonth.slice(5, 7))
  if ([3, 4, 5].includes(month)) return 'spring'
  if ([6, 7, 8].includes(month)) return 'summer'
  if ([9, 10, 11].includes(month)) return 'autumn'
  return 'winter'
}

const overlap = (left: Interest[], right: Interest[]): number => left.filter((value) => right.includes(value)).length

const routeScore = (route: RouteCorridor, input: PlannerInput, season: Season): number => {
  const interestScore = overlap(route.interests, input.interests) * 5
  const seasonScore = route.seasons.includes('any') || route.seasons.includes(season) || season === 'any' ? 4 : -4
  const durationScore = Math.max(-10, 12 - Math.abs(input.days - route.minDays))
  const essentialBias = route.id === 'essential' ? 4 : 0
  const grandFit = route.id === 'grand' ? (input.days >= 21 && input.pace !== 'local' ? 22 : -24) : 0
  const islandFit = route.id === 'islands' && input.interests.includes('wellness') ? 4 : 0
  return interestScore + seasonScore + durationScore + essentialBias + grandFit + islandFit
}

const chooseRoute = (input: PlannerInput, season: Season): RouteCorridor => {
  if (input.days < 6) {
    if (season === 'winter' && input.interests.includes('nature')) return ROUTES.find((route) => route.id === 'northern')!
    if (input.interests.includes('wellness') && input.interests.includes('nature') && !input.interests.includes('history')) {
      return ROUTES.find((route) => route.id === 'islands')!
    }
    return ROUTES.find((route) => route.id === 'essential')!
  }

  const ranked = [...ROUTES].sort((a, b) => {
    const difference = routeScore(b, input, season) - routeScore(a, input, season)
    return difference || a.id.localeCompare(b.id)
  })
  const route = ranked[0]
  return input.days > route.destinations.length * 7
    ? ROUTES.find((candidate) => candidate.id === 'grand')!
    : route
}

const destinationScore = (destination: Destination, interests: Interest[], season: Season): number => (
  overlap(destination.routeTags, interests) * 4
  + (destination.bestSeasons.includes(season) || season === 'any' ? 3 : 0)
)

const destinationCount = (days: number, pace: PlannerInput['pace'], routeLength: number): number => {
  const daysPerBase = pace === 'local' ? 7 : pace === 'balanced' ? 5 : 4
  const minimum = days >= 6 ? 2 : 1
  return Math.min(routeLength, Math.max(minimum, Math.ceil(days / daysPerBase)))
}

const selectDestinations = (route: RouteCorridor, input: PlannerInput): Destination[] => {
  const count = destinationCount(input.days, input.pace, route.destinations.length)
  return route.destinations.slice(0, count).map((id) => {
    const destination = DESTINATION_BY_ID.get(id)
    if (!destination) throw new Error(`Unknown destination: ${id}`)
    return destination
  })
}

const allocateDays = (destinations: Destination[], input: PlannerInput, season: Season): number[] => {
  const allocated = destinations.map(() => 1)
  let remaining = input.days - destinations.length
  while (remaining > 0) {
    const index = destinations
      .map((destination, candidate) => ({
        candidate,
        score: destinationScore(destination, input.interests, season) - allocated[candidate] * 1.5,
      }))
      .filter(({ candidate }) => allocated[candidate] < 7)
      .sort((a, b) => b.score - a.score || a.candidate - b.candidate)[0]?.candidate
    if (index === undefined) throw new Error('Itinerary exceeds the supported activity capacity')
    allocated[index] += 1
    remaining -= 1
  }
  return allocated
}

const chooseLeg = (from: Destination, to: Destination, input: PlannerInput): TransportLeg => {
  const original = LEG_BY_PAIR.get(`${from.id}:${to.id}`)
  if (!original) throw new Error(`Missing transport leg: ${from.id} to ${to.id}`)
  if (input.willingToDrive && original.alternativeMode === 'car' && original.drivingCostJPY) {
    return {
      ...original,
      mode: 'car',
      costJPY: original.drivingCostJPY,
      note: `${original.note} Driving is useful here, but confirm parking, tolls, and International Driving Permit rules.`,
    }
  }
  return original
}

const activityScore = (activity: Activity, interests: Interest[], season: Season): number => (
  overlap(activity.interests, interests) * 5
  + (activity.seasons.includes(season) ? 4 : 0)
  + (activity.seasons.includes('any') ? 1 : 0)
)

const nextActivity = (
  destination: Destination,
  slot: Activity['slot'],
  input: PlannerInput,
  season: Season,
  used: Set<string>,
): Activity => {
  const available = destination.activities
    .filter((activity) => activity.slot === slot && !used.has(activity.id))
    .filter((activity) => activity.seasons.includes('any') || season === 'any' || activity.seasons.includes(season))
    .sort((a, b) => activityScore(b, input.interests, season) - activityScore(a, input.interests, season) || a.id.localeCompare(b.id))
  const fallback = destination.activities
    .filter((activity) => activity.slot === slot && !used.has(activity.id))
    .sort((a, b) => activityScore(b, input.interests, season) - activityScore(a, input.interests, season) || a.id.localeCompare(b.id))
  const selected = available[0] ?? fallback[0]
  if (!selected) throw new Error(`No ${slot} activity left for ${destination.name}`)
  used.add(selected.id)
  return selected
}

const transferActivity = (leg: TransportLeg, destination: Destination): Activity => ({
  id: `transfer-${leg.from}-${leg.to}`,
  title: `${leg.mode === 'flight' ? 'Fly' : leg.mode === 'car' ? 'Drive' : 'Travel'} to ${destination.name}`,
  place: `${leg.from} → ${destination.name}`,
  description: `${Math.floor(leg.durationMinutes / 60)}h ${leg.durationMinutes % 60 ? `${leg.durationMinutes % 60}m` : ''} by ${leg.mode}. ${leg.note}`,
  slot: 'morning',
  interests: [],
  seasons: ['any'],
  costJPY: { min: 0, max: 0 },
  tip: 'Keep tickets, the arrival address, and one offline route screenshot together.',
})

const buildDays = (
  destinations: Destination[],
  allocated: number[],
  input: PlannerInput,
  season: Season,
): { days: ItineraryDay[]; legs: TransportLeg[] } => {
  const days: ItineraryDay[] = []
  const legs: TransportLeg[] = []
  let dayNumber = 1

  destinations.forEach((destination, destinationIndex) => {
    const used = new Set<string>()
    const transfer = destinationIndex
      ? chooseLeg(destinations[destinationIndex - 1], destination, input)
      : undefined
    if (transfer) legs.push(transfer)

    for (let localDay = 0; localDay < allocated[destinationIndex]; localDay += 1) {
      const morning = transfer && localDay === 0
        ? transferActivity(transfer, destination)
        : nextActivity(destination, 'morning', input, season, used)
      days.push({
        day: dayNumber,
        destination,
        transfer: transfer && localDay === 0 ? transfer : undefined,
        morning,
        afternoon: nextActivity(destination, 'afternoon', input, season, used),
        evening: nextActivity(destination, 'evening', input, season, used),
      })
      dayNumber += 1
    }
  })

  return { days, legs }
}

const passPrice = (days: number, travelMonth?: string): number => {
  const afterIncrease = Boolean(travelMonth && travelMonth >= '2026-10')
  if (days <= 7) return afterIncrease ? 53_000 : 50_000
  if (days <= 14) return afterIncrease ? 84_000 : 80_000
  return afterIncrease ? 105_000 : 100_000
}

const railPassMessage = (legs: TransportLeg[], input: PlannerInput): string => {
  const rail = legs.filter((leg) => leg.mode === 'train').reduce((total, leg) => add(total, leg.costJPY), { min: 0, max: 0 })
  const price = passPrice(input.days, input.travelMonth)
  if (!rail.max) return 'This route does not rely enough on intercity rail for a national pass comparison.'
  if (input.days > 21) return `National passes top out at 21 days. Your estimated intercity rail is ¥${rail.min.toLocaleString()}–¥${rail.max.toLocaleString()}, so compare a 21-day pass plus point-to-point tickets.`
  return rail.max >= price * 0.85
    ? `Worth comparing: estimated intercity rail is ¥${rail.min.toLocaleString()}–¥${rail.max.toLocaleString()} versus a ¥${price.toLocaleString()} ordinary national pass for this duration.`
    : `Point-to-point tickets likely fit better: estimated intercity rail is ¥${rail.min.toLocaleString()}–¥${rail.max.toLocaleString()}, below the ¥${price.toLocaleString()} ordinary national pass.`
}

const makeId = (input: PlannerInput): string => {
  const value = JSON.stringify(input)
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return Math.abs(hash >>> 0).toString(36)
}

const costBreakdown = (
  days: ItineraryDay[],
  legs: TransportLeg[],
  route: RouteCorridor,
  budget: Budget,
): Itinerary['costs'] => {
  const daily = DAILY_BUDGETS[budget]
  const accommodation = multiply(daily.accommodation, Math.max(1, days.length - 1))
  const food = multiply(daily.food, days.length)
  const localTransport = multiply(daily.localTransport, days.length)
  const intercity = legs.reduce((total, leg) => add(total, leg.costJPY), { min: 0, max: 0 })
  const activities = days.reduce((total, day) => add(
    total,
    day.morning.costJPY,
    day.afternoon.costJPY,
    day.evening.costJPY,
  ), { min: 0, max: 0 })
  const airfare = MANILA_AIRFARE_JPY[route.gateway]
  const localAndIntercityTransport = add(localTransport, intercity)
  const totalJPY = add(airfare, accommodation, food, localAndIntercityTransport, activities)
  return {
    airfare,
    accommodation,
    food,
    localAndIntercityTransport,
    activities,
    totalJPY: { min: rounded(totalJPY.min), max: rounded(totalJPY.max) },
    totalPHP: {
      min: rounded(totalJPY.min * JPY_TO_PHP_RATE),
      max: rounded(totalJPY.max * JPY_TO_PHP_RATE),
    },
  }
}

export const buildItinerary = (rawInput: PlannerInput): Itinerary => {
  const input = normalize(rawInput)
  const season = seasonFromMonth(input.travelMonth)
  const route = chooseRoute(input, season)
  const destinations = selectDestinations(route, input)
  const allocated = allocateDays(destinations, input, season)
  const { days, legs } = buildDays(destinations, allocated, input, season)
  const routeNames = destinations.map((destination) => destination.name).join(' → ')

  return {
    id: makeId(input),
    title: `${input.days} days along ${route.name}`,
    summary: `${routeNames}. A ${input.pace} route shaped around ${input.interests.slice(0, 3).join(', ')}.`,
    days,
    destinations,
    costs: costBreakdown(days, legs, route, input.budget),
    routeName: route.name,
    railPassNote: railPassMessage(legs, input),
  }
}
