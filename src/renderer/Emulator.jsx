import React, { useEffect, useRef } from 'react'

export default function Emulator({ jogo, onFechar }) {
  const iframeRef = useRef(null)

  const coreMap = {
    'NES': 'nes',
    'SNES': 'snes9x',
    'Nintendo 64': 'n64',
    'Game Boy': 'gb',
    'Game Boy Advance': 'gba',
    'Nintendo DS': 'nds',
    'GameCube': 'dolphin',
    'Wii': 'dolphin',
    'Indie': 'nes',
  }

  const core = coreMap[jogo.console] || 'nes'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; width: 100vw; height: 100vh; overflow: hidden; }
          #emulador { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="emulador"></div>
        <script>
          var EJS_player = '#emulador';
          var EJS_gameName = '${jogo.nome}';
          var EJS_biosUrl = '';
          var EJS_gameUrl = '${jogo.rom_url}';
          var EJS_core = '${core}';
          var EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
          var EJS_startOnLoaded = true;
        </script>
        <script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
      </body>
    </html>
  `

  function fechar() {
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank'
    }
    onFechar()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.header}>
        <span style={styles.titulo}>🎮 {jogo.nome} — {jogo.console}</span>
        <button style={styles.fechar} onClick={fechar}>✕ FECHAR</button>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={styles.iframe}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#111',
    borderBottom: '1px solid #1f1f1f',
  },
  titulo: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1px',
  },
  fechar: {
    background: 'none',
    border: '1px solid #333',
    color: '#e63027',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '1px',
    padding: '6px 14px',
    borderRadius: '3px',
  },
  iframe: {
    flex: 1,
    width: '100%',
    border: 'none',
    backgroundColor: '#000',
  },
}