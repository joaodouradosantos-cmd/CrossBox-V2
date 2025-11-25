// js/app.js

// ==== CONSTANTES DE ARMAZENAMENTO ====
const STORAGE_KEYS = {
  PROFILE: "crossbox_v2_profile",
  RM: "crossbox_v2_1rm",
  RM_HISTORY: "crossbox_v2_1rm_history",
  WOD: "crossbox_v2_wod",
  BACKUP_META: "crossbox_v2_backup_meta",
  THEME: "crossbox_v2_theme"
};

// ==== DADOS BÁSICOS – EXERCÍCIOS ====
// Substitui este EXER_INFO pelo array completo da tua versão anterior, se quiseres.
const EXER_INFO = [
  { en: "Back Squat", pt: "Agachamento com barra nas costas", descricao: "Agachamento com a barra apoiada nas costas, descendo até à paralela ou abaixo." },
  { en: "Front Squat", pt: "Agachamento frontal", descricao: "Barra apoiada à frente dos ombros, tronco mais vertical, foco em quadríceps e core." },
  { en: "Deadlift", pt: "Peso morto", descricao: "Levar a barra do chão até à anca com costas neutras e core firme." },
  { en: "Clean & Jerk", pt: "Clean & jerk", descricao: "Barra do chão aos ombros (clean) e dos ombros acima da cabeça (jerk)." },
  { en: "Snatch", pt: "Arranco", descricao: "Barra do chão até acima da cabeça num só movimento explosivo." },
  { en: "Bench Press", pt: "Supino com barra", descricao: "Empurrar a barra para longe do peito, deitado no banco." },
  { en: "Pull-Up", pt: "Puxada na barra", descricao: "Puxar o corpo até o queixo ultrapassar a barra, com controlo." },
  { en: "Burpee", pt: "Burpee", descricao: "Agachar, entrar em prancha, flexão e salto com extensão total." },
  { en: "Rowing", pt: "Remo", descricao: "Exercício na máquina de remo, combinando pernas, tronco e braços." },
  { en: "Running", pt: "Corrida", descricao: "Corrida em tapete ou exterior, ritmo contínuo ou intervalado." }
];

const MOVES_PT = {};
EXER_INFO.forEach(ex => {
  MOVES_PT[ex.en] = ex.pt;
});

// Exercícios para 1RM – escolhe os que fizerem mais sentido para força
const RM_EXERCISES = [
  "Back Squat",
  "Front Squat",
  "Deadlift",
  "Clean & Jerk",
  "Snatch",
  "Bench Press"
];

// Lista completa para WOD / Guia
const ALL_EXERCISES = Array.from(new Set(EXER_INFO.map(ex => ex.en))).sort();

// ==== ESTADO EM MEMÓRIA ====
let profile = loadJSON(STORAGE_KEYS.PROFILE, {});
let rmData = loadJSON(STORAGE_KEYS.RM, {});           // { nome -> 1RM }
let rmHistory = loadJSON(STORAGE_KEYS.RM_HISTORY, {}); // { nome -> [ {date, value} ] }
let wodEntries = loadJSON(STORAGE_KEYS.WOD, []);       // array de treinos
let rmChart = null;

// ==== UTILITÁRIOS ====

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatKg(v) {
  return v.toFixed(1).replace(".", ",") + " kg";
}

function formatKm(v) {
  return v.toFixed(2).replace(".", ",") + " km";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseTimeToSeconds(str) {
  if (!str) return null;
  const parts = str.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map(p => parseInt(p, 10));
  if (nums.some(n => Number.isNaN(n))) return null;

  let h = 0, m = 0, s = 0;
  if (nums.length === 2) {
    [m, s] = nums;
  } else {
    [h, m, s] = nums;
  }
  if (m < 0 || s < 0 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
}

// ==== TEMA (dark / light) ====

function initTheme() {
  const btn = document.getElementById("toggle-theme");
  const saved = localStorage.getItem(STORAGE_KEYS.THEME);
  if (saved === "light") {
    document.body.classList.add("theme-light");
  }

  btn.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("theme-light");
    localStorage.setItem(STORAGE_KEYS.THEME, isLight ? "light" : "dark");
  });
}

