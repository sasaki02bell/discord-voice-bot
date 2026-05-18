require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('voiceset')
        .setDescription('보이스 로그 채널 설정')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('로그 채널')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('voicetest')
        .setDescription('로그 설정 확인')
]
.map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {

        console.log('글로벌 명령어 등록 중...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('등록 완료!');

    } catch (error) {
        console.error(error);
    }
})();