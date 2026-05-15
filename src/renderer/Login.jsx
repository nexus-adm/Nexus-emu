import React, { useState } from 'react'
import logo from '../../public/logo.webp'
import { supabase } from './supabase'

export default function Login({ onLogin }) {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setErro('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('Email ou senha incorretos.')
    else onLogin(data.user)
    setLoading(false)
  }

  async function handleCadastro() {
    setErro('')
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) setErro('Erro ao criar conta. Tente outro email.')
    else {
      setErro('')
      setModo('login')
      alert('Conta criada! Verifique seu email para confirmar.')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <img src={logo} style={styles.logo} />
        <h1 style={styles.titulo}>
          <span style={styles.nex}>NEX</span>
          <span style={styles.us}>US</span>
          <span style={styles.emu}> EMU</span>
        </h1>
        <p style={styles.sub}>Plataforma de jogos independentes</p>
        <div style={styles.tabs}>
          <button style={modo === 'login' ? styles.tabAtivo : styles.tab} onClick={() => setModo('login')}>ENTRAR</button>
          <button style={modo === 'cadastro' ? styles.tabAtivo : styles.tab} onClick={() => setModo('cadastro')}>CRIAR CONTA</button>
        </div>
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && (modo === 'login' ? handleLogin() : handleCadastro())} />
        {erro && <p style={styles.erro}>{erro}</p>}
        <button style={styles.btn} onClick={modo === 'login' ? handleLogin : handleCadastro} disabled={loading}>
          {loading ? 'AGUARDE...' : modo === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
        </button>
      </div>
    </div>
  )
}

const RED = '#e63027'
const styles = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0a0a', fontFamily: '"Segoe UI", sans-serif' },
  box: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '360px', padding: '48px 40px', backgroundColor: '#111', border: '1px solid #1f1f1f', borderRadius: '8px' },
  logo: { width: '64px', height: '64px', objectFit: 'contain', marginBottom: '16px' },
  titulo: { margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', letterSpacing: '3px', color: '#fff' },
  nex: { color: '#fff' },
  us: { color: RED },
  emu: { color: '#444', fontSize: '14px', fontWeight: '400', letterSpacing: '4px' },
  sub: { color: '#333', fontSize: '12px', margin: '0 0 32px 0', letterSpacing: '1px' },
  tabs: { display: 'flex', width: '100%', marginBottom: '24px', borderBottom: '1px solid #1f1f1f' },
  tab: { flex: 1, background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#444', padding: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', marginBottom: '-1px' },
  tabAtivo: { flex: 1, background: 'none', border: 'none', borderBottom: `2px solid ${RED}`, color: '#fff', padding: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', marginBottom: '-1px' },
  input: { width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '4px', color: '#fff', padding: '12px 14px', fontSize: '13px', marginBottom: '12px', outline: 'none', boxSizing: 'border-box' },
  erro: { color: RED, fontSize: '12px', margin: '0 0 12px 0', textAlign: 'center' },
  btn: { width: '100%', backgroundColor: RED, border: 'none', color: '#fff', padding: '13px', cursor: 'pointer', fontWeight: '900', fontSize: '13px', letterSpacing: '2px', borderRadius: '4px', marginTop: '4px' },
}