// ==== PERFIL ====

function renderProfileSummary() {
  const summaryEl = document.getElementById("profile-summary");
  const subtitleEl = document.getElementById("subtitle");

  if (!summaryEl) return;

  if (!profile || !profile.nome) {
    summaryEl.innerHTML = `<span>Sem perfil definido</span>`;
    if (subtitleEl) subtitleEl.textContent = "Toca em «Editar» para criar o teu perfil";
    return;
  }

  const parts = [];
  parts.push(`<span>${profile.nome}</span>`);
  if (profile.nivel) parts.push(`<span>${profile.nivel}</span>`);
  if (profile.sexo) parts.push(`<span>${profile.sexo}</span>`);
  if (profile.idade) parts.push(`<span>${profile.idade} anos</span>`);
  if (profile.altura) parts.push(`<span>${profile.altura} cm</span>`);
  if (profile.peso) parts.push(`<span>${profile.peso} kg</span>`);

  summaryEl.innerHTML = parts.join(" ");
  if (subtitleEl) subtitleEl.textContent = `Registo de treinos de ${profile.nome}`;
}

function initProfile() {
  const btnEdit = document.getElementById("edit-profile");
  const form = document.getElementById("profile-form");
  const btnCancel = document.getElementById("cancel-profile");

  const nomeEl = document.getElementById("nome");
  const nivelEl = document.getElementById("nivel");
  const sexoEl = document.getElementById("sexo");
  const idadeEl = document.getElementById("idade");
  const alturaEl = document.getElementById("altura");
  const pesoEl = document.getElementById("peso");

  // preencher formulário com dados existentes
  if (profile) {
    nomeEl.value = profile.nome || "";
    nivelEl.value = profile.nivel || "";
    sexoEl.value = profile.sexo || "";
    idadeEl.value = profile.idade || "";
    alturaEl.value = profile.altura || "";
    pesoEl.value = profile.peso || "";
  }

  renderProfileSummary();

  btnEdit.addEventListener("click", () => {
    form.classList.toggle("hidden");
  });

  btnCancel.addEventListener("click", () => {
    form.classList.add("hidden");
  });

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();

    profile = {
      nome: nomeEl.value.trim(),
      nivel: nivelEl.value || "",
      sexo: sexoEl.value || "",
      idade: idadeEl.value ? parseInt(idadeEl.value, 10) : "",
      altura: alturaEl.value ? parseInt(alturaEl.value, 10) : "",
      peso: pesoEl.value ? parseFloat(pesoEl.value) : ""
    };

    saveJSON(STORAGE_KEYS.PROFILE, profile);
    registerBackupMeta("Perfil atualizado");
    renderProfileSummary();
    renderPerformance();
    form.classList.add("hidden");
  });
}

// ==== NAVEGAÇÃO ENTRE TABS ====

function initTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-btn"));
  const views = Array.from(document.querySelectorAll(".tab-view"));

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.view;
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      views.forEach(v => {
        v.classList.toggle("active", v.id === target);
      });
    });
  });
}

// ==== 1RM ====

function fillSelectRm() {
  const select = document.getElementById("exercise");
  const graphSelect = document.getElementById("graph-exercise");
  if (!select || !graphSelect) return;

  // exercicios de força para 1RM
  select.innerHTML = "";
  RM_EXERCISES.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    const label = MOVES_PT[name] ? `${name} – ${MOVES_PT[name]}` : name;
    opt.textContent = label;
    select.appendChild(opt);
  });

  // para o gráfico, só exercícios com histórico / valor atual
  const names = new Set([
    ...Object.keys(rmData || {}),
    ...Object.keys(rmHistory || {})
  ]);

  graphSelect.innerHTML = "";
  if (!names.size) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Sem dados";
    graphSelect.appendChild(opt);
    graphSelect.disabled = true;
  } else {
    graphSelect.disabled = false;
    Array.from(names).sort().forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      graphSelect.appendChild(opt);
    });
  }
}

