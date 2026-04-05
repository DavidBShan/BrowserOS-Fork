export interface PageControlSnapshot {
  tag: string
  type: string
  name: string
  id: string
  placeholder: string
  checked: boolean
  disabled: boolean
  value: string
}

export interface PageActiveSnapshot {
  tag: string
  id: string
  name: string
  placeholder: string
  value: string
}

export interface PageProgressSnapshot {
  url: string
  title: string
  bodyText: string
  scrollX: number
  scrollY: number
  popupCount: number
  expandedCount: number
  controls: PageControlSnapshot[]
  active: PageActiveSnapshot | null
}

export const PAGE_PROGRESS_EVAL_FUNCTION = `() => {
  const isVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity || "1") === 0
    ) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const bodyText = String(document.body?.innerText || "").slice(0, __MAX_CHARS__);
  const controls = Array.from(
    document.querySelectorAll("input, textarea, select, [contenteditable='true']")
  )
    .slice(0, 40)
    .map((el) => {
      const tag = (el.tagName || "").toLowerCase();
      const type = String(el.getAttribute("type") || "").toLowerCase();
      let value = "";
      if (tag === "select") {
        value = String(el.value || "");
      } else if ("value" in el) {
        value = String(el.value || "");
      } else {
        value = String(el.innerText || "");
      }
      return {
        tag,
        type,
        name: String(el.getAttribute("name") || ""),
        id: String(el.getAttribute("id") || ""),
        placeholder: String(el.getAttribute("placeholder") || ""),
        checked: !!el.checked,
        disabled: !!el.disabled,
        value: value.slice(0, 200),
      };
    });
  const active = document.activeElement;
  const activeSummary = active
    ? {
      tag: String(active.tagName || "").toLowerCase(),
      id: String(active.getAttribute?.("id") || ""),
      name: String(active.getAttribute?.("name") || ""),
      placeholder: String(active.getAttribute?.("placeholder") || ""),
      value: String(("value" in active ? active.value : active.innerText) || "").slice(0, 200),
    }
    : null;
  const popupCount = Array.from(
    document.querySelectorAll("dialog, [role='dialog'], [role='listbox'], [role='menu']")
  ).filter(isVisible).length;
  const expandedCount = Array.from(
    document.querySelectorAll("[aria-expanded='true'], details[open], dialog[open]")
  ).filter(isVisible).length;
  return JSON.stringify({
    url: String(location.href || ""),
    title: String(document.title || ""),
    bodyText,
    scrollX: Number(window.scrollX || 0),
    scrollY: Number(window.scrollY || 0),
    popupCount,
    expandedCount,
    controls,
    active: activeSummary,
  });
}`

function normalizeControl(raw: Record<string, unknown>): PageControlSnapshot {
  return {
    tag: String(raw.tag ?? ''),
    type: String(raw.type ?? ''),
    name: String(raw.name ?? ''),
    id: String(raw.id ?? ''),
    placeholder: String(raw.placeholder ?? ''),
    checked: Boolean(raw.checked),
    disabled: Boolean(raw.disabled),
    value: String(raw.value ?? ''),
  }
}

function normalizeActive(
  raw: Record<string, unknown> | null | undefined,
): PageActiveSnapshot | null {
  if (!raw) return null
  return {
    tag: String(raw.tag ?? ''),
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    placeholder: String(raw.placeholder ?? ''),
    value: String(raw.value ?? ''),
  }
}

export function normalizePageProgressSnapshot(
  raw: Record<string, unknown>,
): PageProgressSnapshot {
  const controls = Array.isArray(raw.controls)
    ? raw.controls
        .filter(
          (value): value is Record<string, unknown> =>
            value !== null && typeof value === 'object',
        )
        .map((value) => normalizeControl(value))
    : []

  const snapshotWithoutSignature = {
    url: String(raw.url ?? ''),
    title: String(raw.title ?? ''),
    bodyText: String(raw.bodyText ?? ''),
    scrollX: Number(raw.scrollX ?? 0),
    scrollY: Number(raw.scrollY ?? 0),
    popupCount: Number(raw.popupCount ?? 0),
    expandedCount: Number(raw.expandedCount ?? 0),
    controls,
    active:
      raw.active && typeof raw.active === 'object'
        ? normalizeActive(raw.active as Record<string, unknown>)
        : null,
  }

  return snapshotWithoutSignature
}

export function pageProgressSignals(
  before: PageProgressSnapshot | null,
  after: PageProgressSnapshot | null,
): string[] {
  if (!before || !after) return []

  const signals: string[] = []
  if (before.url !== after.url || before.title !== after.title) {
    signals.push('navigation')
  }
  if (
    Math.abs(after.scrollX - before.scrollX) >= 8 ||
    Math.abs(after.scrollY - before.scrollY) >= 8
  ) {
    signals.push('scroll')
  }
  if (JSON.stringify(before.active) !== JSON.stringify(after.active)) {
    signals.push('focus')
  }
  if (
    before.expandedCount !== after.expandedCount ||
    before.popupCount !== after.popupCount
  ) {
    signals.push('open_state')
  }
  if (JSON.stringify(before.controls) !== JSON.stringify(after.controls)) {
    signals.push('value')
  }
  return signals
}
