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

const store = {};

const SERVER_ROOT = 'https://bj.oglimmer.de';

const registerCommands = async (guildIds) => {

	const commands = [
    new SlashCommandBuilder()
      .setName('bj')
      .setDescription('Play BlackJack on Discord!')
      .addSubcommand(subcommand =>
        subcommand
          .setName('highscore')
          .setDescription('get the highscore')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('create-player')
          .setDescription('Create a new player')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('get-player')
          .setDescription('Get the cash for a player')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('create-deck')
          .setDescription('Create a new deck')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('bet')
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
          .setName('result')
          .setDescription('get the result for a game')
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
		.map(command => command.toJSON());    

	const rest = new REST({ version: '9' }).setToken(token);
  for await (const [_, guild] of guildIds) {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commands });
      console.log(`Successfully registered application commands on ${guild.name ?? '<Name nicht bekannt>'} #${guild.id}.`);
    } catch (err) {
      console.log(`Commands konnten für Server ${guild.name ?? '<Name nicht bekannt>'} #${guild.id} : ${JSON.stringify(err)}`);
    }
  }
};

const evalResult = async (interaction) => {
	const resultData = await got.get(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}`).json();
	const { dealersSecondCard, dealersAdditionalCard, result, payout, dealerTotal } = resultData;
	return `Game over. ${result} The dealer's total is ${dealerTotal}. The 2nd card was ${dealersSecondCard}, the dealer has also drawn ${dealersAdditionalCard}. Your payout is \\$${payout}.`;
};

client.once('ready', async () => {
  await registerCommands(client.guilds.cache);
	console.log('Ready!');
})

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) {
		return;
	}

	const { commandName, options } = interaction;
  const subcommand = options.getSubcommand(true);

	try {
		if (subcommand === 'highscore') {
			const data = await got.get(`${SERVER_ROOT}/v2/highscore`).json();
			await interaction.reply({ content: JSON.stringify(data, null, 2), ephemeral: true});
		}
		else if (subcommand === 'create-player') {
			const url = `${SERVER_ROOT}/v2/player`;
			const data = await got.post(url, { json: { 'name': interaction.user.tag } }).json();
			if (!store[interaction.user.tag])store[interaction.user.tag] = {};
			store[interaction.user.tag].playerId = data.playerId;
			await interaction.reply({ content: 'Player created. You have $1000.', ephemeral: true});
		}
		else if (subcommand === 'get-player') {
			const data = await got.get(`${SERVER_ROOT}/v2/player/${store[interaction.user.tag].playerId}`).json();
			await interaction.reply({ content: `You have \\$${data.cash}`, ephemeral: true});
		}
		else if (subcommand === 'create-deck') {
			const data = await got.post(`${SERVER_ROOT}/v2/deck`).json();
			if (!store[interaction.user.tag])store[interaction.user.tag] = {};
			store[interaction.user.tag].deckId = data.deckId;
			await interaction.reply({ content: 'New deck created and shuffled. It contains 6x 52 cards.', ephemeral: true});
		}
		else if (subcommand === 'bet') {
			if (!store[interaction.user.tag] || !store[interaction.user.tag].deckId) {
				await interaction.reply({ content: "You haven't created a deck yet.", ephemeral: true});
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
				await interaction.reply({ content: `A game has started and your bet has been placed. Your cards: ${card1} and ${card2}. The dealer's open card ${dealersCard}. Your total is ${yourTotal}. ` + await evalResult(interaction), ephemeral: true});
			}
			else {
				await interaction.reply({ content: `A game has started and your bet has been placed. Your cards: ${card1} and ${card2}. The dealer's open card ${dealersCard}. Your total is ${yourTotal}. Your options are ${followActions}.`, ephemeral: true});
			}
		}
		else if (subcommand === 'hit') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/hit`).json();
			const { drawnCard, yourTotal, followActions } = data;
			if (data.followActions.length == 0) {
				await interaction.reply({ content: `You have drawn ${drawnCard}, which brings your total to ${yourTotal}. ` + await evalResult(interaction), ephemeral: true});
			}
			else {
				await interaction.reply({ content: `You have drawn ${drawnCard}, which brings your total to ${yourTotal}. Your options are ${followActions}.`, ephemeral: true});
			}
		}
		else if (subcommand === 'stand') {
			await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/stand`).json();
			await interaction.reply({ content: await evalResult(interaction), ephemeral: true});
		}
		else if (subcommand === 'double') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/double`).json();
			const { drawnCard, yourTotal } = data;
			await interaction.reply({ content: `You have drawn ${drawnCard}, which brings your total to ${yourTotal}. ` + await evalResult(interaction), ephemeral: true});
		}
		else if (subcommand === 'split') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/split`).json();
			store[interaction.user.tag].secondBetId = betData.secondBetId;
			const { firstBetCard1, firstBetCard2, firstBetTotal, secondBetCard1, secondBetCard2, secondBetTotal, followActions, secondBetFollowAction } = betData;
			if (followActions.length == 0) {
				if (secondBetFollowAction.length == 0) {
					await interaction.reply({ content: 'both hands are done. call /result', ephemeral: true});
				} else {
					await interaction.reply({ content: `Your first hand is ${firstBetCard1} and ${firstBetCard2}, with a total of ${firstBetTotal}. Your second hand is ${secondBetCard1} and ${secondBetCard2}, with a total of ${secondBetTotal}. No actions available for first hand. The second had can do ${secondBetFollowAction}.`, ephemeral: true});
				}
			}
			else {
				await interaction.reply({ content: `Your first hand is ${firstBetCard1} and ${firstBetCard2}, with a total of ${firstBetTotal}. Your second hand is ${secondBetCard1} and ${secondBetCard2}, with a total of ${secondBetTotal}. Your options for the first hand are ${followActions}, for the second had ${secondBetFollowAction}.`, ephemeral: true});
			}
		}
		else if (subcommand === 'result') {
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}`).json();
			await interaction.reply({ content: await evalResult(JSON.stringify(data)), ephemeral: true});
		}
		else if (subcommand === 'insurance') {
			const insurance = interaction.options.getInteger('insurance');
			const data = await got.post(`${SERVER_ROOT}/v2/game/${store[interaction.user.tag].gameId}/bet/${store[interaction.user.tag].betId}/insurance`, { json: { 'insurance': insurance } }).json();
			const { followActions } = data;
			await interaction.reply({ content: `Your options are ${followActions}.`, ephemeral: true});
		}
	} catch (error) {
		console.log(error);
		if (error.response) {
			await interaction.reply({ content: "Error: " + error.response.body, ephemeral: true});
		} else {
			await interaction.reply({ content: "Error: " + JSON.stringify(error), ephemeral: true});
		}
	}
});

// Login to Discord with your client's token
client.login(token);
