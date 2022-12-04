import {
  Client,
  IntentsBitField
} from 'discord.js'
import { registerCommands } from './registerCommands'
import { handleCommands } from './handleCommands'

import config from './config'

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

void client.login(config.token)
