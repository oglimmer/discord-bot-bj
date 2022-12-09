import {
  Client,
  IntentsBitField
} from 'discord.js'
import { registerCommands } from './registerCommands'
import { handleCommands } from './handleCommands'

import config from './config'

async function init (): Promise<void> {
  const client = new Client({ intents: [IntentsBitField.Flags.Guilds] })

  client.once('ready', async () => {
    await registerCommands(client.guilds.cache)
    console.log('Ready!')
  })

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
      return
    }

    await handleCommands(interaction)
  })

  if (config.token) {
    void client.login(config.token)
  } else {
    console.log('Simulated start completed. Missing token.')
  }
}

void init()