function renderRmTable() {
  const tbody = document.getElementById("table-1rm");
  if (!tbody) return;
  tbody.innerHTML = "";

  const names = Object.keys(rmData).sort();
  const pesoCorporal = profile && profile.peso ? profile.peso : null;

  names.forEach(name => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    const label = MOVES_PT[name] ? `${name} – ${MOVES_PT[name]}` : name;
    tdName.textContent = label;
    tr.appendChild(tdName);

    const tdRm = document.createElement("td");
    let text = formatKg(rmData[name]);
    if (pesoCorporal) {
      const rel = rmData[name] / pesoCorporal;
      text += ` (${rel.toFixed(2)}x corpo)`;
    }
    tdRm.textContent = text;
    tr.appendChild(tdRm);

    const percents = [0.25, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    percents.forEach(p => {
      const td = document.createElement("td");
      td.textContent = formatKg(rmData[name] * p);
      tr.appendChild(td);
    });

    const tdDel = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "btn-delete";
    btn.textContent = "🗑";
    btn.addEventListener("click", () => {
      if (!confirm(`Apagar dados de 1RM para ${name}?`)) return;
      delete rmData[name];
      delete rmHistory[name];
      saveJSON(STORAGE_KEYS.RM, rmData);
      saveJSON(STORAGE_KEYS.RM_HISTORY, rmHistory);
      registerBackupMeta("1RM removido");
      renderRmTable();
      fillSelectRm();
      updateRmChart();
      renderPerformance();
    });
    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
  });

  fillSelectRm();
}

function updateRmChart() {
  const canvas = document.getElementById("rmChart");
  const select = document.getElementById("graph-exercise");
  if (!canvas || !select) return;

  const name = select.value;
  const ctx = canvas.getContext("2d");

  if (rmChart) {
    rmChart.destroy();
    rmChart = null;
  }

  if (!name || (!rmHistory[name] && !rmData[name])) {
    rmChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Sem dados"],
        datasets: [{ label: "1RM (kg)", data: [0], tension: 0.25 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
    return;
  }

  const labels = [];
  const values = [];

  const hist = (rmHistory[name] || []).slice().sort((a, b) =>
    (a.date || "").localeCompare(b.date || "")
  );
  hist.forEach(h => {
    labels.push(h.date || "hist");
    values.push(h.value);
  });

  if (rmData[name]) {
    labels.push("Atual");
    values.push(rmData[name]);
  }

  const label = MOVES_PT[name]
    ? `${name} – ${MOVES_PT[name]} (1RM)`
    : `${name} – 1RM`;

  rmChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        tension: 0.25
      }]
    },
    options: {
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: "Registos" } },
        y: { title: { display: true, text: "Peso (kg)" }, beginAtZero: false }
      }
    }
  });
}

function initRm() {
  const form = document.getElementById("form-1rm");
  const select = document.getElementById("exercise");
  const inputRm = document.getElementById("oneRm");
  const graphSelect = document.getElementById("graph-exercise");

  fillSelectRm();
  renderRmTable();
  updateRmChart();

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const name = select.value;
    const value = parseFloat(inputRm.value || "0");
    if (!name || !value || value <= 0) return;

    const anterior = rmData[name];
    if (typeof anterior === "number" && !Number.isNaN(anterior) && anterior !== value) {
      if (!rmHistory[name]) rmHistory[name] = [];
      rmHistory[name].push({ date: todayISO(), value: anterior });
    }

    rmData[name] = value;
    saveJSON(STORAGE_KEYS.RM, rmData);
    saveJSON(STORAGE_KEYS.RM_HISTORY, rmHistory);
    registerBackupMeta("1RM atualizado");
    inputRm.value = "";
    renderRmTable();
    updateRmChart();
    renderPerformance();
  });

  if (graphSelect) {
    graphSelect.addEventListener("change", updateRmChart);
  }
}

