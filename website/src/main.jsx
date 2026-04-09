import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PaperPage from './PaperPage.jsx'
import { PAGE_META } from './siteConfig.js'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const pageKey = normalizedPath === '/paper' || normalizedPath === '/paper.html' ? 'paper' : 'home'
const meta = PAGE_META[pageKey]

document.title = meta.title

const descriptionTag = document.querySelector('meta[name="description"]')
if (descriptionTag) descriptionTag.setAttribute('content', meta.description)

const ogTitleTag = document.querySelector('meta[property="og:title"]')
if (ogTitleTag) ogTitleTag.setAttribute('content', meta.ogTitle)

const ogDescriptionTag = document.querySelector('meta[property="og:description"]')
if (ogDescriptionTag) ogDescriptionTag.setAttribute('content', meta.ogDescription)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {pageKey === 'paper' ? <PaperPage /> : <App />}
  </StrictMode>,
)
