import axios, { AxiosResponse } from 'axios'
import { IStoreElement } from './store'

const SERVER_ROOT = 'https://bj.oglimmer.de'

export interface IGetPlayerResponse {
  cash: number
}
export interface IPostPlayerResponse {
  playerId: number
}
export interface IPostDeckResponse {
  deckId: number
}
export interface IPostGameResponse {
  gameId: number
}
export interface IPostBetResponse {
  betId: number
  card1: string
  card2: string
  dealersCard: string
  yourTotal: number
  followActions: string[]
}
export interface IPostHit {
  yourTotal: number
  drawnCard: string
  followActions: string[]
}
export interface IPostDouble {
  yourTotal: number
  drawnCard: string
}
export interface IPostSplit {
  secondBetId: number
  firstBetCard1: string
  firstBetCard2: string
  firstBetTotal: number
  secondBetCard1: string
  secondBetCard2: string
  secondBetTotal: number
  followActions: string[]
  secondBetFollowAction: string[]
}
export interface IPostInsurance {
  followActions: string[]
}
export interface IGetBet {
  dealersSecondCard: string
  dealersAdditionalCard: string
  result: string
  payout: number
  dealerTotal: number
}
// interface IPostResult {
//   dealersSecondCard: string
//   dealerTotal: number
//   dealersAdditionalCard: string[]
//   result: string
//   payout: number
// }
export interface IHighscoreElement {
  pos: number
  name: string
  money: number
}

export type IHighscore = IHighscoreElement[]

export const getBet = async (storeElement: IStoreElement): Promise<IGetBet> => {
  const { data: resultData } = await axios.get<any, AxiosResponse<IGetBet>>(`${SERVER_ROOT}/v2/game/${storeElement.gameId ?? 'UNDEFINED'}/bet/${storeElement.betId ?? 'UNDEFINED'}`)
  return resultData
}

export const getHighscore = async (): Promise<IHighscore> => {
  const { data } = await axios.get(`${SERVER_ROOT}/v2/highscore`)
  return data.highscores
}

export const postPlayer = async (name: string): Promise<IPostPlayerResponse> => {
  const { data } = await axios.post<any, AxiosResponse<IPostPlayerResponse>>(`${SERVER_ROOT}/v2/player`, { name })
  return data
}

export const getPlayer = async (playerId: number): Promise<IGetPlayerResponse> => {
  const { data } = await axios.get<any, AxiosResponse<IGetPlayerResponse>>(`${SERVER_ROOT}/v2/player/${playerId}`)
  return data
}

export const postDeck = async (): Promise<IPostDeckResponse> => {
  const { data } = await axios.post<any, AxiosResponse<IPostDeckResponse>>(`${SERVER_ROOT}/v2/deck`)
  return data
}

export const postGame = async (storeElement: IStoreElement): Promise<IPostGameResponse> => {
  const { data: gameData } = await axios.post<any, AxiosResponse<IPostGameResponse>>(`${SERVER_ROOT}/v2/game`, { deckId: storeElement.deckId })
  return gameData
}

export const postBet = async (storeElement: IStoreElement, betValue: number): Promise<IPostBetResponse> => {
  const { data: betData } = await axios.post<any, AxiosResponse<IPostBetResponse>>(`${SERVER_ROOT}/v2/game/${storeElement.gameId ?? 'undefined'}/bet`, {
    playerId: storeElement.playerId,
    bet: betValue
  })
  return betData
}

export const postHit = async (storeElement: IStoreElement): Promise<IPostHit> => {
  const { data } = await axios.post<any, AxiosResponse<IPostHit>>(`${SERVER_ROOT}/v2/game/${storeElement.gameId ?? 'UNDEFINED'}/bet/${storeElement.betId ?? 'UNDEFINED'}/hit`)
  return data
}

export const postStand = async (storeElement: IStoreElement): Promise<any> => {
  const { data } = await axios.post<any, AxiosResponse<any>>(`${SERVER_ROOT}/v2/game/${storeElement.gameId ?? 'UNDEFINED'}/bet/${storeElement.betId ?? 'UNDEFINED'}/stand`)
  return data
}

export const postDouble = async (storeElement: IStoreElement): Promise<IPostDouble> => {
  const { data } = await axios.post<any, AxiosResponse<IPostDouble>>(`${SERVER_ROOT}/v2/game/${storeElement.gameId ?? 'UNDEFINED'}/bet/${storeElement.betId ?? 'UNDEFINED'}/double`)
  return data
}

export const postSplit = async (storeElement: IStoreElement): Promise<IPostSplit> => {
  const { data: betData } = await axios.post<any, AxiosResponse<IPostSplit>>(`${SERVER_ROOT}/v2/game/${storeElement.gameId ?? 'UNDEFINED'}/bet/${storeElement.betId ?? 'UNDEFINED'}/split`)
  return betData
}

export const postInsurance = async (storeElement: IStoreElement, insuranceBuy: string): Promise<IPostInsurance> => {
  const { data } = await axios.post<any, AxiosResponse<IPostInsurance>>(`${SERVER_ROOT}/v2/game/${storeElement.gameId ?? 'UNDEFINED'}/bet/${storeElement.betId ?? 'UNDEFINED'}/insurance`, { insurance: insuranceBuy })
  return data
}
