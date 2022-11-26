const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token } = require('./config.json');
const fs = require('fs');

const guildIds = JSON.parse(fs.readFileSync('guildIds.json').toString());

const commands = [
	new SlashCommandBuilder().setName('create-player').setDescription('Create a new player'),
	new SlashCommandBuilder().setName('get-player').setDescription('Get the cash for a player'),
	new SlashCommandBuilder().setName('create-deck').setDescription('Create a new deck'),
	new SlashCommandBuilder().setName('bet').setDescription('Create a game and place your bet').addIntegerOption(option =>
		option.setName('bet')
			.setDescription('The amount to bet ($1 to $1000)')
			.setRequired(true)),
	new SlashCommandBuilder().setName('hit').setDescription('hit'),
	new SlashCommandBuilder().setName('stand').setDescription('stand'),
	new SlashCommandBuilder().setName('double').setDescription('double'),
	new SlashCommandBuilder().setName('split').setDescription('split'),
	new SlashCommandBuilder().setName('insurance').setDescription('do and do not buy an insurance').addStringOption(option =>
		option.setName('buy')
			.setDescription('yes or no')
			.setRequired(true)),
	new SlashCommandBuilder().setName('result').setDescription('get the result for a game'),
	new SlashCommandBuilder().setName('highscore').setDescription('get the highscore'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

for (const guildId in guildIds) {
	rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
		.then(() => console.log('Successfully registered application commands.'))
		.catch(console.error);
}