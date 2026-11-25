/* =========================================================
   Dev+ Central de Atendimento
   Ajuste os contatos e o envio do formulário aqui.
   ========================================================= */
const CONFIG = {
  whatsapp: "558521809953",              // só números, com DDI 55 + DDD
  whatsappLabel: "(85) 2180-9953",
  email: "atendimento@devmais.com",
  telegram: "devmais",                   // usuário do Telegram, sem @  (TROCAR pelo real)
  telegramLabel: "@devmais",

  // Opcional: URL que recebe os chamados em JSON (Formspree, webhook do n8n/Make,
  // Google Apps Script, API própria...). Vazio = o chamado é enviado só pelo WhatsApp.
  endpoint: "",

  // true = ao enviar, abre o WhatsApp com o resumo do chamado já escrito.
  openWhatsappOnSubmit: true,
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
const links = {
  whatsapp: waLink("Olá, vim pela central de atendimento da Dev+ e preciso de ajuda."),
  email: `mailto:${CONFIG.email}?subject=${encodeURIComponent("Atendimento Dev+")}`,
  telegram: `https://t.me/${CONFIG.telegram}`,
};

/* Links e textos dos canais */
$("#lnkWhatsapp").href = links.whatsapp;
$("#lnkEmail").href = links.email;
$("#lnkTelegram").href = links.telegram;
$$("[data-link]").forEach((a) => (a.href = links[a.dataset.link]));
$$("[data-fill]").forEach((el) => (el.textContent = CONFIG[el.dataset.fill]));
$("#ano").textContent = new Date().getFullYear();

/* Máscara de telefone */
const tel = $("#telefone");
tel.addEventListener("input", () => {
  const d = tel.value.replace(/\D/g, "").slice(0, 11);
  let out = d;
  if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 6) out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  tel.value = out;
});

/* Contador da descrição */
const desc = $("#descricao");
const count = $("#count");
desc.addEventListener("input", () => (count.textContent = `${desc.value.length}/2000`));

/* Perfil "interessado" pré-seleciona o tipo de solicitação */
$$('input[name="perfil"]').forEach((r) =>
  r.addEventListener("change", () => {
    const tipo = $("#tipo");
    if (r.value === "interessado" && r.checked) {
      tipo.value = "Quero conhecer as soluções";
      desc.placeholder = "Conte sobre sua empresa e o que você gostaria de resolver com tecnologia.";
    } else if (r.checked) {
      if (tipo.value === "Quero conhecer as soluções") tipo.value = "";
      desc.placeholder = "O que aconteceu, quando começou, em qual tela, e se aparece alguma mensagem de erro.";
    }
    tipo.closest(".field").classList.remove("is-invalid");
    analyze();
  })
);

/* =========================================================
   Urgência: explicação de cada nível + medidor pela descrição
   ========================================================= */
const LEVELS = ["Baixa", "Média", "Alta", "Crítica"];
const LEVEL_COLORS = ["var(--green-400)", "var(--yellow)", "var(--amber)", "var(--red)"];
const LEVEL_HELP = [
  {
    txt: "Use para <b>dúvidas, sugestões e ajustes</b> que não atrapalham o trabalho do dia a dia.",
    ex: ["Como exporto um relatório?", "Trocar uma foto ou texto do site", "Ideia de melhoria para uma tela"],
    sla: "Primeira resposta em até 2 dias úteis.",
  },
  {
    txt: "O sistema <b>funciona</b>, mas algo incomoda ou falha de vez em quando.",
    ex: ["Tela demorando para carregar", "Relatório com um valor estranho", "Erro que aparece só às vezes"],
    sla: "Primeira resposta em até 1 dia útil.",
  },
  {
    txt: "Uma <b>função importante não funciona</b>, mas ainda dá para continuar trabalhando de outro jeito.",
    ex: ["Impressão de comandas falhando", "Integração atrasando pedidos", "Alguns usuários sem acesso"],
    sla: "Primeira resposta em até 4 horas.",
  },
  {
    txt: "Só quando o sistema está <b>parado para todos</b> ou você está <b>perdendo vendas agora</b>.",
    ex: ["Site ou sistema fora do ar", "Ninguém consegue fazer pedido ou pagar", "Suspeita de invasão ou perda de dados"],
    sla: "Primeira resposta em até 2 horas. Esse nível aciona o plantão, então marcar só quando for o caso ajuda a gente a atender todo mundo mais rápido.",
  },
];

