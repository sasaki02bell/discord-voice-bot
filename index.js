require('dotenv').config();

const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const configFile = './config.json';

// 유저별 음성방 입장 시간 저장
const joinTimes = new Map();

function loadConfig() {
    try {
        if (!fs.existsSync(configFile)) return {};
        const data = fs.readFileSync(configFile, 'utf8');
        if (!data) return {};
        return JSON.parse(data);
    } catch (err) {
        console.error('config error:', err);
        return {};
    }
}

function saveConfig(data) {
    fs.writeFileSync(configFile, JSON.stringify(data, null, 2), 'utf8');
}

function getTime() {
    return new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

client.once('ready', () => {
    console.log(`${client.user.tag} login ok`);
    console.log(`BOT_ID: ${client.user.id}`);
    console.log(`CLIENT_ID: ${process.env.CLIENT_ID}`);
    console.log(`GUILD_ID: ${process.env.GUILD_ID}`);
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.guild) return;

        console.log(`command received: ${interaction.commandName}`);

        const guildId = interaction.guild.id;
        const config = loadConfig();

        if (interaction.commandName === 'voiceset') {
            const channel = interaction.options.getChannel('channel');

            if (!channel) {
                return interaction.reply({
                    content: 'Channel error',
                    ephemeral: true
                });
            }

            config[guildId] = {
                logChannelId: channel.id
            };

            saveConfig(config);

            return interaction.reply({
                content: `Voice log channel set: ${channel}`,
                ephemeral: true
            });
        }

        if (interaction.commandName === 'voicetest') {
            const data = config[guildId];

            return interaction.reply({
                content: data?.logChannelId
                    ? `Voice log channel ID: ${data.logChannelId}`
                    : 'Voice log channel not set',
                ephemeral: true
            });
        }

    } catch (err) {
        console.error('interaction error:', err);

        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({
                content: 'Bot error',
                ephemeral: true
            }).catch(() => {});
        }
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    try {
        const guild = newState.guild;
        if (!guild) return;

        const config = loadConfig();
        const guildConfig = config[guild.id];

        if (!guildConfig?.logChannelId) return;

        const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
        if (!logChannel) return;

        const member = newState.member;
        if (!member) return;

        const userKey = `${guild.id}-${member.id}`;
        const time = getTime();

        let message = '';

        // 입장
        if (!oldState.channelId && newState.channelId) {
            joinTimes.set(userKey, Date.now());

            message =
                `🟢 ${member.user.tag} joined → ${newState.channel.name}\n` +
                `🕒 ${time}`;
        }

        // 퇴장
        else if (oldState.channelId && !newState.channelId) {
            const joinedAt = joinTimes.get(userKey);

            let stayText = '';
            let fastLeaveText = '';

            if (joinedAt) {
                const seconds = Math.floor((Date.now() - joinedAt) / 1000);

                stayText = `\n⏱️ stayed: ${seconds}초`;

                if (seconds < 5) {
                    fastLeaveText = `\n⚠️ 5초 미만 빠른 퇴장 감지`;
                }

                joinTimes.delete(userKey);
            }

            message =
                `🔴 ${member.user.tag} left ← ${oldState.channel.name}\n` +
                `🕒 ${time}` +
                stayText +
                fastLeaveText;
        }

        // 이동
        else if (oldState.channelId !== newState.channelId) {
            joinTimes.set(userKey, Date.now());

            message =
                `🟡 ${member.user.tag} moved ${oldState.channel?.name} → ${newState.channel?.name}\n` +
                `🕒 ${time}`;
        }

        if (!message) return;

        logChannel.send({ content: message }).catch(console.error);

    } catch (err) {
        console.error('voice error:', err);
    }
});

client.login(process.env.BOT_TOKEN);