const $ = id => document.getElementById(id);

/* =========================================================
   OUTILS
========================================================= */

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

async function api(url, opt) {
  const r = await fetch(url, opt);

  let data;

  try {
    data = await r.json();
  } catch {
    throw new Error(`Erreur serveur (${r.status})`);
  }

  if (!r.ok) {
    throw new Error(data.error || 'Erreur');
  }

  return data;
}


/* =========================================================
   MESSAGES
========================================================= */

const blankMessage = () => ({
  name: 'Message',
  guildId: '',
  channelId: '',
  content: '',

  embed: {
    enabled: false,
    title: '',
    description: '',
    color: '#5865F2',
    image: '',
    thumbnail: '',
    footer: ''
  },

  buttons: [],
  selects: []
});


const state = {

  messages: [
    blankMessage()
  ],

  current: 0,

  guilds: [],

  channels: [],

  categories: [],

  roles: []
};


function cur() {
  return state.messages[state.current];
}


/* =========================================================
   TICKETS
========================================================= */

const ticketState = {

  guildId: '',

  channelId: '',

  channels: [],

  categories: [],

  roles: [],

  types: []
};


/* =========================================================
   CHARGEMENT PRINCIPAL
========================================================= */

async function load() {

  try {

    const status = await api('/api/status');

    $('status').textContent =
      status.ready
        ? `● ${status.user.tag}`
        : 'Bot non connecté';

    if (status.ready) {
      $('status').classList.add('ok');
    }

  } catch (e) {

    $('status').textContent =
      'Erreur de connexion au bot';

    console.error(e);
  }


  try {

    state.guilds =
      await api('/api/guilds');

  } catch (e) {

    console.error(
      'Erreur serveurs :',
      e
    );

    state.guilds = [];
  }


  /* SERVEURS PAGE MESSAGE */

  $('guild').innerHTML =
    state.guilds.length

      ? state.guilds.map(g => `
          <option value="${g.id}">
            ${esc(g.name)}
          </option>
        `).join('')

      : `
          <option value="">
            Aucun serveur
          </option>
        `;


  /* SERVEURS PAGE TICKET */

  $('ticketGuild').innerHTML =
    state.guilds.length

      ? state.guilds.map(g => `
          <option value="${g.id}">
            ${esc(g.name)}
          </option>
        `).join('')

      : `
          <option value="">
            Aucun serveur
          </option>
        `;


  /* SERVEURS PAGE ARRIVÉE */

  if ($('welcomeGuild')) {

    $('welcomeGuild').innerHTML =
      state.guilds.length

        ? state.guilds.map(g => `
            <option value="${g.id}">
              ${esc(g.name)}
            </option>
          `).join('')

        : `
            <option value="">
              Aucun serveur
            </option>
          `;
  }


  /* PREMIER SERVEUR */

  if (state.guilds[0]) {

    cur().guildId =
      state.guilds[0].id;

    ticketState.guildId =
      state.guilds[0].id;


    await loadGuild(
      cur().guildId
    );


    await loadTicketGuild(
      ticketState.guildId
    );


    if ($('welcomeGuild')) {

      $('welcomeGuild').value =
        state.guilds[0].id;

      await loadWelcomeChannels(
        state.guilds[0].id
      );
    }
  }


  renderAll();

  renderTicketTypes();

  updateTicketPreview();
}


/* =========================================================
   CHARGER SERVEUR PAGE MESSAGE
========================================================= */

