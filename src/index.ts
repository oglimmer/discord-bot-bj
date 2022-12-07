import {
  Client,
  IntentsBitField
} from 'discord.js'
import { registerCommands } from './registerCommands'
import { CommandHandler } from './handleCommands'

import config from './config'

async function init (): Promise<void> {
  const client = new Client({ intents: [IntentsBitField.Flags.Guilds] })

  client.once('ready', async () => {
    await registerCommands(client.guilds.cache)
    console.log('Ready!')
  })

  const commandHandler = await CommandHandler.build()

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
      return
    }

    await commandHandler.handleCommands(interaction)
  })

  void client.login(config.token)
}

void init()
