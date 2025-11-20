# -*- coding: utf-8 -*-
from flask import Flask, render_template, jsonify, request
import requests, time

app = Flask(__name__)

# Servidor RadioBrowser que funciona no teu PC
RB_BASE = "https://de1.api.radio-browser.info"
USER_AGENT = "RuiTop100Neon/1.0"

SCAN_RESULTS = []
SCAN_STATUS = "idle"
SCAN_INDEX = 0
RADIO_LIST = []


def get_now_playing(stream_url: str):
    """Pede música + artista usando a API Vercel."""
    try:
        url = f"https://radio-metadata-api-main.vercel.app/radio_info/?radio_url={stream_url}"
        r = requests.get(url, timeout=8)
        data = r.json()

        artist = data.get("artist")
        song = data.get("song")

        if artist and song:
            return artist.strip(), song.strip()

    except Exception as e:
        print("API ERROR:", e)

    return None, None


def load_radios():
    """Carrega top rádios do servidor DE1."""
    global RADIO_LIST
    print("🔄 A ligar ao DE1 RadioBrowser...")
    url = f"{RB_BASE}/json/stations/topclick"
    r = requests.get(url, params={"limit": 150, "hidebroken": "true"}, timeout=10)
    RADIO_LIST = r.json()
    print("👍 Rádios carregadas:", len(RADIO_LIST))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/start_scan")
def start_scan():
    """Inicia a procura progressiva das rádios."""
    global SCAN_RESULTS, SCAN_INDEX, SCAN_STATUS

    load_radios()

    SCAN_RESULTS = []
    SCAN_INDEX = 0
    SCAN_STATUS = "running"

    return jsonify({"ok": True})


@app.route("/api/poll")
def poll():
    """Processa 1 rádio por chamada e devolve novas rádios encontradas."""
    global SCAN_RESULTS, SCAN_INDEX, SCAN_STATUS

    if SCAN_STATUS == "done":
        return jsonify({"done": True, "new": []})

    new_items = []

    if SCAN_INDEX < len(RADIO_LIST):
        st = RADIO_LIST[SCAN_INDEX]
        SCAN_INDEX += 1

        stream = st.get("url_resolved") or st.get("url")
        name = st.get("name")

        print(f"🔎 Testando: {name} -> {stream}")

        if stream:
            artist, song = get_now_playing(stream)
            if artist and song:
                item = {
                    "name": name,
                    "country": st.get("country"),
                    "stream": stream,
                    "artist": artist,
                    "song": song
                }
                SCAN_RESULTS.append(item)
                new_items.append(item)

        time.sleep(0.3)

    else:
        SCAN_STATUS = "done"

    return jsonify({
        "done": SCAN_STATUS == "done",
        "new": new_items,
        "progress": SCAN_INDEX,
        "total": len(RADIO_LIST),
    })


@app.route("/api/refresh", methods=["POST"])
def refresh_nowplaying():
    """
    Recebe a lista de rádios atuais e devolve artista+música atualizados
    para cada stream, sem recarregar a página.
    """
    data = request.get_json(silent=True) or {}
    radios = data.get("radios", [])
    updated = []

    for r in radios:
        stream = r.get("stream")
        if not stream:
            continue

        artist, song = get_now_playing(stream)

        # Se a API não devolver nada agora, mantemos o valor antigo
        if not artist or not song:
            artist = r.get("artist")
            song = r.get("song")

        updated.append({
            "name": r.get("name"),
            "country": r.get("country"),
            "stream": stream,
            "artist": artist,
            "song": song
        })

    return jsonify({"ok": True, "radios": updated})


if __name__ == "__main__":
    app.run(debug=False)



