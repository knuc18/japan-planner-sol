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
  FlightGateway,
  Gateway,
  Interest,
  Itinerary,
  ItineraryDay,
  MoneyRange,
  PlannerInput,
  Season,
  TransportLeg,
} from './types'

const DEFAULT_INTERESTS: Interest[] = ['food', 'history', 'nature']

export const DEFAULT_PLANNER_INPUT: PlannerInput = {
  days: 7,
  travelMonth: '',
  startDate: '',
  pace: 'balanced',
  budget: 'comfortable',
  interests: DEFAULT_INTERESTS,
  willingToDrive: false,
  travellers: 1,
  rooms: 1,
  arrivalGateway: 'auto',
  departureGateway: 'auto',
}

const GATEWAY_DESTINATION: Record<FlightGateway, string> = {
  tokyo: 'tokyo',
  osaka: 'osaka',
  fukuoka: 'fukuoka',
  sapporo: 'sapporo',
  naha: 'naha',
}

const DESTINATION_GATEWAY: Record<string, FlightGateway> = {
  sapporo: 'sapporo',
  hakodate: 'sapporo',
  aomori: 'tokyo',
  sendai: 'tokyo',
  nikko: 'tokyo',
  tokyo: 'tokyo',
  hakone: 'tokyo',
  matsumoto: 'tokyo',
  takayama: 'tokyo',
  kanazawa: 'tokyo',
  kyoto: 'osaka',
  osaka: 'osaka',
  hiroshima: 'osaka',
  matsuyama: 'osaka',
  fukuoka: 'fukuoka',
  beppu: 'fukuoka',
  kagoshima: 'fukuoka',
  naha: 'naha',
}

const add = (...ranges: MoneyRange[]): MoneyRange => ranges.reduce(
  (total, current) => ({ min: total.min + current.min, max: total.max + current.max }),
  { min: 0, max: 0 },
)

const multiply = (value: MoneyRange, count: number): MoneyRange => ({
  min: value.min * count,
  max: value.max * count,
})

const divide = (value: MoneyRange, count: number): MoneyRange => ({
  min: value.min / count,
  max: value.max / count,
})

const rounded = (value: number, step = 100): number => Math.round(value / step) * step
const roundedRange = (value: MoneyRange): MoneyRange => ({ min: rounded(value.min), max: rounded(value.max) })

const isGateway = (value: string | null): value is Gateway => (
  value !== null && ['auto', 'tokyo', 'osaka', 'fukuoka', 'sapporo', 'naha'].includes(value)
)

const normalize = (input: PlannerInput): PlannerInput => {
  const days = Math.min(30, Math.max(3, Math.round(input.days)))
  const travellers = Math.min(8, Math.max(1, Math.round(input.travellers || 1)))
  const rooms = Math.min(travellers, Math.max(1, Math.round(input.rooms || 1)))
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ? input.startDate : ''
  return {
    ...DEFAULT_PLANNER_INPUT,
    ...input,
    days,
    travellers,
    rooms,
    startDate,
    travelMonth: startDate.slice(0, 7) || input.travelMonth || '',
    interests: input.interests.length ? [...new Set(input.interests)] : DEFAULT_INTERESTS,
  }
}

export const seasonFromMonth = (travelMonth?: string): Season => {
  if (!travelMonth) return 'any'
  const month = Number(travelMonth.slice(5, 7))
  if ([3, 4, 5].includes(month)) return 'spring'
  if ([6, 7, 8].includes(month)) return 'summer'
  if ([9, 10, 11].includes(month)) return 'autumn'
  return 'winter'
}

const overlap = (left: Interest[], right: Interest[]): number => left.filter((value) => right.includes(value)).length

const routeContainsGateway = (route: RouteCorridor, gateway: Gateway): boolean => (
  gateway === 'auto' || route.destinations.includes(GATEWAY_DESTINATION[gateway])
)

const gatewaySpan = (route: RouteCorridor, input: PlannerInput): number => {
  if (input.arrivalGateway === 'auto' || input.departureGateway === 'auto') return 1
  const start = route.destinations.indexOf(GATEWAY_DESTINATION[input.arrivalGateway])
  const end = route.destinations.indexOf(GATEWAY_DESTINATION[input.departureGateway])
  return start < 0 || end < 0 ? Number.POSITIVE_INFINITY : Math.abs(end - start) + 1
}