async function loadGuild(guildId) {

  try {

    const channels =
      await api(
        `/api/guilds/${guildId}/channels`
      );


    state.channels =
      channels;


    $('channel').innerHTML =
      channels.length

        ? channels.map(c => `
            <option value="${c.id}">
              # ${esc(c.name)}
            </option>
          `).join('')

        : `
            <option value="">
              Aucun salon trouvé
            </option>
          `;


    if (
      channels[0] &&
      !channels.some(
        c => c.id === cur().channelId
      )
    ) {

      cur().channelId =
        channels[0].id;
    }


    $('channel').value =
      cur().channelId || '';

  } catch (e) {

    console.error(
      'Erreur salons :',
      e
    );

    state.channels = [];

    $('channel').innerHTML = `
      <option value="">
        Erreur de chargement
      </option>
    `;
  }


  try {

    state.categories =
      await api(
        `/api/guilds/${guildId}/categories`
      );

  } catch (e) {

    state.categories = [];

    console.error(
      'Erreur catégories :',
      e
    );
  }


  try {

    state.roles =
      await api(
        `/api/guilds/${guildId}/roles`
      );

  } catch (e) {

    state.roles = [];

    console.error(
      'Erreur rôles :',
      e
    );
  }
}


/* =========================================================
   SAUVEGARDER LES CHAMPS MESSAGE
========================================================= */

function saveFields() {

  const m = cur();


  m.guildId =
    $('guild').value;


  m.channelId =
    $('channel').value;


  m.content =
    $('content').value;


  m.embed = {

    enabled:
      $('embedEnabled').checked,

    title:
      $('embedTitle').value,

    description:
      $('embedDescription').value,

    color:
      $('embedColor').value,

    image:
      $('embedImage').value,

    thumbnail:
      $('embedThumbnail').value,

    footer:
      $('embedFooter').value
  };
}


/* =========================================================
   CHARGER LES CHAMPS MESSAGE
========================================================= */

function loadFields() {

  const m = cur();


  $('guild').value =
    m.guildId ||
    $('guild').value;


  $('channel').value =
    m.channelId ||
    $('channel').value;


  $('content').value =
    m.content;


  $('embedEnabled').checked =
    m.embed.enabled;


  $('embedTitle').value =
    m.embed.title;


  $('embedDescription').value =
    m.embed.description;


  $('embedColor').value =
    m.embed.color || '#5865F2';


  $('embedImage').value =
    m.embed.image;


  $('embedThumbnail').value =
    m.embed.thumbnail;


  $('embedFooter').value =
    m.embed.footer;
}


/* =========================================================
   ONGLETS DE MESSAGES
========================================================= */

function renderTabs() {

  $('messageTabs').innerHTML =

    state.messages.map(
      (m, i) => `

        <button
          class="msgTab ${
            i === state.current
              ? 'active'
              : ''
          }"
          data-msg="${i}"
        >

          ${esc(m.name)} ${i + 1}

        </button>

      `
    ).join('');


  document
    .querySelectorAll('[data-msg]')
    .forEach(button => {

      button.onclick =
        async () => {

          saveFields();

          state.current =
            +button.dataset.msg;

          const m =
            cur();


          if (m.guildId) {

            await loadGuild(
              m.guildId
            );
          }


          loadFields();

          renderAll();
        };
    });
}


/* =========================================================
   ÉDITEUR BOUTONS + SÉLECTEURS MESSAGE
========================================================= */