// Ponto de partida pelo tipo de solicitação escolhido
const TIPO_BASE = {
  "Sistema fora do ar": 70,
  "Erro ou falha no sistema": 45,
  "Lentidão ou instabilidade": 35,
  "Reclamação": 30,
  "Dúvida sobre uso": 10,
  "Sugestão de melhoria": 5,
  "Quero conhecer as soluções": 5,
};

// Sinais procurados na descrição (texto sem acento e em minúsculas)
const SIGNALS = [
  { re: /fora do ar|\bcaiu\b|\bcaindo\b|\boffline\b|nao (abre|carrega|entra)\b|tela branca|erro 50\d/, pts: 30, label: "sistema fora do ar" },
  { re: /\bparad[oa]s?\b|parou( de funcionar| tudo)?|travou tudo|nada funciona|nao funciona nada/, pts: 25, label: "operação parada" },
  { re: /invadid|hacke|vazament|vazou|ataque|fraude|golpe/, pts: 55, label: "possível incidente de segurança", strong: true },
  { re: /(dados|pedidos|cadastros|informacoes|registros) (sumiram|apagad|perdid)|perde(mos|u) (os )?dados/, pts: 30, label: "perda de dados" },
  { re: /\bvend(a|as|er|endo)\b|faturamento|pagamento|cobranca|\bpix\b|cartao|\bcaixa\b|checkout|nota fiscal|\bnf-?c?e\b/, pts: 15, label: "impacto financeiro", onlyIfProblem: true },
  { re: /pedido|delivery|ifood|cardapio|comanda|\bmesas?\b/, pts: 8, label: "afeta pedidos", onlyIfProblem: true },
  { re: /\btodos\b|todo mundo|ninguem|nenhum (cliente|usuario|funcionario)|toda a (equipe|loja|empresa)|todas as (lojas|unidades)/, pts: 15, label: "afeta todos" },
  { re: /\bagora\b|neste momento|desde (hoje|cedo|ontem|a manha)|ha \d+ (horas?|minutos?)/, pts: 5, label: "acontecendo agora" },
  { re: /\berr(o|os|ado)\b|falha|\bbug\b|nao (salva|funciona|atualiza|envia|imprime|aparece|consigo)|travando|\btrava\b|congela/, pts: 15, label: "erro em uma função" },
  { re: /\blent|demora|devagar|carregando muito/, pts: 8, label: "lentidão" },
  { re: /as vezes|de vez em quando|intermitente|ocasional|raramente|\buma vez\b/, pts: -10, label: "acontece só às vezes" },
  { re: /(so|apenas|somente) (em |no |na |com |pra |para )?(um|uma|1|eu|meu|minha)\b|\bum (cliente|usuario|funcionario)\b/, pts: -18, label: "afeta poucas pessoas", notWithStrong: true },
  { re: /duvida|como (faco|faz|eu|que)|gostaria de saber|e possivel|tem como/, pts: -15, label: "é uma dúvida", notProblem: true },
  { re: /sugest|seria (bom|legal|interessante)|melhoria|\bideia\b/, pts: -15, label: "sugestão de melhoria", notProblem: true },
  { re: /\bcor(es)?\b|\bfonte\b|\btexto\b|alinhad|layout|visual|\blogo\b|ortografia|digitacao/, pts: -8, label: "ajuste visual" },
  { re: /quando (puder|der)|sem pressa|nao (e|eh) urgente|com calma/, pts: -25, label: "sem pressa" },
  { re: /contorn|paliativ|da (pra|para) usar|consigo usar|funciona (pelo|no|em outro|de outro)/, pts: -10, label: "há como contornar" },
  { re: /urgente|urgencia|socorro|emergencia/, pts: 5, label: "pedido de urgência" },
];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function scoreDescription(text, tipo) {
  const t = norm(text);
  let score = TIPO_BASE[tipo] ?? 25;
  const reasons = [];
  if (tipo && TIPO_BASE[tipo] !== undefined) reasons.push({ label: `tipo: ${tipo.toLowerCase()}`, dir: TIPO_BASE[tipo] >= 35 ? "up" : "down" });
  const hits = SIGNALS.filter((s) => s.re.test(t));
  const isQuestion = hits.some((s) => s.notProblem) && !hits.some((s) => s.pts >= 15 && !s.onlyIfProblem);
  const hasStrong = hits.some((s) => s.strong);
  for (const s of hits) {
    if (s.onlyIfProblem && isQuestion) continue;   // "como vejo as vendas?" não é impacto financeiro
    if (s.notWithStrong && hasStrong) continue;    // "um usuário estranho" numa invasão não reduz a gravidade
    {
      score += s.pts;
      reasons.push({ label: s.label, dir: s.pts > 0 ? "up" : "down" });
    }
  }
  score = Math.max(0, Math.min(100, score));
  const level = score < 25 ? 0 : score < 50 ? 1 : score < 72 ? 2 : 3;
  return { score, level, reasons };
}

