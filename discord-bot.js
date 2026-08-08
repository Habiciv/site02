import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

const site = process.env.SITE_URL || 'http://localhost:3000';
const syncKey = process.env.SYNC_API_KEY || '';

async function send(path, payload) {
  if (!syncKey) throw new Error('SYNC_API_KEY não definida.');
  const response = await fetch(`${site}${path}`, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-rng-sync-key': syncKey},
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Sincronização falhou: ${response.status}`);
}

async function syncMember(member) {
  await send('/api/sync/member', {
    discordId: member.id,
    username: member.user.tag,
    roles: [...member.roles.cache.values()].map(r => r.name),
    joinedAt: member.joinedAt?.toISOString()
  });
}

client.once(Events.ClientReady, c => console.log(`Bot conectado como ${c.user.tag}`));
client.on(Events.GuildMemberAdd, member => syncMember(member).catch(console.error));
client.on(Events.GuildMemberUpdate, (_old, member) => syncMember(member).catch(console.error));
client.on(Events.GuildBanAdd, ban => send('/api/sync/penalty', { discordId: ban.user.id }).catch(console.error));

if (!process.env.DISCORD_BOT_TOKEN) throw new Error('Defina DISCORD_BOT_TOKEN no .env');
client.login(process.env.DISCORD_BOT_TOKEN);