const routeScore = (route: RouteCorridor, input: PlannerInput, season: Season): number => {
  const interestScore = overlap(route.interests, input.interests) * 5
  const seasonScore = route.seasons.includes('any') || route.seasons.includes(season) || season === 'any' ? 4 : -4
  const durationScore = Math.max(-10, 12 - Math.abs(input.days - route.minDays))
  const essentialBias = route.id === 'essential' ? 4 : 0
  const grandFit = route.id === 'grand' ? (input.days >= 21 && input.pace !== 'local' ? 22 : -24) : 0
  const islandFit = route.id === 'islands' && input.interests.includes('wellness') ? 4 : 0
  const gatewayFit = (routeContainsGateway(route, input.arrivalGateway) ? 6 : -30)
    + (routeContainsGateway(route, input.departureGateway) ? 4 : -24)
  const feasibility = gatewaySpan(route, input) <= input.days ? 0 : -40
  return interestScore + seasonScore + durationScore + essentialBias + grandFit + islandFit + gatewayFit + feasibility
}

const rankedRoutes = (input: PlannerInput, season: Season): RouteCorridor[] => [...ROUTES].sort((a, b) => {
  const difference = routeScore(b, input, season) - routeScore(a, input, season)
  return difference || a.id.localeCompare(b.id)
})

const orderedDestinationIds = (route: RouteCorridor, input: PlannerInput): string[] => {
  let ids = [...route.destinations]
  const arrival = input.arrivalGateway === 'auto' ? route.gateway : input.arrivalGateway
  const arrivalId = GATEWAY_DESTINATION[arrival]
  const departureId = input.departureGateway === 'auto' ? undefined : GATEWAY_DESTINATION[input.departureGateway]
  const arrivalIndex = ids.indexOf(arrivalId)
  const departureIndex = departureId ? ids.indexOf(departureId) : -1

  if (arrivalIndex >= 0 && departureIndex >= 0 && arrivalIndex > departureIndex) ids.reverse()

  const startIndex = ids.indexOf(arrivalId)
  if (startIndex > 0) ids = ids.slice(startIndex)
  if (departureId) {
    const endIndex = ids.indexOf(departureId)
    if (endIndex >= 0) ids = ids.slice(0, endIndex + 1)
  }
  return ids
}

const destinationScore = (destination: Destination, interests: Interest[], season: Season): number => (
  overlap(destination.routeTags, interests) * 4
  + (destination.bestSeasons.includes(season) || season === 'any' ? 3 : 0)
)

const destinationCount = (days: number, pace: PlannerInput['pace'], routeLength: number): number => {
  const daysPerBase = pace === 'local' ? 6 : pace === 'balanced' ? 4 : 3
  const minimum = days >= 6 ? 2 : 1
  return Math.min(routeLength, Math.max(minimum, Math.ceil(days / daysPerBase)))
}