const meter = $("#meter");
const urgBlock = $("#urgBlock");
const urgHelp = $("#urgHelp");
const urgWarn = $("#urgWarn");
const urgRadios = $$('input[name="urgencia"]');
let urgTouched = false;   // o cliente escolheu a urgência na mão?
let suggestion = null;    // última sugestão do medidor (0-3)

const currentLevel = () => LEVELS.indexOf(urgRadios.find((r) => r.checked)?.value);

function setLevel(i) {
  urgRadios[i].checked = true;
  renderHelp();
}

function renderHelp() {
  const i = currentLevel();
  const h = LEVEL_HELP[i];
  urgHelp.style.setProperty("--c", LEVEL_COLORS[i]);
  urgHelp.innerHTML = `<p><b>${LEVELS[i]}:</b> ${h.txt}</p><ul>${h.ex.map((e) => `<li>${e}</li>`).join("")}</ul><span class="urg-help__sla">${h.sla}</span>`;
  renderWarning();
}

function renderWarning() {
  const sel = currentLevel();
  const show = urgTouched && suggestion !== null && sel !== suggestion &&
    (Math.abs(sel - suggestion) >= 2 || (sel === 3 && suggestion < 3));
  urgWarn.hidden = !show;
  if (!show) return;
  $("#urgWarnText").innerHTML = sel > suggestion
    ? `Você marcou <b>${LEVELS[sel]}</b>, mas pela descrição isso parece <b>${LEVELS[suggestion]}</b>. Se o sistema não está parado, uma urgência menor deixa o plantão livre para quem está sem conseguir trabalhar.`
    : `Você marcou <b>${LEVELS[sel]}</b>, mas pela descrição isso parece <b>${LEVELS[suggestion]}</b>. Se está atrapalhando seu trabalho, aumente a urgência para a gente priorizar.`;
  $("#useSuggestion").textContent = `Usar ${LEVELS[suggestion]}`;
}

function analyze() {
  const text = desc.value.trim();
  const tipo = $("#tipo").value;
  if (text.length < 10 && !tipo) {
    suggestion = null;
    meter.classList.add("is-empty");
    meter.removeAttribute("data-level");
    $("#meterFill").style.width = "0";
    $("#meterLevel").textContent = "Aguardando descrição";
    $("#meterText").textContent = "Escreva o que aconteceu que a gente sugere a urgência certa para o seu caso.";
    $("#meterReasons").innerHTML = "";
    urgBlock.classList.remove("is-auto");
    renderWarning();
    return;
  }
  const { score, level, reasons } = scoreDescription(text.length >= 10 ? text : "", tipo);
  suggestion = level;
  meter.classList.remove("is-empty");
  meter.dataset.level = level;
  $("#meterFill").style.width = `${Math.max(6, score)}%`;
  $("#meterLevel").textContent = LEVELS[level];
  $("#meterText").innerHTML = text.length >= 10
    ? `Pela sua descrição, isso parece urgência <b>${LEVELS[level]}</b>.`
    : `Pelo tipo escolhido, começa como <b>${LEVELS[level]}</b>. Descreva o problema para ajustar.`;
  $("#meterReasons").innerHTML = reasons.map((r) => `<li class="${r.dir}">${r.label}</li>`).join("");

  if (!urgTouched) {
    setLevel(level);
    urgBlock.classList.add("is-auto");
  } else {
    renderWarning();
  }
}

