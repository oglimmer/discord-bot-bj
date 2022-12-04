import { SlashCommandBuilder } from '@discordjs/builders'
import {
  Collection,
  Guild,
  Snowflake
} from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'

import config from './config'

const {
  token,
  clientId
} = config

export const registerCommands = async (guildIds: Collection<Snowflake, Guild>): Promise<void> => {
  const commands = [
    new SlashCommandBuilder()
      .setName('bj')
      .setDescription('Play BlackJack on Discord!')
      .addSubcommand(subcommand =>
        subcommand
          .setName('help')
          .setDescription('Explains how this command works')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('highscore')
          .setDescription('get the highscore')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('score')
          .setDescription('Get the score for a player')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('play')
          .setDescription('Create a game and place your bet')
          .addIntegerOption(option =>
            option.setName('bet')
              .setDescription('The amount to bet ($1 to $1000)')
              .setRequired(true))
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('hit')
          .setDescription('hit')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('stand')
          .setDescription('stand')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('double')
          .setDescription('double')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('split')
          .setDescription('split')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('insurance')
          .setDescription('do and do not buy an insurance')
          .addStringOption(option =>
            option.setName('buy')
              .setDescription('yes or no')
              .setRequired(true))
      )
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