const selectDestinations = (route: RouteCorridor, input: PlannerInput): Destination[] => {
  const ids = orderedDestinationIds(route, input)
  const requiresExplicitEnd = input.departureGateway !== 'auto' && ids.at(-1) === GATEWAY_DESTINATION[input.departureGateway]
  const count = requiresExplicitEnd ? ids.length : destinationCount(input.days, input.pace, ids.length)
  return ids.slice(0, Math.min(input.days, count)).map((id) => {
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
  durationMinutes: leg.durationMinutes,
  bookingAdvice: 'reserve',
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

const makeId = (input: PlannerInput, routeId: string): string => {
  const value = JSON.stringify({ ...input, routeId })
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return Math.abs(hash >>> 0).toString(36)
}

const resolveGateways = (route: RouteCorridor, destinations: Destination[], input: PlannerInput): {
  arrival: FlightGateway
  departure: FlightGateway
} => ({
  arrival: input.arrivalGateway === 'auto' ? route.gateway : input.arrivalGateway,
  departure: input.departureGateway === 'auto'
    ? DESTINATION_GATEWAY[destinations.at(-1)?.id ?? route.gateway] ?? route.gateway
    : input.departureGateway,
})

const airfareForGateways = (arrival: FlightGateway, departure: FlightGateway): { range: MoneyRange; note: string } => {
  if (arrival === departure) {
    return {
      range: MANILA_AIRFARE_JPY[arrival],
      note: `Indicative Manila round-trip airfare through ${arrival}.`,
    }
  }
  const inbound = MANILA_AIRFARE_JPY[arrival]
  const outbound = MANILA_AIRFARE_JPY[departure]
  return {
    range: roundedRange({ min: (inbound.min + outbound.min) / 2, max: (inbound.max + outbound.max) / 2 }),
    note: `Indicative Manila multi-city baseline: arrive through ${arrival}, depart through ${departure}. Verify the open-jaw fare before booking.`,
  }
}

const costBreakdown = (
  days: ItineraryDay[],
  legs: TransportLeg[],
  budget: Budget,
  input: PlannerInput,
  airfare: MoneyRange,
): Itinerary['costs'] => {
  const daily = DAILY_BUDGETS[budget]
  const accommodationGroup = multiply(daily.accommodation, Math.max(1, days.length - 1) * input.rooms)
  const accommodation = divide(accommodationGroup, input.travellers)
  const food = multiply(daily.food, days.length)
  const localTransport = multiply(daily.localTransport, days.length)
  const intercity = legs.reduce((total, leg) => add(total, leg.costJPY), { min: 0, max: 0 })
  const activities = days.reduce((total, day) => add(
    total,
    day.morning.costJPY,
    day.afternoon.costJPY,
    day.evening.costJPY,
  ), { min: 0, max: 0 })
  const localAndIntercityTransport = add(localTransport, intercity)
  const totalJPY = add(airfare, accommodation, food, localAndIntercityTransport, activities)
  const groupTotalJPY = add(
    multiply(airfare, input.travellers),
    accommodationGroup,
    multiply(food, input.travellers),
    multiply(localAndIntercityTransport, input.travellers),
    multiply(activities, input.travellers),
  )
  return {
    airfare,
    accommodation: roundedRange(accommodation),
    food,
    localAndIntercityTransport,
    activities,
    totalJPY: roundedRange(totalJPY),
    totalPHP: roundedRange(multiply(totalJPY, JPY_TO_PHP_RATE)),
    groupTotalJPY: roundedRange(groupTotalJPY),
    groupTotalPHP: roundedRange(multiply(groupTotalJPY, JPY_TO_PHP_RATE)),
  }
}

const buildForRoute = (route: RouteCorridor, input: PlannerInput, season: Season): Itinerary => {
  const destinations = selectDestinations(route, input)
  const maximumBases = input.pace === 'local'
    ? Math.ceil(input.days / 3)
    : input.pace === 'balanced'
      ? Math.ceil(input.days / 2)
      : Math.ceil(input.days / 1.5)
  if (destinations.length > maximumBases) {
    throw new Error(`This corridor needs ${destinations.length} bases, which is too rushed for a ${input.pace} ${input.days}-day trip.`)
  }
  if (input.arrivalGateway !== 'auto' && destinations[0]?.id !== GATEWAY_DESTINATION[input.arrivalGateway]) {
    throw new Error(`This corridor does not begin at ${input.arrivalGateway}.`)
  }
  if (input.departureGateway !== 'auto' && destinations.at(-1)?.id !== GATEWAY_DESTINATION[input.departureGateway]) {
    throw new Error(`This corridor cannot reach ${input.departureGateway} in ${input.days} days.`)
  }
  const allocated = allocateDays(destinations, input, season)
  const { days, legs } = buildDays(destinations, allocated, input, season)
  const routeNames = destinations.map((destination) => destination.name).join(' → ')
  const gateways = resolveGateways(route, destinations, input)
  const airfare = airfareForGateways(gateways.arrival, gateways.departure)
  const matchedInterests = route.interests.filter((interest) => input.interests.includes(interest)).slice(0, 3)
  const transferMinutes = legs.reduce((total, leg) => total + leg.durationMinutes, 0)

  return {
    id: makeId(input, route.id),
    title: `${input.days} days along ${route.name}`,
    summary: `${routeNames}. A ${input.pace} route shaped around ${input.interests.slice(0, 3).join(', ')}.`,
    days,
    destinations,
    costs: costBreakdown(days, legs, input.budget, input, airfare.range),
    routeName: route.name,
    railPassNote: railPassMessage(legs, input),
    fitReason: matchedInterests.length
      ? `Strong for ${matchedInterests.join(', ')} with ${destinations.length} bases and ${Math.round(transferMinutes / 60)} hours of planned intercity travel.`
      : `A duration-led alternative with ${destinations.length} bases and ${Math.round(transferMinutes / 60)} hours of planned intercity travel.`,
    arrivalGateway: gateways.arrival,
    departureGateway: gateways.departure,
    airfareNote: airfare.note,
    transferMinutes,
    stays: destinations.map((destination, index) => ({
      destinationId: destination.id,
      days: allocated[index],
      nights: Math.max(0, allocated[index] - (index === destinations.length - 1 ? 1 : 0)),
    })),
  }
}

export const buildItineraryOptions = (rawInput: PlannerInput): Itinerary[] => {
  const input = normalize(rawInput)
  const season = seasonFromMonth(input.travelMonth)
  const options: Itinerary[] = []
  for (const route of rankedRoutes(input, season)) {
    try {
      const itinerary = buildForRoute(route, input, season)
      const signature = itinerary.destinations.map((destination) => destination.id).join(':')
      if (!options.some((option) => option.destinations.map((destination) => destination.id).join(':') === signature)) {
        options.push(itinerary)
      }
    } catch {
      // A corridor can be unsuitable after explicit gateway constraints; the next ranked route remains useful.
    }
    if (options.length === 3) break
  }
  if (!options.length) throw new Error('No connected route fits these choices. Try automatic gateways or a longer trip.')
  return options
}

export const buildItinerary = (rawInput: PlannerInput): Itinerary => buildItineraryOptions(rawInput)[0]

export const plannerInputToSearchParams = (rawInput: PlannerInput, routeId?: string): URLSearchParams => {
  const input = normalize(rawInput)
  const params = new URLSearchParams({
    plan: '1',
    days: String(input.days),
    pace: input.pace,
    budget: input.budget,
    interests: input.interests.join(','),
    travellers: String(input.travellers),
    rooms: String(input.rooms),
    arrive: input.arrivalGateway,
    depart: input.departureGateway,
  })
  if (input.startDate) params.set('start', input.startDate)
  else if (input.travelMonth) params.set('month', input.travelMonth)
  if (input.willingToDrive) params.set('drive', '1')
  if (routeId) params.set('route', routeId)
  return params
}

export const plannerInputFromSearchParams = (params: URLSearchParams): PlannerInput | null => {
  if (params.get('plan') !== '1') return null
  const pace = params.get('pace')
  const budget = params.get('budget')
  const interests = (params.get('interests') ?? '').split(',').filter((value): value is Interest => (
    ['food', 'history', 'nature', 'art', 'anime', 'shopping', 'nightlife', 'wellness', 'themeParks', 'photography'].includes(value)
  ))
  const arrivalGateway = params.get('arrive')
  const departureGateway = params.get('depart')
  return normalize({
    ...DEFAULT_PLANNER_INPUT,
    days: Number(params.get('days')) || DEFAULT_PLANNER_INPUT.days,
    startDate: params.get('start') ?? '',
    travelMonth: params.get('month') ?? '',
    pace: pace === 'local' || pace === 'explorer' ? pace : 'balanced',
    budget: budget === 'smart' || budget === 'premium' ? budget : 'comfortable',
    interests,
    willingToDrive: params.get('drive') === '1',
    travellers: Number(params.get('travellers')) || 1,
    rooms: Number(params.get('rooms')) || 1,
    arrivalGateway: isGateway(arrivalGateway) ? arrivalGateway : 'auto',
    departureGateway: isGateway(departureGateway) ? departureGateway : 'auto',
  })
}