let analyzeTimer;
desc.addEventListener("input", () => { clearTimeout(analyzeTimer); analyzeTimer = setTimeout(analyze, 250); });
$("#tipo").addEventListener("change", analyze);
urgRadios.forEach((r) => r.addEventListener("change", () => {
  urgTouched = true;
  urgBlock.classList.remove("is-auto");
  renderHelp();
}));
$("#useSuggestion").addEventListener("click", () => {
  urgTouched = false;
  setLevel(suggestion);
  urgBlock.classList.add("is-auto");
});
renderHelp();

/* Validação */
const rules = {
  nome: (v) => v.trim().length >= 2,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  telefone: (v) => v.replace(/\D/g, "").length >= 10,
  tipo: (v) => !!v,
  sistema: (v) => !!v,
  descricao: (v) => v.trim().length >= 10,
};
function checkField(name) {
  const el = $(`#${name}`);
  const ok = rules[name](el.value);
  el.closest(".field").classList.toggle("is-invalid", !ok);
  return ok;
}
Object.keys(rules).forEach((name) => {
  const el = $(`#${name}`);
  el.addEventListener("blur", () => el.value && checkField(name));
  el.addEventListener("input", () => el.closest(".field").classList.contains("is-invalid") && checkField(name));
  el.addEventListener("change", () => el.closest(".field").classList.contains("is-invalid") && checkField(name));
});
$("#lgpd").addEventListener("change", (e) => $("#lgpdWrap").classList.toggle("is-invalid", !e.target.checked));

function protocol() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DEV-${stamp}-${rand}`;
}

/* Envio */
const form = $("#ticketForm");
const success = $("#success");
const btn = $("#submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const results = Object.keys(rules).map(checkField);
  const lgpd = $("#lgpd").checked;
  $("#lgpdWrap").classList.toggle("is-invalid", !lgpd);
  if (results.includes(false) || !lgpd) {
    const first = $(".is-invalid input, .is-invalid select, .is-invalid textarea");
    first?.focus();
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  data.protocolo = protocol();
  data.criadoEm = new Date().toISOString();
  data.origem = location.href;
  data.urgenciaSugerida = suggestion !== null ? LEVELS[suggestion] : "-";
  data.urgenciaAjustadaPeloCliente = urgTouched;

  const resumo =
`*Novo chamado Dev+*
Protocolo: ${data.protocolo}

*Nome:* ${data.nome}
*Empresa:* ${data.empresa || "-"}
*Perfil:* ${data.perfil === "cliente" ? "Cliente" : "Interessado"}
*E-mail:* ${data.email}
*WhatsApp:* ${data.telefone}

*Tipo:* ${data.tipo}
*Sistema:* ${data.sistema}
*Urgência:* ${data.urgencia}${data.urgenciaSugerida !== data.urgencia ? ` (medidor sugeriu ${data.urgenciaSugerida})` : ""}
*Retorno por:* ${data.retorno}

*Descrição:*
${data.descricao}`;

  btn.disabled = true;
  btn.firstChild.textContent = "Enviando... ";

  // Abre a janela antes do await para o navegador não bloquear o pop-up
  const waWindow = CONFIG.openWhatsappOnSubmit ? window.open("", "_blank") : null;

  if (CONFIG.endpoint) {
    try {
      await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn("Falha ao enviar para o endpoint, seguindo pelo WhatsApp.", err);
    }
  }

  try {
    const hist = JSON.parse(localStorage.getItem("devmais-chamados") || "[]");
    hist.unshift({ protocolo: data.protocolo, tipo: data.tipo, criadoEm: data.criadoEm });
    localStorage.setItem("devmais-chamados", JSON.stringify(hist.slice(0, 20)));
  } catch {}

  const url = waLink(resumo);
  if (waWindow) waWindow.location.href = url;

  $("#protocolo").textContent = data.protocolo;
  $("#successWa").href = url;
  form.hidden = true;
  success.hidden = false;
  success.scrollIntoView({ behavior: "smooth", block: "center" });

  btn.disabled = false;
  btn.firstChild.textContent = "Enviar chamado ";
});

$("#newTicket").addEventListener("click", () => {
  form.reset();
  count.textContent = "0/2000";
  urgTouched = false;
  analyze();
  renderHelp();
  success.hidden = true;
  form.hidden = false;
  $("#nome").focus();
});
