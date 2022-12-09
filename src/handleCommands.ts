import { IGameData, PersistentDataStorage } from './persistentDataStorage'
import { getBet } from './remote-api'
import {
  CommandInteraction,
  CommandInteractionOptionResolver
} from 'discord.js'
import { handleHighscore } from './slashCommands/Highscore'
import { handlePlay } from './slashCommands/Play'
import { handleScore } from './slashCommands/Score'
import { handleHit } from './slashCommands/Hit'
import { handleStand } from './slashCommands/Stand'
import { handleDouble } from './slashCommands/Double'
import { handleSplit } from './slashCommands/Split'
import { handleInsurance } from './slashCommands/Insurance'
import { handleHelp } from './slashCommands/Help'

export const handleCommands = async (interaction: CommandInteraction): Promise<void> => {
  let content = ''
  try {
    const options = interaction.options as CommandInteractionOptionResolver
    const subcommand = options.getSubcommand(true)

    console.log(`Received ${subcommand}`)

    if (subcommand === 'highscore') {
      content = await handleHighscore()
    } else if (subcommand === 'help') {
      content = await handleHelp()
    } else if (subcommand === 'play') {
      content = await handlePlay(interaction.user.tag, options.getInteger('bet', true))
    } else if (subcommand === 'score') {
      content = await handleScore(interaction.user.tag)
    } else if (subcommand === 'hit') {
      content = await handleHit(interaction.user.tag)
    } else if (subcommand === 'stand') {
      content = await handleStand(interaction.user.tag)
    } else if (subcommand === 'double') {
      content = await handleDouble(interaction.user.tag)
    } else if (subcommand === 'split') {
      content = await handleSplit(interaction.user.tag)
    } else if (subcommand === 'insurance') {
      content = await handleInsurance(interaction.user.tag, options.getString('buy', true))
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

export const evalResult = async (storeElement: IGameData): Promise<string> => {
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
    await (await PersistentDataStorage.instance()).save(storeElement)
    return `You have 2nd hand. Your options are ${storeElement.followActions}.`
  } else {
    return `Game over. ${result} The dealer's total is ${dealerTotal}. The 2nd card was ${dealersSecondCard}, the dealer has also drawn ${dealersAdditionalCard}. Your payout is \\$${payout} points.`
  }
}