function renderEditors() {

  const m = cur();


  /* -------------------------
     BOUTONS
  ------------------------- */

  $('buttons').innerHTML =

    m.buttons.map(
      (b, i) => `

      <div class="card">

        <div class="row3">

          <label>
            Label

            <input
              data-b="${i}"
              data-k="label"
              value="${esc(b.label)}"
            >
          </label>


          <label>

            Style

            <select
              data-b="${i}"
              data-k="style"
            >

              ${
                [
                  'primary',
                  'secondary',
                  'success',
                  'danger',
                  'link'
                ]
                .map(
                  style => `

                    <option
                      value="${style}"
                      ${
                        b.style === style
                          ? 'selected'
                          : ''
                      }
                    >
                      ${style}
                    </option>

                  `
                )
                .join('')
              }

            </select>

          </label>


          <button
            class="danger"
            data-del-b="${i}"
          >
            ×
          </button>

        </div>


        <div class="two">

          <label>

            Emoji

            <input
              data-b="${i}"
              data-k="emoji"
              value="${esc(b.emoji)}"
              placeholder="👍"
            >

          </label>


          ${
            b.style === 'link'

              ? `

                <label>

                  URL

                  <input
                    data-b="${i}"
                    data-k="url"
                    value="${esc(b.url)}"
                    placeholder="https://..."
                  >

                </label>

              `

              : `

                <label>

                  Réponse

                  <input
                    data-b="${i}"
                    data-k="response"
                    value="${esc(b.response)}"
                    placeholder="Merci !"
                  >

                </label>

              `
          }

        </div>

      </div>

      `
    ).join('');


  /* -------------------------
     SELECTEURS
  ------------------------- */

  $('selects').innerHTML =

    m.selects.map(
      (s, si) => `

      <div class="card">

        <div class="row3">

          <label>

            Placeholder

            <input
              data-s="${si}"
              data-k="placeholder"
              value="${esc(s.placeholder)}"
            >

          </label>

          <div></div>

          <button
            class="danger"
            data-del-s="${si}"
          >
            ×
          </button>

        </div>


        <button
          class="secondary"
          data-add-opt="${si}"
        >

          + Option

        </button>


        ${
          (s.options || [])
          .map(
            (o, oi) => `

            <div class="optionRow">

              <label>

                Label

                <input
                  data-s="${si}"
                  data-oi="${oi}"
                  data-k="label"
                  value="${esc(o.label)}"
                >

              </label>


              <label>

                Valeur

                <input
                  data-s="${si}"
                  data-oi="${oi}"
                  data-k="value"
                  value="${esc(o.value)}"
                >

              </label>


              <label>

                Réponse

                <input
                  data-s="${si}"
                  data-oi="${oi}"
                  data-k="response"
                  value="${esc(o.response)}"
                >

              </label>


              <button
                class="danger"
                data-del-opt="${si}:${oi}"
              >
                ×
              </button>

            </div>

            `
          )
          .join('')
        }

      </div>

      `
    ).join('');


  bindDynamic();
}


/* =========================================================
   ÉVÉNEMENTS DYNAMIQUES MESSAGE
========================================================= */

function bindDynamic() {

  document
    .querySelectorAll('[data-b]')
    .forEach(el => {

      el.oninput = () => {

        const bi =
          +el.dataset.b;

        const key =
          el.dataset.k;


        cur().buttons[bi][key] =
          el.value;


        if (key === 'style') {

          renderEditors();
        }


        updatePreview();
      };
    });


  document
    .querySelectorAll('[data-del-b]')
    .forEach(el => {

      el.onclick = () => {

        cur().buttons.splice(
          +el.dataset.delB,
          1
        );

        renderAll();
      };
    });


  document
    .querySelectorAll('[data-s]')
    .forEach(el => {

      el.oninput = () => {

        const si =
          +el.dataset.s;

        const key =
          el.dataset.k;


        if (
          el.dataset.oi !== undefined
        ) {

          cur()
            .selects[si]
            .options[
              +el.dataset.oi
            ][key] =
              el.value;

        } else {

          cur()
            .selects[si][key] =
              el.value;
        }


        updatePreview();
      };
    });


  document
    .querySelectorAll('[data-del-s]')
    .forEach(el => {

      el.onclick = () => {

        cur().selects.splice(
          +el.dataset.delS,
          1
        );

        renderAll();
      };
    });


  document
    .querySelectorAll('[data-add-opt]')
    .forEach(el => {

      el.onclick = () => {

        cur()
          .selects[
            +el.dataset.addOpt
          ]
          .options
          .push({

            label: 'Option',

            value:
              `opt_${Date.now()}`,

            response:
              'Choix reçu.'
          });


        renderAll();
      };
    });


  document
    .querySelectorAll('[data-del-opt]')
    .forEach(el => {

      el.onclick = () => {

        const [si, oi] =
          el.dataset.delOpt
            .split(':')
            .map(Number);


        cur()
          .selects[si]
          .options
          .splice(oi, 1);


        renderAll();
      };
    });
}


/* =========================================================
   APERÇU MESSAGE
========================================================= */

