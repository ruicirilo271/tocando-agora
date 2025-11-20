let scanning = false;
let currentRadios = [];   // lista de rádios que já encontrámos
let refreshTimer = null;  // timer de 10s

function startScan() {
  const container = document.getElementById("radiosContainer");
  const status = document.getElementById("status");

  container.innerHTML = "";
  status.textContent = "A iniciar procura...";

  currentRadios = [];

  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  fetch("/api/start_scan").then(() => {
    scanning = true;
    pollLoop();
  });
}

function pollLoop() {
  if (!scanning) return;

  fetch("/api/poll")
    .then(r => r.json())
    .then(data => {
      // adicionar novas rádios encontradas
      data.new.forEach(r => {
        currentRadios.push(r);
        addRadioCard(r);
      });

      if (data.done) {
        scanning = false;
        document.getElementById("status").textContent =
          `Procura concluída! (${data.progress}/${data.total})`;

        // quando terminar o scan, arrancamos o refresh a cada 10s
        if (!refreshTimer && currentRadios.length > 0) {
          refreshTimer = setInterval(refreshNowPlaying, 10000);
        }
        return;
      }

      document.getElementById("status").textContent =
        `A procurar... (${data.progress}/${data.total})`;

      setTimeout(pollLoop, 350);
    });
}

function addRadioCard(r) {
  const container = document.getElementById("radiosContainer");

  const card = document.createElement("div");
  card.className = "radio-card";
  card.dataset.stream = r.stream;  // para podermos encontrar o card depois

  const infoDiv = document.createElement("div");
  infoDiv.className = "info";

  const h2 = document.createElement("h2");
  h2.textContent = r.name;

  const countryP = document.createElement("p");
  countryP.textContent = r.country || "—";

  const trackP = document.createElement("p");
  trackP.className = "track-line";
  trackP.innerHTML = `<strong>${r.artist}</strong> — ${r.song}`;

  infoDiv.appendChild(h2);
  infoDiv.appendChild(countryP);
  infoDiv.appendChild(trackP);

  const btn = document.createElement("button");
  btn.className = "play-btn";
  btn.textContent = "▶ Ouvir";
  btn.onclick = () => playRadio(r.stream, r.name, r.artist, r.song);

  card.appendChild(infoDiv);
  card.appendChild(btn);
  container.appendChild(card);
}

function playRadio(url, name, artist, song) {
  const player = document.getElementById("player");
  const nowPlaying = document.getElementById("nowPlaying");
  nowPlaying.textContent = `A tocar: ${name} — ${artist} — ${song}`;
  player.src = url;
  player.play();
}

function refreshNowPlaying() {
  if (!currentRadios.length) return;

  fetch("/api/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ radios: currentRadios })
  })
    .then(r => r.json())
    .then(data => {
      if (!data.ok) return;

      currentRadios = data.radios;

      // atualizar os cards no ecrã
      currentRadios.forEach(r => {
        const card = document.querySelector(
          `.radio-card[data-stream="${CSS.escape(r.stream)}"]`
        );
        if (!card) return;
        const trackEl = card.querySelector(".track-line");
        if (trackEl) {
          trackEl.innerHTML = `<strong>${r.artist}</strong> — ${r.song}`;
        }
      });

      // se alguma estiver a tocar, atualizamos o texto do rodapé
      const nowPlaying = document.getElementById("nowPlaying");
      const currentText = nowPlaying.textContent || "";
      currentRadios.forEach(r => {
        // muito simples: se o nome da rádio estiver no texto, atualizamos artista + música
        if (currentText.includes(r.name)) {
          nowPlaying.textContent = `A tocar: ${r.name} — ${r.artist} — ${r.song}`;
        }
      });
    })
    .catch(err => {
      console.error("Erro no refresh:", err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reloadBtn").onclick = startScan;
  startScan();
});
