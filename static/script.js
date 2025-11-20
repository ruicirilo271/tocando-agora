let scanning = false;

function startScan() {
  const container = document.getElementById("radiosContainer");
  const status = document.getElementById("status");

  container.innerHTML = "";
  status.textContent = "A iniciar procura...";

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
      data.new.forEach(r => addRadioCard(r));

      if (data.done) {
        scanning = false;
        document.getElementById("status").textContent = "Procura concluída!";
        return;
      }

      document.getElementById("status").textContent =
        `A procurar... (${data.progress}/${data.total})`;

      setTimeout(pollLoop, 400);
    });
}

function addRadioCard(r) {
  const container = document.getElementById("radiosContainer");

  const card = document.createElement("div");
  card.className = "radio-card";

  card.innerHTML = `
    <div class="info">
      <h2>${r.name}</h2>
      <p>${r.country || "—"}</p>
      <p><strong>${r.artist}</strong> — ${r.song}</p>
    </div>
  `;

  const btn = document.createElement("button");
  btn.className = "play-btn";
  btn.textContent = "▶ Ouvir";
  btn.onclick = () => playRadio(r.stream, r.name, r.artist, r.song);

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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reloadBtn").onclick = startScan;
  startScan();
});
