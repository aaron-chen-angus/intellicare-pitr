import { lazy, StrictMode, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import { APP_RELEASE } from './version'
import { RestyleOAuthReturn } from './restyle/auth'
import './scrapbook.css'
import './scrapbook-report.css'
import './arcade.css'

const StyleLab = lazy(() => import('./restyle/StyleLab'))
const RESTYLE_RELEASE = APP_RELEASE

function currentPage() {
  const query = new URLSearchParams(location.search)
  if (query.has('state') && (query.has('code') || query.has('error'))) return 'oauth'
  return location.hash === '#/restyle' ? 'restyle' : 'app'
}

function Root() {
  const [page, setPage] = useState(currentPage)
  useEffect(() => {
    const update = () => setPage(currentPage())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  if (page === 'oauth') return <RestyleOAuthReturn />
  return <>
    <div className="release-strip">
      {page === 'restyle' ? 'Artistic restyle studio' : 'PITR reflection studio'}
      <span>Release {page === 'restyle' ? RESTYLE_RELEASE : APP_RELEASE}</span>
      {page !== 'restyle' && <a href="#/restyle" style={{ color: 'inherit', textDecoration: 'underline', marginLeft: 12 }}>Try Restyle lab</a>}
    </div>
    {page === 'restyle' ? <Suspense fallback={<p style={{ color: '#172b3a', padding: 32 }}>Opening the style studio…</p>}><StyleLab /></Suspense> : <App />}
  </>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><ErrorBoundary><Root /></ErrorBoundary></StrictMode>,
)
