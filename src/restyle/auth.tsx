import { useEffect, useRef, useState } from 'react'
import { RESTYLE_MODEL, verifyQuestOnlyConnection } from './client'

const MESSAGE = 'rain-restyle-oauth-return'
const AUTHORISE = 'https://enter.pollinations.ai/authorize'
const TOKEN = 'https://enter.pollinations.ai/api/oauth/token'

function randomString() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, '0')).join('')
}

export function useProviderConnection() {
  const [token, setToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [error, setError] = useState('')
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [])
  useEffect(() => {
    const controller = new AbortController()
    void fetch(`${import.meta.env.BASE_URL}restyle.config.json`, { cache: 'no-store', signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((config) => {
        if (controller.signal.aborted) return
        const ready = typeof config.appKey === 'string' && /^pk_[A-Za-z0-9_-]+$/.test(config.appKey)
        setConfigured(ready)
        if (!ready) setError('Sample-review prototype: the site owner has not configured a publishable Pollinations App Key yet. Live generation is disabled; the four style examples work now.')
      }).catch(() => { if (!controller.signal.aborted) setError('Provider configuration could not load. Samples still work; live generation is disabled.') })
    return () => controller.abort()
  }, [])

  const disconnect = () => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setConnecting(false)
    setToken('')
    setError('')
  }

  const connect = () => {
    if (connecting || !configured) return
    setError('')
    setConnecting(true)
    // Open synchronously so browsers can associate the popup with the click.
    const popup = window.open('about:blank', 'rain-restyle-provider', 'popup,width=540,height=760')
    if (!popup) { setError('Allow a popup for provider authorisation, then try Connect again.'); setConnecting(false); return }
    const controller = new AbortController()
    const state = randomString()
    const verifier = randomString()
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`rain-restyle-${state}`) : null
    let interval: number | undefined
    let timer: number | undefined
    let exchanging = false
    const redirect = new URL(import.meta.env.BASE_URL, location.href)
    redirect.search = ''; redirect.hash = ''
    let appKey = ''
    const cleanup = () => {
      controller.abort()
      window.removeEventListener('message', receive)
      channel?.close()
      window.clearInterval(interval)
      window.clearTimeout(timer)
      if (!popup.closed) popup.close()
    }
    cleanupRef.current = cleanup
    const handleReturn = async (data: unknown) => {
      if (exchanging || !data || typeof data !== 'object') return
      const reply = data as { type?: string; state?: string; error?: string; code?: string }
      if (reply.type !== MESSAGE) return
      if (reply.state !== state) { setError('Provider callback did not match this connection. Please retry.'); cleanup(); setConnecting(false); return }
      if (reply.error || typeof reply.code !== 'string') { setError('Provider authorisation was cancelled or denied.'); cleanup(); setConnecting(false); return }
      exchanging = true
      window.clearInterval(interval)
      try {
        const response = await fetch(TOKEN, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'omit', cache: 'no-store', signal: controller.signal,
          body: new URLSearchParams({ grant_type: 'authorization_code', code: reply.code, client_id: appKey, redirect_uri: redirect.href, code_verifier: verifier }),
        })
        const result = await response.json()
        if (!response.ok || typeof result.access_token !== 'string' || !/^sk_[A-Za-z0-9_-]+$/.test(result.access_token)) throw new Error('Provider connection could not be completed. Retry with the registered app callback.')
        // The provider requires the user to select its own consent checkbox.
        // Do not invent an ignored authorize parameter or widen account scopes.
        await verifyQuestOnlyConnection(result.access_token, controller.signal)
        if (controller.signal.aborted) return
        setToken(result.access_token)
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Provider connection failed.')
      } finally { cleanup(); setConnecting(false); cleanupRef.current = null }
    }
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== popup) return
      void handleReturn(event.data)
    }
    // The unpredictable state-named channel is same-origin and carries only a
    // short-lived PKCE-bound code, never a provider access token.
    if (channel) channel.onmessage = (event) => { void handleReturn(event.data) }
    window.addEventListener('message', receive)
    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}restyle.config.json`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('The restyle connection configuration is missing.')
        const config = await response.json()
        if (typeof config.appKey !== 'string' || !/^pk_[A-Za-z0-9_-]+$/.test(config.appKey)) throw new Error('This standalone prototype is in sample-review mode. To enable new restyles, the site owner must register a public Pollinations App Key and place it in restyle.config.json. No secret key is needed in the app.')
        appKey = config.appKey
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
        const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
        const parameters = new URLSearchParams({ response_type: 'code', client_id: appKey, redirect_uri: redirect.href, state, code_challenge: challenge, code_challenge_method: 'S256', models: RESTYLE_MODEL, budget: String(Math.max(.005, Math.min(10, Number(config.budget) || .03))), expiry: '1' })
        if (controller.signal.aborted) return
        popup.location.href = `${AUTHORISE}?${parameters}`
        interval = window.setInterval(() => {
          if (popup.closed && !exchanging) { cleanup(); setConnecting(false); cleanupRef.current = null; setError('The provider window was closed before connection completed.') }
        }, 750)
        timer = window.setTimeout(() => { cleanup(); setConnecting(false); cleanupRef.current = null; setError('Provider authorisation timed out. Connect again when ready.') }, 600_000)
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Provider setup could not load.')
        cleanup(); setConnecting(false); cleanupRef.current = null
      }
    })()
  }
  return { token, connecting, configured, error, connect, disconnect }
}

export function RestyleOAuthReturn() {
  const [message, setMessage] = useState('Completing provider connection…')
  const handled = useRef(false)
  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const query = new URLSearchParams(location.search)
    const code = query.get('code')
    const state = query.get('state')
    const error = query.get('error')
    history.replaceState(null, '', `${location.pathname}#/restyle`)
    if (!state || (!code && !error)) { setMessage('Return to the original restyle tab and connect again. This callback has no matching request.'); return }
    const data = { type: MESSAGE, code, state, error }
    if (window.opener) window.opener.postMessage(data, location.origin)
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`rain-restyle-${state}`) : null
    if (channel) channel.postMessage(data)
    if (!window.opener && !channel) { setMessage('This browser cannot return the connection response. Open the standalone site in a recent browser.'); return }
    setMessage('Connection response returned to the original tab. You can close this window.')
    window.setTimeout(() => { channel?.close(); window.close() }, 150)
  }, [])
  return <main style={{ background: '#fffdf8', color: '#182a38', padding: 32, minHeight: '100vh' }}><h1>Rain & Me · Restyle</h1><p>{message}</p></main>
}
