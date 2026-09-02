const $ = id => document.getElementById(id);
const blankMessage = () => ({
  name:'Message',
  guildId:'',
  channelId:'',
  content:'',
  embed:{enabled:false,title:'',description:'',color:'#5865F2',image:'',thumbnail:'',footer:''},
  buttons:[],
  selects:[]
});
const state = { messages:[blankMessage()], current:0, guilds:[], channels:[], categories:[], roles:[] };

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
async function api(url,opt){const r=await fetch(url,opt);const d=await r.json();if(!r.ok)throw new Error(d.error||'Erreur');return d}
function cur(){return state.messages[state.current]}

async function load(){
  const st=await api('/api/status');
  $('status').textContent=st.ready?`● ${st.user.tag}`:'Bot non connecté';
  if(st.ready)$('status').classList.add('ok');
  state.guilds=await api('/api/guilds');
  $('guild').innerHTML=state.guilds.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  if(state.guilds[0]){
    cur().guildId=state.guilds[0].id;
    await loadGuild(cur().guildId);
  }
  renderAll();
}
async function loadGuild(guildId){
  const [channels,cats,roles]=await Promise.all([
    api(`/api/guilds/${guildId}/channels`),
    api(`/api/guilds/${guildId}/categories`),
    api(`/api/guilds/${guildId}/roles`)
  ]);
  state.channels=channels;state.categories=cats;state.roles=roles;
  $('channel').innerHTML=channels.map(c=>`<option value="${c.id}"># ${esc(c.name)}</option>`).join('');
  if(!cur().channelId && channels[0])cur().channelId=channels[0].id;
}

function saveFields(){
  const m=cur();
  m.guildId=$('guild').value;
  m.channelId=$('channel').value;
  m.content=$('content').value;
  m.embed={
    enabled:$('embedEnabled').checked,
    title:$('embedTitle').value,
    description:$('embedDescription').value,
    color:$('embedColor').value,
    image:$('embedImage').value,
    thumbnail:$('embedThumbnail').value,
    footer:$('embedFooter').value
  };
}
function loadFields(){
  const m=cur();
  $('guild').value=m.guildId||$('guild').value;
  $('channel').value=m.channelId||$('channel').value;
  $('content').value=m.content;
  $('embedEnabled').checked=m.embed.enabled;
  $('embedTitle').value=m.embed.title;
  $('embedDescription').value=m.embed.description;
  $('embedColor').value=m.embed.color||'#5865F2';
  $('embedImage').value=m.embed.image;
  $('embedThumbnail').value=m.embed.thumbnail;
  $('embedFooter').value=m.embed.footer;
}

function renderTabs(){
  $('messageTabs').innerHTML=state.messages.map((m,i)=>
    `<button class="msgTab ${i===state.current?'active':''}" data-msg="${i}">${esc(m.name)} ${i+1}</button>`
  ).join('');
  document.querySelectorAll('[data-msg]').forEach(b=>b.onclick=async()=>{
    saveFields();state.current=+b.dataset.msg;
    const m=cur();
    if(m.guildId) await loadGuild(m.guildId);
    loadFields();renderAll();
  });
}

