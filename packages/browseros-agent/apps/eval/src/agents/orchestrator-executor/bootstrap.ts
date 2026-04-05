import type { Browser } from '@browseros/server/browser'

export type BootstrapPageSnapshot = {
  url: string
  title: string
  bodyText: string
  scrollX: number
  scrollY: number
  popupCount: number
  expandedCount: number
  active: {
    tag: string
    id: string
    name: string
    placeholder: string
    value: string
  } | null
}

export async function captureInitialPageSnapshot(
  browser: Browser,
  pageId: number,
): Promise<BootstrapPageSnapshot | null> {
  const result = await browser.evaluate(
    pageId,
    `(() => {
      const isVisible = (el) => {
        if (!el) return false
        const style = window.getComputedStyle(el)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity || '1') === 0
        ) {
          return false
        }
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }
      const active = document.activeElement
      const activeSummary = active
        ? {
            tag: String(active.tagName || '').toLowerCase(),
            id: String(active.getAttribute?.('id') || ''),
            name: String(active.getAttribute?.('name') || ''),
            placeholder: String(active.getAttribute?.('placeholder') || ''),
            value: String(
              ('value' in active ? active.value : active.innerText) || '',
            ).slice(0, 200),
          }
        : null
      return {
        url: String(location.href || ''),
        title: String(document.title || ''),
        bodyText: String(document.body?.innerText || '').slice(0, 800),
        scrollX: Number(window.scrollX || 0),
        scrollY: Number(window.scrollY || 0),
        popupCount: Array.from(
          document.querySelectorAll("dialog, [role='dialog'], [role='listbox'], [role='menu']")
        ).filter(isVisible).length,
        expandedCount: Array.from(
          document.querySelectorAll("[aria-expanded='true'], details[open], dialog[open]")
        ).filter(isVisible).length,
        active: activeSummary,
      }
    })()`,
  )

  if (result.error || !result.value || typeof result.value !== 'object') {
    return null
  }

  return result.value as BootstrapPageSnapshot
}

export function formatInitialObservation(
  snapshot: BootstrapPageSnapshot | null,
): string {
  if (!snapshot) {
    return [
      'Summary: Initial page loaded; no executor actions have been taken yet.',
      'Reason: Initial executor context.',
      'URL: unknown',
      '',
      'Recent actions:',
      'No actions were executed.',
      '',
      'Total model actions: 0',
    ].join('\n')
  }

  const activeSummary = snapshot.active
    ? `${snapshot.active.tag || 'element'} id="${snapshot.active.id}" name="${snapshot.active.name}" placeholder="${snapshot.active.placeholder}" value="${snapshot.active.value}"`
    : 'none'

  return [
    'Summary: Initial page loaded; no executor actions have been taken yet.',
    'Reason: Initial executor context.',
    `URL: ${snapshot.url || 'unknown'}`,
    '',
    'Recent actions:',
    'No actions were executed.',
    '',
    'Total model actions: 0',
    '',
    'Initial page state:',
    `Title: ${snapshot.title || 'unknown'}`,
    `Active element: ${activeSummary}`,
    `Open state: popups=${snapshot.popupCount}, expanded=${snapshot.expandedCount}`,
    `Scroll: x=${snapshot.scrollX}, y=${snapshot.scrollY}`,
    `Body excerpt: ${snapshot.bodyText || '[empty]'}`,
  ].join('\n')
}
