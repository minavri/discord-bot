require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = Number(process.env.PORT || 3000);

if (!TOKEN) {
  console.error('DISCORD_TOKEN est manquant dans le fichier .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const dataDir = path.join(__dirname, '..', 'data');
const actionsFile = path.join(dataDir, 'actions.json');

function ensureActionsFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(actionsFile)) fs.writeFileSync(actionsFile, '{}');
}
function readActions() {
  ensureActionsFile();
  try { return JSON.parse(fs.readFileSync(actionsFile, 'utf8')); } catch { return {}; }
}
function writeActions(actions) {
  ensureActionsFile();
  fs.writeFileSync(actionsFile, JSON.stringify(actions, null, 2));
}
function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`.slice(0, 95);
}
function parseColor(value) {
  if (!value) return null;
  const clean = String(value).replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(clean) ? parseInt(clean, 16) : null;
}
function styleOf(style) {
  return ({
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger,
    link: ButtonStyle.Link
  })[style] || ButtonStyle.Primary;
}

client.once('clientReady', () => {
  console.log(`Bot connecté : ${client.user.tag}`);
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Interface : http://127.0.0.1:${PORT}`);
  });
});

async function createTicket(interaction, ticketType) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: 'Serveur introuvable.', ephemeral: true });

  const existing = guild.channels.cache.find(c =>
    c.type === ChannelType.GuildText &&
    c.topic?.includes(`ticket-owner:${interaction.user.id}`)
  );

  if (existing) {
    return interaction.reply({ content: `Tu as déjà un ticket ouvert : ${existing}`, ephemeral: true });
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  if (ticketType.staffRoleId) {
    overwrites.push({
      id: ticketType.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const userPart = interaction.user.username.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 18) || 'user';
  const typePart = (ticketType.slug || 'ticket').toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 12);

  const channel = await guild.channels.create({
    name: `${typePart}-${userPart}`,
    type: ChannelType.GuildText,
    parent: ticketType.categoryId || null,
    topic: `ticket-owner:${interaction.user.id};ticket-type:${ticketType.label}`,
    permissionOverwrites: overwrites
  });

  const actions = readActions();
  const closeId = randomId('ticket_close');
  actions[closeId] = { type: 'ticket_close' };
  writeActions(actions);

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(closeId)
      .setLabel('Fermer le ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content:
      `${interaction.user}${ticketType.staffRoleId ? ` <@&${ticketType.staffRoleId}>` : ''}\n` +
      `**Type : ${ticketType.label}**\n` +
      (ticketType.welcomeMessage || 'Explique ton problème ici.'),
    components: [closeRow]
  });

  return interaction.reply({ content: `Ton ticket a été créé : ${channel}`, ephemeral: true });
}

client.on('interactionCreate', async interaction => {
  const actions = readActions();

  try {
    if (interaction.isButton()) {
      const action = actions[interaction.customId];

      if (!action) {
        return interaction.reply({ content: 'Action introuvable.', ephemeral: true });
      }

      if (action.type === 'ticket_picker') {
        const selectId = randomId('ticket_select');
        actions[selectId] = {
          type: 'ticket_select',
          ticketTypes: action.ticketTypes || []
        };
        writeActions(actions);

        const menu = new StringSelectMenuBuilder()
          .setCustomId(selectId)
          .setPlaceholder(action.placeholder || 'Choisis le type de ticket')
          .setMinValues(1)
          .setMaxValues(1);

        for (const t of (action.ticketTypes || []).slice(0, 25)) {
          const option = new StringSelectMenuOptionBuilder()
            .setLabel((t.label || 'Ticket').slice(0, 100))
            .setValue((t.id || randomId('type')).slice(0, 100));

          if (t.description) option.setDescription(t.description.slice(0, 100));
          if (t.emoji) {
            try { option.setEmoji(t.emoji); } catch {}
          }
          menu.addOptions(option);
        }

        if (!menu.options.length) {
          return interaction.reply({ content: 'Aucun type de ticket configuré.', ephemeral: true });
        }

        return interaction.reply({
          content: action.selectorMessage || 'Quel type de ticket veux-tu ouvrir ?',
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true
        });
      }

      if (action.type === 'ticket_close') {
        await interaction.reply({ content: 'Ticket fermé dans 3 secondes…', ephemeral: true });
        setTimeout(() => interaction.channel?.delete('Ticket fermé').catch(() => {}), 3000);
        return;
      }

      return interaction.reply({
        content: action.response || 'Bouton utilisé.',
        ephemeral: true
      });
    }

    if (interaction.isStringSelectMenu()) {
      const action = actions[interaction.customId];

      if (action?.type === 'ticket_select') {
        const chosenId = interaction.values[0];
        const ticketType = (action.ticketTypes || []).find(t => t.id === chosenId);
        if (!ticketType) {
          return interaction.reply({ content: 'Type de ticket introuvable.', ephemeral: true });
        }
        return createTicket(interaction, ticketType);
      }

      const selected = interaction.values[0];
      const normal = actions[`${interaction.customId}:${selected}`];
      return interaction.reply({
        content: normal?.response || `Sélection : ${selected}`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Erreur interaction :', error);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true }).catch(() => {});
    }
  }
});

app.get('/api/status', (req, res) => {
  res.json({ ready: client.isReady(), user: client.user ? { id: client.user.id, tag: client.user.tag } : null });
});

app.get('/api/guilds', (req, res) => {
  const guilds = [...client.guilds.cache.values()]
    .map(g => ({ id: g.id, name: g.name }))
    .sort((a,b) => a.name.localeCompare(b.name));
  res.json(guilds);
});

app.get('/api/guilds/:guildId/channels', async (req, res) => {
  try {
    const guild = await client.guilds.fetch(req.params.guildId);
    const channels = await guild.channels.fetch();
    res.json([...channels.values()].filter(Boolean)
      .filter(c => [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(c.type))
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a,b) => a.name.localeCompare(b.name)));
  } catch {
    res.status(400).json({ error: 'Impossible de charger les salons.' });
  }
});

app.get('/api/guilds/:guildId/categories', async (req, res) => {
  try {
    const guild = await client.guilds.fetch(req.params.guildId);
    const channels = await guild.channels.fetch();
    res.json([...channels.values()].filter(Boolean)
      .filter(c => c.type === ChannelType.GuildCategory)
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a,b) => a.name.localeCompare(b.name)));
  } catch {
    res.status(400).json({ error: 'Impossible de charger les catégories.' });
  }
});

