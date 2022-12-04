import { IStoreElement, Store } from './store'
import { getBet, getHighscore, getPlayer, postBet, postDeck, postDouble, postGame, postHit, postInsurance, postPlayer, postSplit, postStand } from './remote-api'
import {
  BaseGuildEmoji,
  CommandInteraction,
  CommandInteractionOptionResolver
} from 'discord.js'
import { AxiosError } from 'axios'

const store = new Store()

export const handleCommands = async (interaction: CommandInteraction): Promise<void> => {
  let content = ''
  try {
    const options = interaction.options as CommandInteractionOptionResolver
    const subcommand = options.getSubcommand(true)

    console.log(`Received ${subcommand}`)

    const storeElement = await store.get(interaction.user.tag)

    if (subcommand === 'highscore') {
      content = await handleHighscore()
    } else if (subcommand === 'help') {
      content = await handleHelp()
    } else if (subcommand === 'play') {
      content = await handlePlay(storeElement, options.getInteger('bet', true))
    } else if (subcommand === 'score') {
      content = await handleGetPlayer(storeElement)
    } else if (subcommand === 'hit') {
      content = await handleHit(storeElement)
    } else if (subcommand === 'stand') {
      content = await handleStand(storeElement)
    } else if (subcommand === 'double') {
      content = await handleDouble(storeElement)
    } else if (subcommand === 'split') {
      content = await handleSplit(storeElement)
    } else if (subcommand === 'insurance') {
      content = await handleInsurance(storeElement, options.getInteger('insurance', true))
    }
  } catch (error: Error | any) {
    console.log(error)
    let errorText: string
    if (error.response) {
      errorText = error.response.body
    } else {
      errorText = JSON.stringify(error)
    }
    content = `Error: ${errorText}`
  }
  await interaction.reply({
    content,
    ephemeral: true
  })
}

const evalResult = async (storeElement: IStoreElement): Promise<string> => {
  const {
    dealersSecondCard,
    dealersAdditionalCard,
    result,
    payout,
    dealerTotal
  } = await getBet(storeElement)
  if (storeElement.secondBetId) {
    storeElement.betId = storeElement.secondBetId
    storeElement.followActions = storeElement.secondBetFollowActions!
    storeElement.secondBetId = undefined
    storeElement.secondBetFollowActions = undefined
    await store.save(storeElement)
    return `You have 2nd hand. Your options are ${storeElement.followActions}.`
  } else {
    return `Game over. ${result} The dealer's total is ${dealerTotal}. The 2nd card was ${dealersSecondCard}, the dealer has also drawn ${dealersAdditionalCard}. Your payout is \\$${payout}.`
  }
}

async function handleInsurance (storeElement: IStoreElement, insurance: number): Promise<string> {
  if (!storeElement.betId) {
    return 'No game active. Use `/bj play` to start a game or check your score with `/bj score`'
  }
  if (!(JSON.parse(storeElement.followActions) as string[]).includes('insurance')) {
    return `You cannot hit. Allowed actions are ${storeElement.followActions}`
  }
  const data = await postInsurance(storeElement, insurance)
  const { followActions } = data
  storeElement.followActions = JSON.stringify(data.followActions)
  await store.save(storeElement)
  return `Your options are ${followActions.join(', ')}.`
}

async function handleHelp (): Promise<string> {
  return 'This is a Coding Game using BlackJack rules.\r\n\r\nYour goal is to get enough points to make it into the highscore (see `/bj highscore`).\r\n\r\nYou can use the discord commands under `/bj...` to learn the rules and then use a programming language of your choice to beat the highscore via the REST API describe at https://bj.oglimmer.de/swagger/ui.\r\n\r\nStart to play via `/bj play 100` - this will start a game by using 100 points.\r\n\r\nOther commands are `/bj score` to check your current score. After you\'ve started a game you can use `/bj hit` or `/bj stand` to hit or stand.'
}

async function handleSplit (storeElement: IStoreElement): Promise<string> {
  if (!storeElement.betId) {
    return 'No game active. Use `/bj play` to start a game or check your score with `/bj score`'
  }
  if (!(JSON.parse(storeElement.followActions) as string[]).includes('split')) {
    return `You cannot hit. Allowed actions are ${storeElement.followActions}`
  }
  const betData = await postSplit(storeElement)
  const { firstBetCard1, firstBetCard2, firstBetTotal, secondBetCard1, secondBetCard2, secondBetTotal, followActions, secondBetFollowAction } = betData
  if (followActions.length === 0) {
    if (secondBetFollowAction.length === 0) {
      await store.cleanup(storeElement, await getPlayer(storeElement.playerId ?? 0))
      return 'Both hands are completed. ' + await evalResult(storeElement)
    } else {
      storeElement.followActions = JSON.stringify(betData.secondBetFollowAction)
      storeElement.betId = betData.secondBetId
      await store.save(storeElement)
      return `Your first hand is ${firstBetCard1} and ${firstBetCard2}, with a total of ${firstBetTotal}. Your second hand is ${secondBetCard1} and ${secondBetCard2}, with a total of ${secondBetTotal}. No actions available for first hand. The second had can do ${secondBetFollowAction.join(', ')}.`
    }
  } else {
    storeElement.secondBetId = betData.secondBetId
    storeElement.followActions = JSON.stringify(betData.followActions)
    storeElement.secondBetFollowActions = JSON.stringify(betData.secondBetFollowAction)
    await store.save(storeElement)
    return `Your first hand is ${firstBetCard1} and ${firstBetCard2}, with a total of ${firstBetTotal}. Your second hand is ${secondBetCard1} and ${secondBetCard2}, with a total of ${secondBetTotal}. You will play the first hand next, your options for the first hand are ${followActions.join(', ')}.`
  }
}

