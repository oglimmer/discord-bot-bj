import { expect, test } from '@jest/globals'
import { Store } from './store'

test('get empty', async () => {
  const store = await Store.build()
  const userTag = `userid001${Math.random()}`
  const element = await store.get(userTag)
  expect(element.userTag).toBe(userTag)
  expect(element.betId).toBeUndefined()
})

test('save', async () => {
  const store = await Store.build()
  const userTag = `userid001${Math.random()}`
  const element = await store.get(userTag)
  element.betId = 100
  await store.save(element)
  const loaded = await store.get(userTag)
  expect(loaded.userTag).toBe(userTag)
  expect(loaded.betId).toBe(100)
})

test('cleanup', async () => {
  const store = await Store.build()
  const userTag = `userid001${Math.random()}`
  const element = await store.get(userTag)
  element.betId = 100
  await store.save(element)
  await store.cleanup(element.userTag, -1)
  const loaded = await store.get(userTag)
  expect(loaded.userTag).toBe(userTag)
  expect(loaded.betId).toBe(0)
})