app.get('/api/guilds/:guildId/roles', async (req, res) => {
  try {
    const guild = await client.guilds.fetch(req.params.guildId);
    const roles = await guild.roles.fetch();
    res.json([...roles.values()]
      .filter(r => r.name !== '@everyone')
      .map(r => ({ id: r.id, name: r.name }))
      .sort((a,b) => a.name.localeCompare(b.name)));
  } catch {
    res.status(400).json({ error: 'Impossible de charger les rôles.' });
  }
});

function buildMessage(payload, actions) {
  const message = {};

  if (payload.content?.trim()) message.content = payload.content.trim();

  if (payload.embed?.enabled) {
    const embed = new EmbedBuilder();
    if (payload.embed.title?.trim()) embed.setTitle(payload.embed.title.trim());
    if (payload.embed.description?.trim()) embed.setDescription(payload.embed.description.trim());
    const color = parseColor(payload.embed.color);
    if (color !== null) embed.setColor(color);
    if (payload.embed.image?.trim()) embed.setImage(payload.embed.image.trim());
    if (payload.embed.thumbnail?.trim()) embed.setThumbnail(payload.embed.thumbnail.trim());
    if (payload.embed.footer?.trim()) embed.setFooter({ text: payload.embed.footer.trim() });
    message.embeds = [embed];
  }

  const components = [];
  const buttons = Array.isArray(payload.buttons) ? payload.buttons.slice(0, 25) : [];

  for (let i = 0; i < buttons.length && components.length < 5; i += 5) {
    const row = new ActionRowBuilder();

    for (const raw of buttons.slice(i, i + 5)) {
      if (!raw.label?.trim()) continue;

      const button = new ButtonBuilder()
        .setLabel(raw.label.trim().slice(0, 80))
        .setStyle(styleOf(raw.style));

      if (raw.emoji?.trim()) {
        try { button.setEmoji(raw.emoji.trim()); } catch {}
      }

      if (raw.style === 'link') {
        if (!raw.url?.trim()) continue;
        button.setURL(raw.url.trim());
      } else {
        const customId = randomId(raw.actionType === 'ticket_picker' ? 'ticket_picker' : 'btn');
        button.setCustomId(customId);

        if (raw.actionType === 'ticket_picker') {
          actions[customId] = {
            type: 'ticket_picker',
            selectorMessage: raw.selectorMessage || 'Quel type de ticket veux-tu ouvrir ?',
            placeholder: raw.placeholder || 'Choisis le type de ticket',
            ticketTypes: (raw.ticketTypes || []).slice(0, 25)
          };
        } else {
          actions[customId] = {
            type: 'button',
            response: raw.response?.trim() || 'Bouton utilisé.'
          };
        }
      }

      row.addComponents(button);
    }

    if (row.components.length) components.push(row);
  }

  const selects = Array.isArray(payload.selects) ? payload.selects : [];
  for (const rawSelect of selects) {
    if (components.length >= 5) break;
    const options = Array.isArray(rawSelect.options) ? rawSelect.options.slice(0, 25) : [];
    if (!options.length) continue;

    const customId = randomId('sel');
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder((rawSelect.placeholder || 'Choisis une option').slice(0, 150))
      .setMinValues(1)
      .setMaxValues(1);

    for (const o of options) {
      if (!o.label?.trim() || !o.value?.trim()) continue;
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(o.label.trim().slice(0, 100))
        .setValue(o.value.trim().slice(0, 100));
      if (o.description?.trim()) option.setDescription(o.description.trim().slice(0, 100));
      menu.addOptions(option);
      actions[`${customId}:${o.value.trim().slice(0, 100)}`] = {
        type: 'select',
        response: o.response?.trim() || `Tu as choisi ${o.label}`
      };
    }

    if (menu.options.length) components.push(new ActionRowBuilder().addComponents(menu));
  }

  if (!message.content && !message.embeds?.length) message.content = '\u200b';
  message.components = components.slice(0, 5);
  return message;
}

app.post('/api/send-multiple', async (req, res) => {
  try {
    const payloads = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!payloads.length) return res.status(400).json({ error: 'Aucun message à envoyer.' });

    const actions = readActions();
    const sent = [];

    for (const payload of payloads.slice(0, 20)) {
      const channel = await client.channels.fetch(String(payload.channelId || ''));
      if (!channel || !channel.isTextBased()) continue;

      const message = buildMessage(payload, actions);
      const result = await channel.send(message);
      sent.push({ messageId: result.id, channelId: result.channelId });
    }

    writeActions(actions);
    res.json({ ok: true, sent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Erreur pendant l’envoi.' });
  }
});

client.login(TOKEN);
