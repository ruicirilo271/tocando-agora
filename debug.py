# -*- coding: utf-8 -*-
import requests
from flask import Flask, jsonify

app = Flask(__name__)

RB_BASE = "https://api.radio-browser.info"
USER_AGENT = "RuiDebug/1.0"

@app.route("/debug_streams")
def debug_streams():
    url = f"{RB_BASE}/json/stations/topclick"
    headers = {"User-Agent": USER_AGENT}

    r = requests.get(url, params={"limit": 50}, headers=headers, timeout=10)
    data = r.json()

    streams = []

    for st in data:
        streams.append({
            "name": st.get("name"),
            "stream": st.get("url_resolved") or st.get("url")
        })

    return jsonify(streams)


@app.route("/")
def home():
    return "OK — debug ativo. Vai a /debug_streams"


if __name__ == "__main__":
    app.run(debug=True)
