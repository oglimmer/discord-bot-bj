import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

import config from './config'

export interface IStoreElement {
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

export class Store {
  private db!: Database

  constructor () {
    void (async () => {
      await this.init()
    })()
  }

  public async init (): Promise<void> {
    sqlite3.verbose()
    this.db = await open({
      filename: `${config.dbPath}/database.db`,
      driver: sqlite3.Database
    })
    await this.db.exec(`CREATE TABLE IF NOT EXISTS gameData (
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
      )`)
  }

  public async get (userTag: string): Promise<IStoreElement> {
    let row: IStoreElement | undefined = await this.db.get('SELECT * FROM gameData WHERE userTag = ?', userTag)
    if (row) {
      // sqlite has not date/time support. the date is stored as a string in format "2022-12-04 22:12:46", but in UTC without Z at the end
      row.lastUpdateDate = new Date(`${row.lastUpdateDate as string}Z`)
      if ((row.lastUpdateDate.getTime() + (1000 * 60 * 55)) < new Date().getTime()) { // remove after 55 minutes
        row = {
          userTag,
          followActions: '',
          lastUpdateDate: new Date()
        }
        await this.cleanup(userTag, 0)
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

  public async save (storeElement: IStoreElement): Promise<void> {
    await this.db.run('UPDATE gameData SET playerId=?, deckId=?, gameId=?, betId=?, secondBetId=?, followActions=?, secondBetFollowActions=? WHERE userTag = ?',
      storeElement.playerId, storeElement.deckId, storeElement.gameId, storeElement.betId, storeElement.secondBetId, storeElement.followActions, storeElement.secondBetFollowActions, storeElement.userTag)
  }

  public async cleanup (userTag: string, cash: number): Promise<void> {
    if (cash === 0) {
      await this.db.run('UPDATE gameData SET playerId=0, gameId=0, betId=0, secondBetId=0, followActions=null, secondBetFollowActions=null, lastUpdateDate=datetime(\'now\') WHERE userTag = ?', userTag)
    } else {
      await this.db.run('UPDATE gameData SET gameId=0, betId=0, secondBetId=0, followActions=null, secondBetFollowActions=null, lastUpdateDate=datetime(\'now\') WHERE userTag = ?', userTag)
    }
  }
}