function updatePreview() {

  saveFields();

  const m =
    cur();


  $('previewContent')
    .textContent =
      m.content;


  $('previewEmbed')
    .innerHTML =

      m.embed.enabled

      ? `

        <div
          class="embedPreview"
          style="border-left-color:${m.embed.color}"
        >

          ${
            m.embed.title

            ? `
              <h3>
                ${esc(m.embed.title)}
              </h3>
            `

            : ''
          }


          ${
            m.embed.description

            ? `
              <p>
                ${esc(m.embed.description)}
              </p>
            `

            : ''
          }

        </div>

      `

      : '';


  $('previewComponents')
    .innerHTML =

      m.buttons.length

      ? `

        <div class="componentRow">

          ${
            m.buttons
              .slice(0, 5)
              .map(
                b => `

                  <div class="dcButton">

                    ${esc(b.emoji)}

                    ${esc(b.label)}

                  </div>

                `
              )
              .join('')
          }

        </div>

      `

      : '';
}


function renderAll() {

  renderTabs();

  loadFields();

  renderEditors();

  updatePreview();
}


/* =========================================================
   PAGE MESSAGE
========================================================= */

$('guild').onchange =
async e => {

  saveFields();

  cur().guildId =
    e.target.value;

  cur().channelId =
    '';


  await loadGuild(
    e.target.value
  );


  $('channel').value =
    cur().channelId;


  renderEditors();
};


$('channel').onchange =
e => {

  cur().channelId =
    e.target.value;
};


/* AJOUT MESSAGE */

$('addMessage').onclick =
() => {

  saveFields();

  const m =
    blankMessage();


  m.guildId =
    cur().guildId;


  m.channelId =
    cur().channelId;


  state.messages.push(m);

  state.current =
    state.messages.length - 1;


  renderAll();
};


/* AJOUT BOUTON NORMAL */

$('addButton').onclick =
() => {

  cur().buttons.push({

    label:
      'Bouton',

    style:
      'primary',

    emoji:
      '',

    url:
      '',

    actionType:
      'reply',

    response:
      'Merci !'
  });


  renderAll();
};


/* AJOUT SELECTEUR */

$('addSelect').onclick =
() => {

  cur().selects.push({

    placeholder:
      'Choisis une option',

    options: [

      {

        label:
          'Option 1',

        value:
          `opt_${Date.now()}`,

        response:
          'Choix reçu.'
      }

    ]
  });


  renderAll();
};


/* PREVIEW LIVE */

[
  'content',
  'embedEnabled',
  'embedTitle',
  'embedDescription',
  'embedColor',
  'embedImage',
  'embedThumbnail',
  'embedFooter'
]
.forEach(id => {

  $(id).addEventListener(
    'input',
    updatePreview
  );
});


/* ENVOI MESSAGES */

$('sendAll').onclick =
async () => {

  saveFields();

  $('result').textContent =
    'Envoi…';


  try {

    const data =
      await api(
        '/api/send-multiple',
        {

          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              messages:
                state.messages
            })
        }
      );


    $('result').textContent =
      `✓ ${data.sent.length} message(s) envoyé(s)`;

  } catch (e) {

    $('result').textContent =
      `Erreur : ${e.message}`;
  }
};


/* =========================================================
   PAGE TICKETS
========================================================= */

async function loadTicketGuild(
  guildId
) {

  ticketState.guildId =
    guildId;


  /* SALONS */

  try {

    ticketState.channels =
      await api(
        `/api/guilds/${guildId}/channels`
      );


    $('ticketChannel')
      .innerHTML =

        ticketState.channels.length

        ? ticketState.channels
          .map(
            c => `

              <option value="${c.id}">
                # ${esc(c.name)}
              </option>

            `
          )
          .join('')

        : `

          <option value="">
            Aucun salon
          </option>

        `;


    if (
      ticketState.channels[0] &&
      !ticketState.channels.some(
        c =>
          c.id ===
          ticketState.channelId
      )
    ) {

      ticketState.channelId =
        ticketState.channels[0].id;
    }


    $('ticketChannel').value =
      ticketState.channelId || '';

  } catch (e) {

    ticketState.channels = [];

    $('ticketChannel')
      .innerHTML = `

        <option value="">
          Erreur salons
        </option>

      `;

    console.error(e);
  }


  /* CATÉGORIES */

  try {

    ticketState.categories =
      await api(
        `/api/guilds/${guildId}/categories`
      );

  } catch (e) {

    ticketState.categories = [];

    console.error(e);
  }


  /* RÔLES */

  try {

    ticketState.roles =
      await api(
        `/api/guilds/${guildId}/roles`
      );

  } catch (e) {

    ticketState.roles = [];

    console.error(e);
  }


  renderTicketTypes();
}


