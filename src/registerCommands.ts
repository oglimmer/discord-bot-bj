import { SlashCommandBuilder } from '@discordjs/builders'
import type {
  Collection,
  Guild,
  Snowflake
} from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'

import config from './config'
import { getHighscoreSubCommand } from './slashCommands/Highscore'
import { getPlaySubCommand } from './slashCommands/Play'
import { getScoreSubCommand } from './slashCommands/Score'
import { getInsuranceSubCommand } from './slashCommands/Insurance'
import { getSplitSubCommand } from './slashCommands/Split'
import { getDoubleSubCommand } from './slashCommands/Double'
import { getStandSubCommand } from './slashCommands/Stand'
import { getHitSubCommand } from './slashCommands/Hit'
import { getHelpSubCommand } from './slashCommands/Help'

const { token, clientId } = config

export const registerCommands = async (guildIds: Collection<Snowflake, Guild>): Promise<void> => {
  const commands = [
    new SlashCommandBuilder()
      .setName('bj')
      .setDescription('Play.ts BlackJack on Discord!')
      .addSubcommand(getHelpSubCommand())
      .addSubcommand(getHighscoreSubCommand())
      .addSubcommand(getScoreSubCommand())
      .addSubcommand(getPlaySubCommand())
      .addSubcommand(getHitSubCommand())
      .addSubcommand(getStandSubCommand())
      .addSubcommand(getDoubleSubCommand())
      .addSubcommand(getSplitSubCommand())
      .addSubcommand(getInsuranceSubCommand())
  ]
    .map(command => command.toJSON())

  const rest = new REST({ version: '9' }).setToken(token)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const [_, guild] of guildIds) {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commands })
      console.log(`Successfully registered application commands on ${guild.name ?? '<Name nicht bekannt>'} #${guild.id}.`)
    } catch (err) {
      console.log(`Commands konnten für Server ${guild.name ?? '<Name nicht bekannt>'} #${guild.id} : ${JSON.stringify(err)}`)
    }
  }
}
