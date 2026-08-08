import { describe, expect, it } from 'vitest'
import { JPY_TO_PHP_RATE } from './data'
import { buildItinerary } from './planner'
import type { PlannerInput } from './types'

const base: PlannerInput = {
  days: 7,
  travelMonth: '',
  pace: 'balanced',
  budget: 'comfortable',
  interests: ['food', 'history', 'nature'],
  willingToDrive: false,
}

describe('buildItinerary', () => {
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
})