/* CHANGER SERVEUR TICKET */

$('ticketGuild').onchange =
async e => {

  ticketState.channelId = '';

  await loadTicketGuild(
    e.target.value
  );
};


/* CHANGER SALON TICKET */

$('ticketChannel').onchange =
e => {

  ticketState.channelId =
    e.target.value;
};


/* =========================================================
   TYPES DE TICKETS
========================================================= */

function renderTicketTypes() {

  $('ticketTypes').innerHTML =

    ticketState.types.map(
      (ticket, i) => `

      <div class="ticketType">

        <div class="ticketGrid">

          <label>

            Nom

            <input
              data-ticket="${i}"
              data-ticket-key="label"
              value="${esc(ticket.label)}"
              placeholder="Support"
            >

          </label>


          <label>

            Emoji

            <input
              data-ticket="${i}"
              data-ticket-key="emoji"
              value="${esc(ticket.emoji)}"
              placeholder="🎫"
            >

          </label>


          <label>

            Catégorie Discord

            <select
              data-ticket="${i}"
              data-ticket-key="categoryId"
            >

              <option value="">
                Aucune
              </option>

              ${
                ticketState.categories
                  .map(
                    c => `

                      <option
                        value="${c.id}"
                        ${
                          ticket.categoryId === c.id
                            ? 'selected'
                            : ''
                        }
                      >

                        ${esc(c.name)}

                      </option>

                    `
                  )
                  .join('')
              }

            </select>

          </label>


          <label>

            Rôle staff

            <select
              data-ticket="${i}"
              data-ticket-key="staffRoleId"
            >

              <option value="">
                Aucun
              </option>

              ${
                ticketState.roles
                  .map(
                    r => `

                      <option
                        value="${r.id}"
                        ${
                          ticket.staffRoleId === r.id
                            ? 'selected'
                            : ''
                        }
                      >

                        ${esc(r.name)}

                      </option>

                    `
                  )
                  .join('')
              }

            </select>

          </label>

        </div>


        <label>

          Description

          <input
            data-ticket="${i}"
            data-ticket-key="description"
            value="${esc(ticket.description)}"
            placeholder="Besoin d'aide"
          >

        </label>


        <label>

          Message d'accueil du ticket

          <textarea
            data-ticket="${i}"
            data-ticket-key="welcomeMessage"
          >${esc(ticket.welcomeMessage)}</textarea>

        </label>


        <button
          class="danger"
          data-delete-ticket="${i}"
        >

          Supprimer ce type

        </button>

      </div>

      `
    ).join('');


  /* MODIFICATION */

  document
    .querySelectorAll(
      '[data-ticket]'
    )
    .forEach(el => {

      el.oninput =
      el.onchange =
        () => {

          const i =
            +el.dataset.ticket;

          const key =
            el.dataset.ticketKey;


          ticketState
            .types[i][key] =
              el.value;
        };
    });


  /* SUPPRESSION */

  document
    .querySelectorAll(
      '[data-delete-ticket]'
    )
    .forEach(el => {

      el.onclick = () => {

        ticketState.types.splice(
          +el.dataset.deleteTicket,
          1
        );

        renderTicketTypes();
      };
    });
}


/* AJOUT TYPE */

$('addTicketType').onclick =
() => {

  ticketState.types.push({

    id:
      `ticket_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 6)}`,

    label:
      'Support',

    emoji:
      '🎫',

    description:
      "Besoin d'aide",

    categoryId:
      '',

    staffRoleId:
      '',

    welcomeMessage:
      'Explique ton problème ici.'
  });


  renderTicketTypes();
};


