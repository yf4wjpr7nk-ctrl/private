const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let connection = null;
let reconnecting = false;

async function connectToVoice() {
  if (reconnecting) return;
  reconnecting = true;

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(CHANNEL_ID);

    if (!channel || !channel.isVoiceBased()) {
      console.error('الروم المحدد غير موجود أو ليس رومًا صوتيًا.');
      reconnecting = false;
      return;
    }

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        if (connection) {
          connection.destroy();
          connection = null;
        }
        setTimeout(connectToVoice, 5_000);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      connection = null;
      setTimeout(connectToVoice, 5_000);
    });

    console.log(`دخل البوت الروم الصوتي: ${channel.name}`);
  } catch (err) {
    console.error('تعذر الدخول للروم، سيُعاد المحاولة خلال 5 ثوانٍ:', err.message);
    setTimeout(connectToVoice, 5_000);
  } finally {
    reconnecting = false;
  }
}

client.once('ready', () => {
  console.log(`البوت متصل باسم: ${client.user.tag}`);
  connectToVoice();
});

setInterval(() => {
  if (!client.isReady()) return;
  const guild = client.guilds.cache.get(GUILD_ID);
  const botMember = guild?.members.me;
  if (botMember && botMember.voice?.channelId !== CHANNEL_ID) {
    connectToVoice();
  }
}, 15_000);

client.login(TOKEN);
