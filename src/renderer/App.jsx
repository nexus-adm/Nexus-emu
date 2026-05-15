import React, { useState, useEffect } from 'react'
import { ipcRenderer, shell } from 'electron'
import logo from '../../public/logo.webp'
import { supabase } from './supabase'
import Login from './Login'
import Emulator from './Emulator'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [usuarioDados, setUsuarioDados] = useState(null)
  const [aba, setAba] = useState('biblioteca')
  const [jogos, setJogos] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [loading, setLoading] = useState(false)
  const [jogoAtivo, setJogoAtivo] = useState(null)
  const [baixando, setBaixando] = useState({})
  const [romsLocais, setRomsLocais] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUsuario(data.session.user)
    })
  }, [])

  useEffect(() => {
    if (usuario) {
      carregarBiblioteca()
      carregarDadosUsuario()
    }
  }, [usuario])

  useEffect(() => {
    if (aba === 'downloads' || aba === 'loja') carregarJogos()
    if (aba === 'biblioteca') carregarBiblioteca()
  }, [aba])

  useEffect(() => {
  const canal = supabase
    .channel('mudancas')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, () => {
      carregarJogos()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, payload => {
      if (payload.new?.id === usuario?.id) {
        setUsuarioDados(payload.new)
      }
    })
    .subscribe()

  return () => supabase.removeChannel(canal)
}, [usuario])

  async function carregarDadosUsuario() {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuario.id)
      .single()
    if (data) setUsuarioDados(data)
  }

  async function carregarJogos() {
    setLoading(true)
    const { data } = await supabase
      .from('jogos')
      .select('*')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
    if (data) {
      setJogos(data)
      verificarRomsLocais(data)
    }
    setLoading(false)
  }

  async function carregarBiblioteca() {
    if (!usuario) return
    const { data } = await supabase
      .from('biblioteca')
      .select('*, jogos(*)')
      .eq('usuario_id', usuario.id)
    if (data) setBiblioteca(data)
  }

  async function verificarRomsLocais(jogosLista) {
    const resultado = {}
    for (const jogo of jogosLista) {
      const nomeArquivo = `${jogo.id}.rom`
      const res = await ipcRenderer.invoke('verificar-rom', { nomeArquivo })
      resultado[jogo.id] = res.existe
    }
    setRomsLocais(resultado)
  }

  async function baixarJogo(jogo) {
    setBaixando(prev => ({ ...prev, [jogo.id]: true }))
    const nomeArquivo = `${jogo.id}.rom`
    const res = await ipcRenderer.invoke('baixar-rom', { url: jogo.rom_url, nomeArquivo })
    if (res.sucesso) {
      await supabase.from('biblioteca').upsert({ usuario_id: usuario.id, jogo_id: jogo.id })
      setRomsLocais(prev => ({ ...prev, [jogo.id]: true }))
      await carregarBiblioteca()
    } else {
      alert('Erro ao baixar o jogo: ' + res.erro)
    }
    setBaixando(prev => ({ ...prev, [jogo.id]: false }))
  }

  async function comprarJogo(jogo) {
  try {
    const response = await fetch('https://nexus-emu-worker.nexus-emu.workers.dev/criar-pagamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jogo,
        usuario_id: usuario.id,
        usuario_email: usuario.email
      })
    })
    const data = await response.json()
    if (data.url) {
      shell.openExternal(data.url)
    } else {
      alert('Erro ao criar pagamento: ' + data.erro)
    }
  } catch (e) {
    alert('Erro ao conectar com a API: ' + e.message)
  }
}

  function jogar(jogo) {
    const nomeArquivo = `${jogo.id}.rom`
    ipcRenderer.invoke('verificar-rom', { nomeArquivo }).then(res => {
      if (res.existe) setJogoAtivo({ ...jogo, romLocal: res.caminho })
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUsuario(null)
  }

  const isPremium = usuarioDados?.premium || usuarioDados?.premium_vitalicio

  function renderBotaoJogo(jogo) {
    if (romsLocais[jogo.id]) {
      return <button style={styles.btnJogar} onClick={() => jogar(jogo)}>▶️ JOGAR</button>
    }
    if (jogo.gratuito || isPremium) {
      return (
        <button
          style={{ ...styles.btnDownload, opacity: baixando[jogo.id] ? 0.6 : 1 }}
          onClick={() => baixarJogo(jogo)}
          disabled={baixando[jogo.id]}
        >
          {baixando[jogo.id] ? '⏳ BAIXANDO...' : '⬇️ BAIXAR'}
        </button>
      )
    }
    return (
      <button style={styles.btnComprar} onClick={() => comprarJogo(jogo)}>
        🛒 COMPRAR — R$ {Number(jogo.preco).toFixed(2)}
      </button>
    )
  }

  if (!usuario) return <Login onLogin={setUsuario} />
  if (jogoAtivo) return <Emulator jogo={jogoAtivo} onFechar={() => setJogoAtivo(null)} />

  const jogosGratuitos = jogos.filter(j => j.gratuito)
  const jogosPagos = jogos.filter(j => !j.gratuito)

  return (
    <div style={styles.container}>

      <div style={styles.titleBar}>
        <div style={styles.logoArea}>
          <img src={logo} style={styles.logoImg} />
          <span style={styles.logoText}>
            <span style={styles.logoNex}>NEX</span>
            <span style={styles.logoUs}>US</span>
            <span style={styles.logoSub}> EMU</span>
          </span>
        </div>
        <div style={styles.titleRight}>
          {isPremium && <span style={styles.premiumBadge}>⭐ PREMIUM</span>}
          <span style={styles.emailUsuario}>{usuario.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>SAIR</button>
          <button style={styles.closeBtn} onClick={() => window.close()}>✕</button>
        </div>
      </div>

      <div style={styles.navbar}>
        {['biblioteca', 'downloads', 'loja'].map((item) => (
          <button
            key={item}
            style={aba === item ? styles.navAtivo : styles.navItem}
            onClick={() => setAba(item)}
          >
            {item === 'biblioteca' && `🎮 BIBLIOTECA (${biblioteca.length})`}
            {item === 'downloads' && '⬇️ DOWNLOADS'}
            {item === 'loja' && '🛒 LOJA'}
          </button>
        ))}
      </div>

      <div style={styles.content}>

        {aba === 'biblioteca' && (
          <div>
            <h2 style={styles.titulo}>MINHA BIBLIOTECA</h2>
            {biblioteca.length === 0 && (
              <div style={styles.emptyBox}>
                <span style={styles.emptyIcon}>🎮</span>
                <p style={styles.emptyText}>Nenhum jogo na biblioteca ainda.</p>
                <p style={styles.emptyHint}>Acesse Downloads para encontrar jogos.</p>
              </div>
            )}
            <div style={styles.grid}>
              {biblioteca.map(({ jogos: jogo }) => (
                <div key={jogo.id} style={styles.card}>
                  {jogo.capa_url
                    ? <img src={jogo.capa_url} style={styles.capa} />
                    : <div style={styles.capaVazia}>🎮</div>
                  }
                  <div style={styles.cardInfo}>
                    <p style={styles.cardNome}>{jogo.nome}</p>
                    <p style={styles.cardConsole}>{jogo.console}</p>
                    <button style={styles.btnJogar} onClick={() => jogar(jogo)}>▶️ JOGAR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'downloads' && (
          <div>
            <h2 style={styles.titulo}>DOWNLOADS DISPONÍVEIS</h2>
            {loading && <p style={styles.emptyHint}>Carregando jogos...</p>}
            {!loading && jogosGratuitos.length === 0 && (
              <div style={styles.emptyBox}>
                <span style={styles.emptyIcon}>⬇️</span>
                <p style={styles.emptyText}>Nenhum jogo gratuito disponível ainda.</p>
              </div>
            )}
            <div style={styles.grid}>
              {jogosGratuitos.map((jogo) => (
                <div key={jogo.id} style={styles.card}>
                  {jogo.capa_url
                    ? <img src={jogo.capa_url} style={styles.capa} />
                    : <div style={styles.capaVazia}>🎮</div>
                  }
                  <div style={styles.cardInfo}>
                    <p style={styles.cardNome}>{jogo.nome}</p>
                    <p style={styles.cardConsole}>{jogo.console}</p>
                    <p style={styles.cardPreco}>GRÁTIS</p>
                    {renderBotaoJogo(jogo)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'loja' && (
          <div>
            <h2 style={styles.titulo}>
              LOJA
              {isPremium && <span style={styles.premiumInfo}> — Você tem acesso premium a todos os jogos!</span>}
            </h2>
            {loading && <p style={styles.emptyHint}>Carregando jogos...</p>}
            {!loading && jogosPagos.length === 0 && (
              <div style={styles.emptyBox}>
                <span style={styles.emptyIcon}>🛒</span>
                <p style={styles.emptyText}>Nenhum jogo na loja ainda.</p>
                <p style={styles.emptyHint}>Em breve jogos exclusivos aparecerão aqui.</p>
              </div>
            )}
            <div style={styles.grid}>
              {jogosPagos.map((jogo) => (
                <div key={jogo.id} style={styles.card}>
                  {jogo.capa_url
                    ? <img src={jogo.capa_url} style={styles.capa} />
                    : <div style={styles.capaVazia}>🎮</div>
                  }
                  <div style={styles.cardInfo}>
                    <p style={styles.cardNome}>{jogo.nome}</p>
                    <p style={styles.cardConsole}>{jogo.console}</p>
                    <p style={styles.cardPreco}>
                      {isPremium ? <span style={{ color: '#4caf50' }}>⭐ PREMIUM</span> : `R$ ${Number(jogo.preco).toFixed(2)}`}
                    </p>
                    {renderBotaoJogo(jogo)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const RED = '#e63027'
const BG = '#0a0a0a'
const CARD = '#111111'
const BORDER = '#1f1f1f'

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    backgroundColor: BG, color: '#fff',
    fontFamily: '"Segoe UI", sans-serif', userSelect: 'none', overflow: 'hidden',
  },
  titleBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 20px', backgroundColor: '#000', WebkitAppRegion: 'drag',
    height: '48px', borderBottom: `1px solid ${BORDER}`,
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoImg: { width: '32px', height: '32px', objectFit: 'contain' },
  logoText: { fontSize: '16px', fontWeight: '900', letterSpacing: '2px' },
  logoNex: { color: '#fff' },
  logoUs: { color: RED },
  logoSub: { color: '#555', fontSize: '11px', fontWeight: '400', letterSpacing: '3px' },
  titleRight: {
    display: 'flex', alignItems: 'center', gap: '12px', WebkitAppRegion: 'no-drag',
  },
  premiumBadge: {
    backgroundColor: '#1a2e1a', border: '1px solid #2a5a2a',
    color: '#4caf50', padding: '3px 8px', borderRadius: '3px',
    fontSize: '11px', fontWeight: '700',
  },
  premiumInfo: {
    color: '#4caf50', fontSize: '13px', fontWeight: '400', letterSpacing: '0px',
  },
  emailUsuario: { color: '#444', fontSize: '11px' },
  logoutBtn: {
    background: 'none', border: '1px solid #333', color: '#555',
    cursor: 'pointer', fontSize: '11px', fontWeight: '700',
    letterSpacing: '1px', padding: '4px 10px', borderRadius: '3px',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#555',
    cursor: 'pointer', fontSize: '16px', padding: '4px 8px', borderRadius: '4px',
  },
  navbar: {
    display: 'flex', backgroundColor: '#000',
    borderBottom: `2px solid ${BORDER}`, padding: '0 20px', gap: '4px',
  },
  navItem: {
    background: 'none', border: 'none', borderBottom: '2px solid transparent',
    color: '#555', padding: '14px 20px', cursor: 'pointer',
    fontSize: '12px', fontWeight: '700', letterSpacing: '1px', marginBottom: '-2px',
  },
  navAtivo: {
    background: 'none', border: 'none', borderBottom: `2px solid ${RED}`,
    color: '#fff', padding: '14px 20px', cursor: 'pointer',
    fontSize: '12px', fontWeight: '700', letterSpacing: '1px', marginBottom: '-2px',
  },
  content: { flex: 1, padding: '40px', overflowY: 'auto' },
  titulo: {
    fontSize: '20px', fontWeight: '900', letterSpacing: '2px',
    color: '#fff', marginBottom: '32px',
    borderLeft: `3px solid ${RED}`, paddingLeft: '12px',
  },
  emptyBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px', backgroundColor: CARD,
    border: `1px solid ${BORDER}`, borderRadius: '4px', gap: '12px',
  },
  emptyIcon: { fontSize: '48px', opacity: 0.3 },
  emptyText: { color: '#444', fontSize: '14px', fontWeight: '700', letterSpacing: '1px', margin: 0 },
  emptyHint: { color: '#333', fontSize: '12px', margin: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: CARD, border: `1px solid ${BORDER}`,
    borderRadius: '6px', overflow: 'hidden',
  },
  capa: { width: '100%', height: '140px', objectFit: 'cover' },
  capaVazia: {
    width: '100%', height: '140px', backgroundColor: '#1a1a1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '40px', opacity: 0.3,
  },
  cardInfo: { padding: '12px' },
  cardNome: { color: '#fff', fontWeight: '700', fontSize: '13px', margin: '0 0 4px 0' },
  cardConsole: { color: '#555', fontSize: '11px', margin: '0 0 8px 0', letterSpacing: '1px' },
  cardPreco: { color: RED, fontWeight: '900', fontSize: '13px', margin: '0 0 10px 0' },
  btnDownload: {
    width: '100%', backgroundColor: '#1a1a2e', border: `1px solid ${RED}`,
    color: RED, padding: '8px', cursor: 'pointer', fontWeight: '700',
    fontSize: '11px', letterSpacing: '1px', borderRadius: '3px',
  },
  btnJogar: {
    width: '100%', backgroundColor: RED, border: 'none', color: '#fff',
    padding: '8px', cursor: 'pointer', fontWeight: '700',
    fontSize: '11px', letterSpacing: '1px', borderRadius: '3px',
  },
  btnComprar: {
    width: '100%', backgroundColor: '#1a2e1a', border: '1px solid #2a5a2a',
    color: '#4caf50', padding: '8px', cursor: 'pointer', fontWeight: '700',
    fontSize: '11px', letterSpacing: '1px', borderRadius: '3px',
  },
}