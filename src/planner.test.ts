import { describe, expect, it } from 'vitest'
import { DESTINATIONS, JPY_TO_PHP_RATE } from './data'
import {
  buildItinerary,
  buildItineraryOptions,
  plannerInputFromSearchParams,
  plannerInputToSearchParams,
  seasonFromMonth,
} from './planner'
import type { PlannerInput } from './types'

const base: PlannerInput = {
  days: 7,
  travelMonth: '',
  startDate: '',
  pace: 'balanced',
  budget: 'comfortable',
  interests: ['food', 'history', 'nature'],
  willingToDrive: false,
  travellers: 1,
  rooms: 1,
  arrivalGateway: 'auto',
  departureGateway: 'auto',
}

describe('buildItinerary', () => {
  it('maps each selected travel month to Japan\'s season', () => {
    expect(seasonFromMonth('2027-03')).toBe('spring')
    expect(seasonFromMonth('2027-06')).toBe('summer')
    expect(seasonFromMonth('2027-09')).toBe('autumn')
    expect(seasonFromMonth('2027-12')).toBe('winter')
    expect(seasonFromMonth('')).toBe('any')
  })

  it('is deterministic for identical choices', () => {
    expect(buildItinerary(base)).toEqual(buildItinerary(base))
  })

  it('gives every activity a concrete suggested place and relevant tags', () => {
    const trip = buildItinerary(base)
    const activities = trip.days.flatMap((day) => [day.morning, day.afternoon, day.evening])
    activities.forEach((activity) => expect(activity.place.trim()).not.toBe(''))
    activities
      .filter((activity) => !activity.id.startsWith('transfer-'))
      .forEach((activity) => expect(activity.interests.length).toBeGreaterThan(0))
    activities.forEach((activity) => {
      expect(activity.durationMinutes).toBeGreaterThan(0)
      expect(['walk-in', 'check-ahead', 'reserve']).toContain(activity.bookingAdvice)
    })
  })

  it('offers distinct connected route alternatives for the same choices', () => {
    const options = buildItineraryOptions(base)
    expect(options).toHaveLength(3)
    expect(new Set(options.map((option) => option.destinations.map((destination) => destination.id).join(':'))).size).toBe(3)
    options.forEach((option) => {
      expect(option.days).toHaveLength(base.days)
      expect(option.stays.reduce((total, stay) => total + stay.nights, 0)).toBe(base.days - 1)
      expect(option.fitReason.length).toBeGreaterThan(20)
    })
  })

  it('includes concrete venue and order guidance across every destination', () => {
    DESTINATIONS.forEach((destination) => {
      const recommendations = destination.activities.filter((activity) => activity.recommendation)
      expect(recommendations.length).toBeGreaterThanOrEqual(2)
      recommendations.forEach((activity) => {
        expect(activity.place).not.toBe(activity.title)
        expect(activity.recommendation?.length).toBeGreaterThan(20)
      })
    })
  })

  it('keeps a three-day local trip deep and non-repeating', () => {
    const trip = buildItinerary({ ...base, days: 3, pace: 'local' })
    expect(trip.days).toHaveLength(3)
    expect(trip.destinations).toHaveLength(1)
    const activities = trip.days.flatMap((day) => [day.morning.id, day.afternoon.id, day.evening.id])
    expect(new Set(activities).size).toBe(activities.length)
  })

  it('creates connected arrival legs for a balanced week', () => {
    const trip = buildItinerary(base)
    const transfers = trip.days.filter((day) => day.transfer)
    expect(trip.days).toHaveLength(7)
    expect(transfers).toHaveLength(trip.destinations.length - 1)
    transfers.forEach((day) => expect(day.transfer?.to).toBe(day.destination.id))
  })

  it('opens a long explorer trip across several regions', () => {
    const trip = buildItinerary({ ...base, days: 30, pace: 'explorer' })
    expect(trip.destinations.length).toBeGreaterThanOrEqual(7)
    expect(new Set(trip.destinations.map((destination) => destination.region)).size).toBeGreaterThanOrEqual(5)
  })

  it('uses a domestic flight bridge for an island-led route', () => {
    const trip = buildItinerary({
      ...base,
      travelMonth: '2027-06',
      interests: ['nature', 'wellness', 'food'],
    })
    expect(trip.days.some((day) => day.transfer?.mode === 'flight')).toBe(true)
  })

  it('does not schedule activities outside the selected season', () => {
    const trip = buildItinerary({ ...base, days: 10, travelMonth: '2027-01', interests: ['nature', 'wellness', 'photography'] })
    const scheduled = trip.days.flatMap((day) => [day.morning, day.afternoon, day.evening])
    scheduled.forEach((activity) => expect(activity.seasons.includes('any') || activity.seasons.includes('winter')).toBe(true))
  })

  it('uses a rental car only when the traveler opts in on a suitable leg', () => {
    const trip = buildItinerary({
      ...base,
      days: 10,
      travelMonth: '2027-01',
      pace: 'explorer',
      interests: ['nature', 'wellness', 'photography'],
      willingToDrive: true,
    })
    expect(trip.days.some((day) => day.transfer?.mode === 'car')).toBe(true)
  })

  it('reconciles cost categories and the dated PHP conversion', () => {
    const trip = buildItinerary({ ...base, days: 14, budget: 'smart' })
    const categories = [
      trip.costs.airfare,
      trip.costs.accommodation,
      trip.costs.food,
      trip.costs.localAndIntercityTransport,
      trip.costs.activities,
    ]
    const min = categories.reduce((total, item) => total + item.min, 0)
    const max = categories.reduce((total, item) => total + item.max, 0)
    expect(trip.costs.totalJPY.min).toBe(Math.round(min / 100) * 100)
    expect(trip.costs.totalJPY.max).toBe(Math.round(max / 100) * 100)
    expect(Math.abs(trip.costs.totalPHP.min - trip.costs.totalJPY.min * JPY_TO_PHP_RATE)).toBeLessThanOrEqual(100)
    expect(Math.abs(trip.costs.totalPHP.max - trip.costs.totalJPY.max * JPY_TO_PHP_RATE)).toBeLessThanOrEqual(100)
  })

  it('models explicit gateways and whole-party room sharing', () => {
    const trip = buildItinerary({
      ...base,
      travellers: 4,
      rooms: 2,
      arrivalGateway: 'tokyo',
      departureGateway: 'osaka',
    })
    expect(trip.arrivalGateway).toBe('tokyo')
    expect(trip.departureGateway).toBe('osaka')
    expect(trip.destinations[0].id).toBe('tokyo')
    expect(trip.destinations.at(-1)?.id).toBe('osaka')
    expect(trip.costs.groupTotalJPY.min).toBeGreaterThan(trip.costs.totalJPY.min)
    expect(trip.airfareNote).toContain('multi-city')
    buildItineraryOptions({ ...base, arrivalGateway: 'tokyo', departureGateway: 'osaka' })
      .forEach((option) => expect(option.destinations.length).toBeLessThanOrEqual(Math.ceil(base.days / 2)))
  })

  it('round-trips a shareable plan through URL parameters', () => {
    const input: PlannerInput = {
      ...base,
      days: 12,
      startDate: '2027-04-10',
      travelMonth: '2027-04',
      interests: ['food', 'art'],
      willingToDrive: true,
      travellers: 3,
      rooms: 2,
      arrivalGateway: 'osaka',
      departureGateway: 'fukuoka',
    }
    const parsed = plannerInputFromSearchParams(plannerInputToSearchParams(input, 'route-id'))
    expect(parsed).toEqual(input)
  })
})