// ==== WOD ====

function fillSelectWod() {
  const select = document.getElementById("wod-exercise");
  if (!select) return;
  select.innerHTML = "";
  ALL_EXERCISES.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    const label = MOVES_PT[name] ? `${name} – ${MOVES_PT[name]}` : name;
    opt.textContent = label;
    select.appendChild(opt);
  });
}

function calcCarga(entry) {
  const peso = entry.peso || 0;
  const reps = entry.reps || 0;
  const sets = entry.sets || 0;
  return peso * reps * sets;
}

function renderWod(dateFilter) {
  const tbody = document.getElementById("wod-table");
  const summaryEl = document.getElementById("wod-summary");
  if (!tbody) return;

  tbody.innerHTML = "";
  const date = dateFilter || todayISO();
  const lista = wodEntries.filter(w => w.date === date);

  let totalCarga = 0;
  let totalDist = 0;

  lista.forEach((e, idx) => {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = e.date;
    tr.appendChild(tdDate);

    const tdEx = document.createElement("td");
    const label = MOVES_PT[e.ex] ? `${e.ex} – ${MOVES_PT[e.ex]}` : e.ex;
    tdEx.textContent = label;
    tr.appendChild(tdEx);

    const tdType = document.createElement("td");
    tdType.textContent = e.tipo || "";
    tr.appendChild(tdType);

    const tdSets = document.createElement("td");
    tdSets.textContent = e.sets || "";
    tr.appendChild(tdSets);

    const tdReps = document.createElement("td");
    tdReps.textContent = e.reps || "";
    tr.appendChild(tdReps);

    const tdPeso = document.createElement("td");
    tdPeso.textContent = e.peso ? formatKg(e.peso) : "";
    tr.appendChild(tdPeso);

    const tdPerc = document.createElement("td");
    tdPerc.textContent = e.perc1rm ? (e.perc1rm * 100).toFixed(0) + "%" : "";
    tr.appendChild(tdPerc);

    const tdTempo = document.createElement("td");
    tdTempo.textContent = e.tempo || "";
    tr.appendChild(tdTempo);

    const tdDist = document.createElement("td");
    tdDist.textContent = e.distanciaKm ? formatKm(e.distanciaKm) : "";
    tr.appendChild(tdDist);

    const tdCarga = document.createElement("td");
    tdCarga.textContent = e.carga ? formatKg(e.carga) : "";
    tr.appendChild(tdCarga);

    const tdDel = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "btn-delete";
    btn.textContent = "🗑";
    btn.addEventListener("click", () => {
      if (!confirm("Apagar este registo de WOD?")) return;
      wodEntries.splice(idx, 1);
      saveJSON(STORAGE_KEYS.WOD, wodEntries);
      registerBackupMeta("WOD removido");
      renderWod(date);
      renderPerformance();
    });
    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);

    totalCarga += e.carga || 0;
    totalDist += e.distanciaKm || 0;
  });

  if (summaryEl) {
    if (!lista.length) {
      summaryEl.textContent = `Sem treinos registados em ${date}.`;
    } else {
      let txt = `Resumo de ${date}: carga total ${formatKg(totalCarga)}`;
      if (totalDist > 0) txt += ` · distância ${formatKm(totalDist)}`;
      summaryEl.textContent = txt;
    }
  }
}