async function handleDouble (storeElement: IStoreElement): Promise<string> {
  if (!storeElement.betId) {
    return 'No game active. Use `/bj play` to start a game or check your score with `/bj score`'
  }
  if (!(JSON.parse(storeElement.followActions) as string[]).includes('double')) {
    return `You cannot hit. Allowed actions are ${storeElement.followActions}`
  }
  const data = await postDouble(storeElement)
  const { drawnCard, yourTotal } = data
  await store.cleanup(storeElement, await getPlayer(storeElement.playerId ?? 0))
  return `You have drawn ${drawnCard}, which brings your total to ${yourTotal}. ` + await evalResult(storeElement)
}

async function handleStand (storeElement: IStoreElement): Promise<string> {
  if (!storeElement.betId) {
    return 'No game active. Use `/bj play` to start a game or check your score with `/bj score`'
  }
  if (!(JSON.parse(storeElement.followActions) as string[]).includes('stand')) {
    return `You cannot hit. Allowed actions are ${storeElement.followActions}`
  }
  await postStand(storeElement)
  await store.cleanup(storeElement, await getPlayer(storeElement.playerId ?? 0))
  return await evalResult(storeElement)
}

async function handleHit (storeElement: IStoreElement): Promise<string> {
  if (!storeElement.betId) {
    return 'No game active. Use `/bj play` to start a game or check your score with `/bj score`'
  }
  if (!(JSON.parse(storeElement.followActions) as string[]).includes('hit')) {
    return `You cannot hit. Allowed actions are ${storeElement.followActions}`
  }
  const data = await postHit(storeElement)
  storeElement.followActions = JSON.stringify(data.followActions)
  await store.save(storeElement)
  const {
    drawnCard, yourTotal, followActions
  } = data
  if (data.followActions.length === 0) {
    await store.cleanup(storeElement, await getPlayer(storeElement.playerId ?? 0))
    return `You have drawn ${drawnCard}, which brings your total to ${yourTotal}. ` + await evalResult(storeElement)
  } else {
    return `You have drawn ${drawnCard}, which brings your total to ${yourTotal}. Your options are ${followActions.join(', ')}.`
  }
}

async function handleGetPlayer (storeElement: IStoreElement): Promise<string> {
  console.log(`Check player ${storeElement.playerId!} for score`)
  const data = await getPlayer(storeElement.playerId ?? 0)
  return `You have \\$${data.cash}`
}

async function handleHighscore (): Promise<string> {
  const data = await getHighscore()
  return 'Highscore:\r\n' + data.map(e => `${e.pos}. : ${e.name} with ${e.money} points`).join('\r\n') + '\r\nThis seems a bit high? Play this game by writing code! See https://bj.oglimmer.de/swagger/ui'
}

async function ensurePlayerExists (storeElement: IStoreElement, userTag: string): Promise<void> {
  console.log(`Check player ${storeElement.playerId!} for score`)
  if (!storeElement.playerId || (await getPlayer(storeElement.playerId)).cash === 0) {
    console.log('Create Player..')
    const data = await postPlayer(userTag)
    storeElement.playerId = data.playerId
    await store.save(storeElement)
  }
}

async function ensureDeckExists (storeElement: IStoreElement, userTag: string): Promise<void> {
  if (!storeElement.deckId) {
    console.log('Create Deck..')
    const data = await postDeck()
    storeElement.deckId = data.deckId
    await store.save(storeElement)
  }
}

async function handlePlay (storeElement: IStoreElement, betValue: number): Promise<string> {
  await ensureDeckExists(storeElement, storeElement.userTag)
  await ensurePlayerExists(storeElement, storeElement.userTag)
  const gameData = await postGame(storeElement)
  storeElement.gameId = gameData.gameId
  try {
    const betData = await postBet(storeElement, betValue)
    storeElement.betId = betData.betId
    storeElement.followActions = JSON.stringify(betData.followActions)
    await store.save(storeElement)
    const {
      card1,
      card2,
      dealersCard,
      yourTotal,
      followActions
    } = betData
    if (followActions.length === 0) {
      await store.cleanup(storeElement, await getPlayer(storeElement.playerId ?? 0))
      return `A game has started and your bet has been placed. Your cards: ${card1} and ${card2}. The dealer's open card ${dealersCard}. Your total is ${yourTotal}. ` + await evalResult(storeElement)
    } else {
      return `A game has started and your bet has been placed. Your cards: ${card1} and ${card2}. The dealer's open card ${dealersCard}. Your total is ${yourTotal}. Your options are ${followActions.join(', ')}.`
    }
  } catch (err: Error | AxiosError | any) {
    if (err instanceof AxiosError) {
      return `Play failed. ${JSON.stringify(err.response?.data)}. Use \`/bj score\` to see your score.`
    } else {
      return `Play failed. ${JSON.stringify(err)}`
    }
  }
}