/* =========================================================
   APERÇU TICKET
========================================================= */

function updateTicketPreview() {

  $('ticketPreviewMessage')
    .textContent =
      $('ticketMessage').value;


  const emoji =
    $('ticketButtonEmoji').value;


  const label =
    $('ticketButtonLabel').value;


  $('ticketPreviewButton')
    .textContent =
      `${emoji} ${label}`.trim();
}


$('ticketMessage')
  .addEventListener(
    'input',
    updateTicketPreview
  );


$('ticketButtonLabel')
  .addEventListener(
    'input',
    updateTicketPreview
  );


$('ticketButtonEmoji')
  .addEventListener(
    'input',
    updateTicketPreview
  );


/* =========================================================
   ENVOYER PANNEAU TICKET
========================================================= */

$('saveTickets').onclick =
async () => {

  const guildId =
    $('ticketGuild').value;


  const channelId =
    $('ticketChannel').value;


  if (!guildId) {

    $('ticketResult')
      .textContent =
        'Choisis un serveur.';

    return;
  }


  if (!channelId) {

    $('ticketResult')
      .textContent =
        'Choisis un salon.';

    return;
  }


  if (
    ticketState.types.length === 0
  ) {

    $('ticketResult')
      .textContent =
        'Ajoute au moins un type de ticket.';

    return;
  }


  $('ticketResult')
    .textContent =
      'Envoi du panneau…';


  /*
    On transforme le panneau Ticket
    dans le format déjà compris par
    ton backend Discord.
  */

  const ticketMessage = {

    name:
      'Tickets',

    guildId,

    channelId,

    content:
      $('ticketMessage').value,

    embed: {

      enabled:
        false,

      title:
        '',

      description:
        '',

      color:
        '#5865F2',

      image:
        '',

      thumbnail:
        '',

      footer:
        ''
    },


    buttons: [

      {

        label:
          $('ticketButtonLabel')
            .value ||
          'Ouvrir un ticket',

        emoji:
          $('ticketButtonEmoji')
            .value ||
          '🎫',

        style:
          'primary',

        url:
          '',

        actionType:
          'ticket_picker',

        response:
          '',

        selectorMessage:
          'Quel type de ticket veux-tu ouvrir ?',

        placeholder:
          'Choisis le type de ticket',

        ticketTypes:
          ticketState.types
      }

    ],

    selects: []
  };


  try {

    const data =
      await api(
        '/api/send-multiple',
        {

          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({

              messages: [
                ticketMessage
              ]

            })
        }
      );


    $('ticketResult')
      .textContent =
        '✓ Panneau de tickets envoyé !';

  } catch (e) {

    $('ticketResult')
      .textContent =
        `Erreur : ${e.message}`;
  }
};


/* =========================================================
   ARRIVÉE / DÉPART
========================================================= */

async function loadWelcomeChannels(
  guildId
) {

  if (!$('welcomeChannel')) {
    return;
  }


  try {

    const channels =
      await api(
        `/api/guilds/${guildId}/channels`
      );


    $('welcomeChannel')
      .innerHTML =

        channels.map(
          c => `

            <option value="${c.id}">
              # ${esc(c.name)}
            </option>

          `
        ).join('');

  } catch (e) {

    $('welcomeChannel')
      .innerHTML = `

        <option value="">
          Erreur salons
        </option>

      `;
  }
}


if ($('welcomeGuild')) {

  $('welcomeGuild').onchange =
  async e => {

    await loadWelcomeChannels(
      e.target.value
    );
  };
}


/*
  Cette partie n'est pas encore
  connectée au backend.
*/

if ($('saveWelcome')) {

  $('saveWelcome').onclick =
    () => {

      alert(
        "La partie Arrivée / Départ sera connectée ensuite."
      );
    };
}


/* =========================================================
   DÉMARRAGE
========================================================= */

load();
