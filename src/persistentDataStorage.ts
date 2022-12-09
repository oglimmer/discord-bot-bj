import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

import config from './config'

export interface IGameData {
  userTag: string
  playerId?: number
  deckId?: number
  gameId?: number
  betId?: number
  secondBetId?: number
  followActions: string
  secondBetFollowActions?: string
  lastUpdateDate: Date | string
}

const DB_INIT_STMT = [
  `CREATE TABLE IF NOT EXISTS gameData (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
      userTag TEXT NOT NULL UNIQUE,
      playerId INTEGER NULL,
      deckId INTEGER NULL,
      gameId INTEGER NULL,
      betId INTEGER NULL,
      secondBetId INTEGER NULL,
      followActions VARCHAR NULL,
      secondBetFollowActions VARCHAR NULL,
      lastUpdateDate TEXT NOT NULL
      )`
]

export class PersistentDataStorage {
  private static _instance: PersistentDataStorage
  static async instance (): Promise<PersistentDataStorage> {
    if (!PersistentDataStorage._instance) {
      PersistentDataStorage._instance = new PersistentDataStorage()
      await PersistentDataStorage._instance.init()
    }
    return PersistentDataStorage._instance
  }

  private db!: Database

  private constructor () {
  }

  private async init (): Promise<PersistentDataStorage> {
    sqlite3.verbose()
    this.db = await open({
      filename: `${config.dbPath}/database.db`,
      driver: sqlite3.Database
    })
    for await (const stmt of DB_INIT_STMT) {
      await this.db.exec(stmt)
    }
    return this
  }

  public async load (userTag: string): Promise<IGameData> {
    let row: IGameData | undefined = await this.db.get('SELECT * FROM gameData WHERE userTag = ?', userTag)
    if (row) {
      // sqlite has not date/time support. the date is stored as a string in format "2022-12-04 22:12:46", but in UTC without Z at the end
      row.lastUpdateDate = new Date(`${row.lastUpdateDate as string}Z`)
      if ((row.lastUpdateDate.getTime() + (1000 * 60 * 55)) < new Date().getTime()) { // remove after 55 minutes
        row = {
          userTag,
          followActions: '',
          lastUpdateDate: new Date()
        }
        await this.cleanup(userTag, -1)
      }
    } else {
      row = {
        userTag,
        followActions: '',
        lastUpdateDate: new Date()
      }
      await this.db.run('INSERT INTO gameData (userTag, lastUpdateDate) VALUES (?, datetime(\'now\'))', userTag)
    }
    return row
  }

  public async save (storeElement: IGameData): Promise<void> {
    await this.db.run('UPDATE gameData SET playerId=?, deckId=?, gameId=?, betId=?, secondBetId=?, followActions=?, secondBetFollowActions=? WHERE userTag = ?',
      storeElement.playerId, storeElement.deckId, storeElement.gameId, storeElement.betId, storeElement.secondBetId, storeElement.followActions, storeElement.secondBetFollowActions, storeElement.userTag)
  }

  public async cleanup (userTag: string, cash: number): Promise<void> {
    if (cash === -1) {
      await this.db.run('UPDATE gameData SET deckId=0, playerId=0, gameId=0, betId=0, secondBetId=0, followActions=null, secondBetFollowActions=null, lastUpdateDate=datetime(\'now\') WHERE userTag = ?', userTag)
    } else if (cash === 0) {
      await this.db.run('UPDATE gameData SET playerId=0, gameId=0, betId=0, secondBetId=0, followActions=null, secondBetFollowActions=null, lastUpdateDate=datetime(\'now\') WHERE userTag = ?', userTag)
    } else {
      await this.db.run('UPDATE gameData SET gameId=0, betId=0, secondBetId=0, followActions=null, secondBetFollowActions=null, lastUpdateDate=datetime(\'now\') WHERE userTag = ?', userTag)
    }
  }
}
