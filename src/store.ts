import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import { IGetPlayerResponse } from './remote-api'

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
      secondBetFollowActions VARCHAR NULL
      )`)
  }

  public async get (userTag: string): Promise<IStoreElement> {
    let row = await this.db.get('SELECT * FROM gameData WHERE userTag = ?', userTag)
    if (row === undefined) {
      row = {
        userTag
      }
      await this.db.run('INSERT INTO gameData (userTag) VALUES (?)', userTag)
    }
    return row as IStoreElement
  }

  public async save (storeElement: IStoreElement): Promise<void> {
    await this.db.run('UPDATE gameData SET playerId=?, deckId=?, gameId=?, betId=?, secondBetId=?, followActions=?, secondBetFollowActions=? WHERE userTag = ?',
      storeElement.playerId, storeElement.deckId, storeElement.gameId, storeElement.betId, storeElement.secondBetId, storeElement.followActions, storeElement.secondBetFollowActions, storeElement.userTag)
  }

  public async cleanup (storeElement: IStoreElement, data: IGetPlayerResponse): Promise<void> {
    // const { data } = await axios.get<any, AxiosResponse<IGetPlayerResponse>>(`${SERVER_ROOT}/v2/player/${storeElement.playerId ?? 'undefined'}`)
    if (data.cash === 0) {
      await this.db.run('UPDATE gameData SET playerId=0, gameId=0, betId=0, secondBetId=0, followActions=null, secondBetFollowActions=null WHERE userTag = ?', storeElement.userTag)
    } else {
      await this.db.run('UPDATE gameData SET gameId=0, betId=0, secondBetId=0, followActions=null, secondBetFollowActions=null WHERE userTag = ?', storeElement.userTag)
    }
  }
}
