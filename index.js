// Require the necessary discord.js classes
const got = require('got');
const { Client, Intents } = require('discord.js');
const { token, clientId } = require('./config.json');
const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');


// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

const store = {};
const guildIds = JSON.parse(fs.readFileSync('guildIds.json').toString());

const SERVER_ROOT = 'https://bj.oglimmer.de';

const registerCommands = (guildId) => {

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

	rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
		.then(() => console.log('Successfully registered application commands.'))
		.catch(console.error);
};

const evalResult = async (interaction) => {
	const resultData = await got.get(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}`).json();
	const { dealersSecondCard, dealersAdditionalCard, result, payout, dealerTotal } = resultData;
	return `Game over. ${result} The dealer's total is ${dealerTotal}. The 2nd card was ${dealersSecondCard}, the dealer has also drawn ${dealersAdditionalCard}. Your payout is \\$${payout}.`;
};

client.on('guildCreate', (guild) => {
	guildIds[guild.id] = true;
	fs.writeFileSync('guildIds.json', JSON.stringify(guildIds));
	registerCommands(guild.id);
});

client.on('guildDelete', (guild) => {
	delete guildIds[guild.id];
	fs.writeFileSync('guildIds.json', JSON.stringify(guildIds));
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) {
		return;
	}

	const { commandName } = interaction;

	try {
		if (commandName === 'highscore') {
			const data = await got.get(`${SERVER_ROOT}/v2/highscore`).json();
			await interaction.reply(JSON.stringify(data, null, 2));
		}
		else if (commandName === 'create-player') {
			const url = `${SERVER_ROOT}/v2/player`;
			const data = await got.post(url, { json: { 'name': interaction.user.tag } }).json();
			if (!store[interaction.user.tag])store[interaction.user.tag] = {};
			store[interaction.user.tag].playerId = data.playerId;
			await interaction.reply('Player created. You have $1000.');
		}
		else if (commandName === 'get-player') {
			const data = await got.get(`${SERVER_ROOT}/v2/player/${store[interaction.user.tag].playerId}`).json();
			await interaction.reply(`You have \\$${data.cash}`);
		}
		else if (commandName === 'create-deck') {
			const data = await got.post(`${SERVER_ROOT}/v2/deck`).json();
			if (!store[interaction.user.tag])store[interaction.user.tag] = {};
			store[interaction.user.tag].deckId = data.deckId;
			await interaction.reply('New deck created and shuffled. It contains 6x 52 cards.');
		}
		else if (commandName === 'bet') {
			if (!store[interaction.user.tag] || !store[interaction.user.tag].deckId) {
				await interaction.reply("You haven't created a deck yet.");
				return
			}
			const gameData = await got.post(`${SERVER_ROOT}/v2/game`, { json: { 'deckId': store[interaction.user.tag].deckId } }).json();
			if (!store[interaction.user.tag])store[interaction.user.tag] = {};
			store[interaction.user.tag].gameId = gameData.gameId;
			const betValue = interaction.options.getInteger('bet');
			const betData = await got.post(`${SERVER_ROOT}/v2/game/${gameData.gameId}/bet`, { json: { 'playerId': store[interaction.user.tag].playerId, 'bet': betValue } }).json();
			store[interaction.user.tag].betId = betData.betId;
			const { card1, card2, dealersCard, yourTotal, followActions } = betData;
			if (followActions.length == 0) {
				await interaction.reply(`A game has started and your bet has been placed. Your cards: ${card1} and ${card2}. The dealer's open card ${dealersCard}. Your total is ${yourTotal}. ` + await evalResult(interaction));
			}
			else {
				await interaction.reply(`A game has started and your bet has been placed. Your cards: ${card1} and ${card2}. The dealer's open card ${dealersCard}. Your total is ${yourTotal}. Your options are ${followActions}.`);
			}
		}
		else if (commandName === 'hit') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/hit`).json();
			const { drawnCard, yourTotal, followActions } = data;
			if (data.followActions.length == 0) {
				await interaction.reply(`You have drawn ${drawnCard}, which brings your total to ${yourTotal}. ` + await evalResult(interaction));
			}
			else {
				await interaction.reply(`You have drawn ${drawnCard}, which brings your total to ${yourTotal}. Your options are ${followActions}.`);
			}
		}
		else if (commandName === 'stand') {
			await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/stand`).json();
			await interaction.reply(await evalResult(interaction));
		}
		else if (commandName === 'double') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/double`).json();
			const { drawnCard, yourTotal } = data;
			await interaction.reply(`You have drawn ${drawnCard}, which brings your total to ${yourTotal}. ` + await evalResult(interaction));
		}
		else if (commandName === 'split') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/split`).json();
			store[interaction.user.tag].secondBetId = betData.secondBetId;
			const { firstBetCard1, firstBetCard2, firstBetTotal, secondBetCard1, secondBetCard2, secondBetTotal, followActions, secondBetFollowAction } = betData;
			if (followActions.length == 0) {
				if (secondBetFollowAction.length == 0) {
					await interaction.reply('both hands are done. call /result');
				} else {
					await interaction.reply(`Your first hand is ${firstBetCard1} and ${firstBetCard2}, with a total of ${firstBetTotal}. Your second hand is ${secondBetCard1} and ${secondBetCard2}, with a total of ${secondBetTotal}. No actions available for first hand. The second had can do ${secondBetFollowAction}.`);
				}
			}
			else {
				await interaction.reply(`Your first hand is ${firstBetCard1} and ${firstBetCard2}, with a total of ${firstBetTotal}. Your second hand is ${secondBetCard1} and ${secondBetCard2}, with a total of ${secondBetTotal}. Your options for the first hand are ${followActions}, for the second had ${secondBetFollowAction}.`);
			}
		}
		else if (commandName === 'result') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}`).json();
			await interaction.reply(await evalResult(JSON.stringify(data)));
		}
		else if (commandName === 'insurance') {
			const insurance = interaction.options.getInteger('insurance');
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/insurance`, { json: { 'insurance': insurance } }).json();
			const { followActions } = data;
			await interaction.reply(`Your options are ${followActions}.`);
		}
	} catch (error) {
		console.log(error);
		if (error.response) {
			await interaction.reply("Error: " + error.response.body);
		} else {
			await interaction.reply("Error: " + JSON.stringify(error));
		}
	}
});

// Login to Discord with your client's token
client.login(token);