function initWod() {
  const form = document.getElementById("form-wod");
  const dateEl = document.getElementById("wod-date");
  const exEl = document.getElementById("wod-exercise");
  const typeEl = document.getElementById("wod-type");
  const setsEl = document.getElementById("wod-sets");
  const repsEl = document.getElementById("wod-reps");
  const weightEl = document.getElementById("wod-weight");
  const timeEl = document.getElementById("wod-time");
  const distEl = document.getElementById("wod-distance");

  fillSelectWod();

  if (dateEl && !dateEl.value) {
    dateEl.value = todayISO();
  }

  renderWod(dateEl.value);

  form.addEventListener("submit", ev => {
    ev.preventDefault();

    const date = dateEl.value || todayISO();
    const ex = exEl.value;
    const tipo = typeEl.value;
    const sets = parseInt(setsEl.value || "0", 10);
    const reps = parseInt(repsEl.value || "0", 10);
    const peso = parseFloat(weightEl.value || "0");
    const tempo = timeEl.value.trim();
    const dist = parseFloat(distEl.value || "0");

    if (!ex || !reps || reps <= 0 || !sets || sets <= 0) {
      alert("Indica exercício, rondas/séries e repetições.");
      return;
    }

    const entry = {
      date,
      ex,
      tipo,
      sets,
      reps,
      peso: peso > 0 ? peso : 0,
      tempo: tempo || "",
      distanciaKm: (!Number.isNaN(dist) && dist > 0) ? dist : 0
    };

    entry.carga = calcCarga(entry);

    if (rmData[ex] && entry.peso > 0) {
      entry.perc1rm = entry.peso / rmData[ex];
    } else {
      entry.perc1rm = null;
    }

    wodEntries.unshift(entry);
    saveJSON(STORAGE_KEYS.WOD, wodEntries);
    registerBackupMeta("WOD registado");
    renderWod(date);
    renderPerformance();

    // limpar campos principais
    setsEl.value = "";
    repsEl.value = "";
    weightEl.value = "";
    timeEl.value = "";
    distEl.value = "";
  });

  dateEl.addEventListener("change", () => {
    renderWod(dateEl.value);
  });
}

// ==== PERFORMANCE ====

function renderPerformance() {
  renderPerfDays();
  renderPerf1rm();
}

function renderPerfDays() {
  const tbody = document.getElementById("perf-days");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!wodEntries.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "Ainda não existem WOD registados.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const map = {};
  wodEntries.forEach(w => {
    if (!w.date) return;
    if (!map[w.date]) {
      map[w.date] = { carga: 0, dist: 0, n: 0 };
    }
    map[w.date].carga += w.carga || 0;
    map[w.date].dist += w.distanciaKm || 0;
    map[w.date].n += 1;
  });

  const rows = Object.keys(map).map(date => ({
    date,
    carga: map[date].carga,
    dist: map[date].dist,
    n: map[date].n
  }));

  rows.sort((a, b) => (b.carga || 0) - (a.carga || 0));

  rows.slice(0, 10).forEach(r => {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = r.date;
    tr.appendChild(tdDate);

    const tdCarga = document.createElement("td");
    tdCarga.textContent = formatKg(r.carga);
    tr.appendChild(tdCarga);

    const tdDist = document.createElement("td");
    tdDist.textContent = r.dist ? formatKm(r.dist) : "-";
    tr.appendChild(tdDist);

    const tdN = document.createElement("td");
    tdN.textContent = r.n.toString();
    tr.appendChild(tdN);

    tbody.appendChild(tr);
  });
}

function renderPerf1rm() {
  const tbody = document.getElementById("perf-1rm");
  if (!tbody) return;
  tbody.innerHTML = "";

  const names = Object.keys(rmData || {});
  if (!names.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "Ainda não registaste nenhum 1RM.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const pesoCorporal = profile && profile.peso ? profile.peso : null;

  const rows = names.map(name => ({
    name,
    value: rmData[name]
  })).sort((a, b) => (b.value || 0) - (a.value || 0));

  rows.slice(0, 10).forEach(r => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    const label = MOVES_PT[r.name] ? `${r.name} – ${MOVES_PT[r.name]}` : r.name;
    tdName.textContent = label;
    tr.appendChild(tdName);

    const tdVal = document.createElement("td");
    tdVal.textContent = formatKg(r.value);
    tr.appendChild(tdVal);

    const tdRel = document.createElement("td");
    if (pesoCorporal) {
      tdRel.textContent = (r.value / pesoCorporal).toFixed(2) + "x";
    } else {
      tdRel.textContent = "-";
    }
    tr.appendChild(tdRel);

    tbody.appendChild(tr);
  });
}

