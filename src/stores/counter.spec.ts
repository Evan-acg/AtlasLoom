import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCounterStore } from './counter'

describe('useCounterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // Given a fresh Pinia counter store with a count of zero
  // When its increment action is called once
  // Then the count becomes one
  it('increments the count by one', () => {
    const counter = useCounterStore()

    counter.increment()

    expect(counter.count).toBe(1)
  })
})
