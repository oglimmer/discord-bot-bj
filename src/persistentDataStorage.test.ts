import { expect, test } from '@jest/globals'

process.env.clientId = 'fake'
process.env.token = 'fake'
process.env.dbPath = './'

// eslint-disable-next-line import/first
import { PersistentDataStorage } from './persistentDataStorage'

test('get empty', async () => {
  const store = await PersistentDataStorage.instance()
  const userTag = `userid001${Math.random()}`
  const element = await store.load(userTag)
  expect(element.userTag).toBe(userTag)
  expect(element.betId).toBeUndefined()
})

test('save', async () => {
  const store = await PersistentDataStorage.instance()
  const userTag = `userid001${Math.random()}`
  const element = await store.load(userTag)
  element.betId = 100
  await store.save(element)
  const loaded = await store.load(userTag)
  expect(loaded.userTag).toBe(userTag)
  expect(loaded.betId).toBe(100)
})

test('cleanup', async () => {
  const store = await PersistentDataStorage.instance()
  const userTag = `userid001${Math.random()}`
  const element = await store.load(userTag)
  element.betId = 100
  await store.save(element)
  await store.cleanup(element.userTag, -1)
  const loaded = await store.load(userTag)
  expect(loaded.userTag).toBe(userTag)
  expect(loaded.betId).toBe(0)
})