function renderEditors(){
  const m=cur();
  $('buttons').innerHTML=m.buttons.map((b,i)=>`
    <div class="card">
      <div class="row3">
        <label>Label<input data-b="${i}" data-k="label" value="${esc(b.label)}"></label>
        <label>Style<select data-b="${i}" data-k="style">
          ${['primary','secondary','success','danger','link'].map(x=>`<option value="${x}" ${b.style===x?'selected':''}>${x}</option>`).join('')}
        </select></label>
        <button class="danger" data-del-b="${i}">×</button>
      </div>
      <div class="two">
        <label>Emoji<input data-b="${i}" data-k="emoji" value="${esc(b.emoji)}" placeholder="🎫"></label>
        ${b.style==='link'
          ? `<label>URL<input data-b="${i}" data-k="url" value="${esc(b.url)}"></label>`
          : `<label>Action<select data-b="${i}" data-k="actionType">
               <option value="reply" ${b.actionType==='reply'?'selected':''}>Réponse</option>
               <option value="ticket_picker" ${b.actionType==='ticket_picker'?'selected':''}>Ticket + sélecteur</option>
             </select></label>`}
      </div>
      ${b.style!=='link'&&b.actionType==='reply'
        ? `<label>Réponse<input data-b="${i}" data-k="response" value="${esc(b.response)}"></label>`:''}
      ${b.style!=='link'&&b.actionType==='ticket_picker'
        ? `<label>Message avant le sélecteur<input data-b="${i}" data-k="selectorMessage" value="${esc(b.selectorMessage)}"></label>
           <label>Placeholder du sélecteur<input data-b="${i}" data-k="placeholder" value="${esc(b.placeholder)}"></label>
           <button class="secondary" data-add-type="${i}">+ Type de ticket</button>
           ${(b.ticketTypes||[]).map((t,ti)=>`
             <div class="ticketType">
               <div class="ticketGrid">
                 <label>Nom<input data-b="${i}" data-ti="${ti}" data-k="label" value="${esc(t.label)}"></label>
                 <label>Emoji<input data-b="${i}" data-ti="${ti}" data-k="emoji" value="${esc(t.emoji)}"></label>
                 <label>Catégorie<select data-b="${i}" data-ti="${ti}" data-k="categoryId">
                   <option value="">Aucune</option>
                   ${state.categories.map(c=>`<option value="${c.id}" ${t.categoryId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
                 </select></label>
                 <label>Rôle staff<select data-b="${i}" data-ti="${ti}" data-k="staffRoleId">
                   <option value="">Aucun</option>
                   ${state.roles.map(r=>`<option value="${r.id}" ${t.staffRoleId===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}
                 </select></label>
               </div>
               <label>Description<input data-b="${i}" data-ti="${ti}" data-k="description" value="${esc(t.description)}"></label>
               <label>Message d'accueil<textarea rows="2" data-b="${i}" data-ti="${ti}" data-k="welcomeMessage">${esc(t.welcomeMessage)}</textarea></label>
               <button class="danger" data-del-type="${i}:${ti}">Supprimer ce type</button>
             </div>`).join('')}`
        : ''}
    </div>`).join('');

  $('selects').innerHTML=m.selects.map((s,si)=>`
    <div class="card">
      <div class="row3">
        <label>Placeholder<input data-s="${si}" data-k="placeholder" value="${esc(s.placeholder)}"></label><div></div>
        <button class="danger" data-del-s="${si}">×</button>
      </div>
      <button class="secondary" data-add-opt="${si}">+ Option</button>
      ${(s.options||[]).map((o,oi)=>`
        <div class="optionRow">
          <label>Label<input data-s="${si}" data-oi="${oi}" data-k="label" value="${esc(o.label)}"></label>
          <label>Valeur<input data-s="${si}" data-oi="${oi}" data-k="value" value="${esc(o.value)}"></label>
          <label>Réponse<input data-s="${si}" data-oi="${oi}" data-k="response" value="${esc(o.response)}"></label>
          <button class="danger" data-del-opt="${si}:${oi}">×</button>
        </div>`).join('')}
    </div>`).join('');
  bindDynamic();
}

function bindDynamic(){
  document.querySelectorAll('[data-b]').forEach(el=>el.oninput=()=>{
    const bi=+el.dataset.b,k=el.dataset.k;
    if(el.dataset.ti!==undefined) cur().buttons[bi].ticketTypes[+el.dataset.ti][k]=el.value;
    else cur().buttons[bi][k]=el.value;
    if(k==='style'||k==='actionType')renderEditors();
    updatePreview();
  });
  document.querySelectorAll('[data-del-b]').forEach(el=>el.onclick=()=>{cur().buttons.splice(+el.dataset.delB,1);renderAll()});
  document.querySelectorAll('[data-add-type]').forEach(el=>el.onclick=()=>{
    cur().buttons[+el.dataset.addType].ticketTypes.push({
      id:`type_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      label:'Support',emoji:'🎫',description:'Besoin d’aide',
      categoryId:'',staffRoleId:'',welcomeMessage:'Explique ton problème ici.'
    });renderAll();
  });
  document.querySelectorAll('[data-del-type]').forEach(el=>el.onclick=()=>{
    const [bi,ti]=el.dataset.delType.split(':').map(Number);
    cur().buttons[bi].ticketTypes.splice(ti,1);renderAll();
  });

  document.querySelectorAll('[data-s]').forEach(el=>el.oninput=()=>{
    const si=+el.dataset.s,k=el.dataset.k;
    if(el.dataset.oi!==undefined)cur().selects[si].options[+el.dataset.oi][k]=el.value;
    else cur().selects[si][k]=el.value;
    updatePreview();
  });
  document.querySelectorAll('[data-del-s]').forEach(el=>el.onclick=()=>{cur().selects.splice(+el.dataset.delS,1);renderAll()});
  document.querySelectorAll('[data-add-opt]').forEach(el=>el.onclick=()=>{
    cur().selects[+el.dataset.addOpt].options.push({label:'Option',value:`opt_${Date.now()}`,response:'Choix reçu.'});renderAll();
  });
  document.querySelectorAll('[data-del-opt]').forEach(el=>el.onclick=()=>{
    const [si,oi]=el.dataset.delOpt.split(':').map(Number);
    cur().selects[si].options.splice(oi,1);renderAll();
  });
}

function updatePreview(){
  saveFields();
  const m=cur();
  $('previewContent').textContent=m.content;
  $('previewEmbed').innerHTML=m.embed.enabled?`
    <div class="embedPreview" style="border-left-color:${m.embed.color}">
      ${m.embed.title?`<h3>${esc(m.embed.title)}</h3>`:''}
      ${m.embed.description?`<p>${esc(m.embed.description)}</p>`:''}
    </div>`:'';
  $('previewComponents').innerHTML=m.buttons.length
    ? `<div class="componentRow">${m.buttons.slice(0,5).map(b=>`<div class="dcButton">${esc(b.emoji)} ${esc(b.label)}</div>`).join('')}</div>`
    : '';
}

function renderAll(){renderTabs();loadFields();renderEditors();updatePreview()}

$('guild').onchange=async e=>{
  saveFields();cur().guildId=e.target.value;cur().channelId='';
  await loadGuild(e.target.value);$('channel').value=cur().channelId;renderEditors();
};
$('channel').onchange=e=>{cur().channelId=e.target.value};

$('addMessage').onclick=()=>{
  saveFields();
  const m=blankMessage();
  m.name='Message';
  m.guildId=cur().guildId;
  m.channelId=cur().channelId;
  state.messages.push(m);
  state.current=state.messages.length-1;
  renderAll();
};

$('addButton').onclick=()=>{
  cur().buttons.push({
    label:'Bouton',style:'primary',emoji:'',url:'',actionType:'reply',response:'Merci !',
    selectorMessage:'Quel type de ticket veux-tu ouvrir ?',
    placeholder:'Choisis le type de ticket',
    ticketTypes:[]
  });
  renderAll();
};
$('addSelect').onclick=()=>{
  cur().selects.push({placeholder:'Choisis une option',options:[{label:'Option 1',value:`opt_${Date.now()}`,response:'Choix reçu.'}]});
  renderAll();
};

['content','embedEnabled','embedTitle','embedDescription','embedColor','embedImage','embedThumbnail','embedFooter']
.forEach(id=>$(id).addEventListener('input',updatePreview));

$('sendAll').onclick=async()=>{
  saveFields();
  $('result').textContent='Envoi…';
  try{
    const data=await api('/api/send-multiple',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages:state.messages})
    });
    $('result').textContent=`✓ ${data.sent.length} message(s) envoyé(s)`;
  }catch(e){$('result').textContent=`Erreur : ${e.message}`}
};

load();
