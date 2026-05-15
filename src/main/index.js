const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')

const romsDir = path.join(app.getPath('userData'), 'roms')
if (!fs.existsSync(romsDir)) fs.mkdirSync(romsDir, { recursive: true })

function downloadArquivo(url, destino) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destino)
    const protocolo = url.startsWith('https') ? https : http
    protocolo.get(url, res => {
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', err => {
      fs.unlink(destino, () => {})
      reject(err)
    })
  })
}

ipcMain.handle('baixar-rom', async (event, { url, nomeArquivo }) => {
  try {
    const destino = path.join(romsDir, nomeArquivo)
    if (fs.existsSync(destino)) return { sucesso: true, caminho: destino }
    await downloadArquivo(url, destino)
    return { sucesso: true, caminho: destino }
  } catch (e) {
    return { sucesso: false, erro: e.message }
  }
})

ipcMain.handle('verificar-rom', async (event, { nomeArquivo }) => {
  const destino = path.join(romsDir, nomeArquivo)
  return { existe: fs.existsSync(destino), caminho: destino }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    titleBarStyle: 'hidden',
    frame: false,
    backgroundColor: '#0f0f0f',
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})