// ==== GUIA ====

function renderGuide(filter) {
  const tbody = document.getElementById("guide-table");
  if (!tbody) return;
  tbody.innerHTML = "";

  const f = (filter || "").toLowerCase().trim();

  EXER_INFO.forEach(ex => {
    const text = (ex.en + " " + ex.pt + " " + ex.descricao).toLowerCase();
    if (f && !text.includes(f)) return;

    const tr = document.createElement("tr");

    const tdEn = document.createElement("td");
    tdEn.textContent = ex.en;
    tr.appendChild(tdEn);

    const tdPt = document.createElement("td");
    tdPt.textContent = ex.pt;
    tr.appendChild(tdPt);

    const tdDesc = document.createElement("td");
    tdDesc.textContent = ex.descricao;
    tr.appendChild(tdDesc);

    tbody.appendChild(tr);
  });
}

function initGuide() {
  const search = document.getElementById("guide-search");
  renderGuide("");
  search.addEventListener("input", () => {
    renderGuide(search.value);
  });
}

// ==== BACKUP ====

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function registerBackupMeta(evento) {
  const meta = loadJSON(STORAGE_KEYS.BACKUP_META, {});
  meta.lastChange = new Date().toISOString();
  meta.lastEvent = evento || "";
  saveJSON(STORAGE_KEYS.BACKUP_META, meta);
  updateBackupInfo();
}

function updateBackupInfo() {
  const meta = loadJSON(STORAGE_KEYS.BACKUP_META, {});
  const infoEl = document.getElementById("backup-info");
  if (!infoEl) return;

  const lastBackup = meta.lastBackup ? formatDateTime(meta.lastBackup) : "nunca";
  const lastChange = meta.lastChange ? formatDateTime(meta.lastChange) : "sem registo";

  infoEl.textContent =
    `Último backup exportado: ${lastBackup} · Última alteração de dados: ${lastChange}`;
}

function buildBackup() {
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    profile,
    rmData,
    rmHistory,
    wodEntries
  };
}

function initBackup() {
  const btnExport = document.getElementById("btn-export");
  const btnImport = document.getElementById("btn-import");
  const fileInput = document.getElementById("backup-file");

  updateBackupInfo();

  btnExport.addEventListener("click", () => {
    const data = buildBackup();
    const blob = new Blob([JSON.stringify(data)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    a.href = url;
    a.download = `crossbox_backup_${yyyy}${mm}${dd}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    const meta = loadJSON(STORAGE_KEYS.BACKUP_META, {});
    meta.lastBackup = new Date().toISOString();
    saveJSON(STORAGE_KEYS.BACKUP_META, meta);
    updateBackupInfo();
  });

  btnImport.addEventListener("click", () => {
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", ev => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== "object") {
          alert("Ficheiro inválido.");
          return;
        }

        profile = data.profile || {};
        rmData = data.rmData || {};
        rmHistory = data.rmHistory || {};
        wodEntries = data.wodEntries || [];

        saveJSON(STORAGE_KEYS.PROFILE, profile);
        saveJSON(STORAGE_KEYS.RM, rmData);
        saveJSON(STORAGE_KEYS.RM_HISTORY, rmHistory);
        saveJSON(STORAGE_KEYS.WOD, wodEntries);
        registerBackupMeta("Backup importado");

        // re-render
        renderProfileSummary();
        renderRmTable();
        fillSelectRm();
        updateRmChart();
        renderWod(todayISO());
        renderPerformance();
        alert("Backup importado com sucesso.");
      } catch (err) {
        console.error(err);
        alert("Erro ao ler o ficheiro de backup.");
      }
    };
    reader.readAsText(file);
  });
}

// ==== SERVICE WORKER ====

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js");
    });
  }
}

// ==== INIT GERAL ====

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  initProfile();
  initRm();
  initWod();
  initGuide();
  initBackup();
  renderPerformance();
  initServiceWorker();
});
