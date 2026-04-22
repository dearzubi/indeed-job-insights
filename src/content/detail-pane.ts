import type { Config } from "../shared/config.ts";
import { fetchJobDescription } from "./description-fetch.ts";
import { unwrapHighlights, wrapTerms } from "./highlight.ts";
import { extractJobKey, SELECTORS } from "./selectors.ts";

const DETAIL_PANE_SELECTOR = "#jobDescriptionText";
const HIGHLIGHTED_ATTR = "data-ext-highlighted";
const INSIGHTS_CLASS = "ext-detail-insights";

function getActiveJobKey(): string | null {
  // /jobs search results reflect the active job in `?vjk=`.
  try {
    const vjk = new URL(location.href).searchParams.get("vjk");
    if (vjk) return vjk;
  } catch {
    // fall through to DOM
  }
  // Homepage 2-pane layout: no URL param; the active card wears `.vjs-highlight`.
  const active = document.querySelector<HTMLElement>(SELECTORS.activeCardOutline);
  return active ? extractJobKey(active) : null;
}

function renderSkillsBlock(skills: readonly string[]): HTMLElement | null {
  if (skills.length === 0) return null;
  const section = document.createElement("section");
  section.className = "ext-detail-section ext-detail-skills";
  const h = document.createElement("h3");
  h.className = "ext-detail-heading";
  h.textContent = "Must-have skills";
  section.appendChild(h);
  const row = document.createElement("div");
  row.className = "ext-detail-skills-row";
  for (const skill of skills) {
    const pill = document.createElement("span");
    pill.className = "ext-detail-skill-pill";
    pill.textContent = skill;
    row.appendChild(pill);
  }
  section.appendChild(row);
  return section;
}

function renderEmployerBlock(er: {
  headline: string;
  description: string;
  averageResponseInDays: number | null;
  responseRate: number | null;
}): HTMLElement {
  const section = document.createElement("section");
  section.className = "ext-detail-section ext-detail-employer";
  const h = document.createElement("h3");
  h.className = "ext-detail-heading";
  h.textContent = "Employer insights";
  section.appendChild(h);
  if (er.headline) {
    const hl = document.createElement("div");
    hl.className = "ext-detail-employer-headline";
    hl.textContent = er.headline;
    section.appendChild(hl);
  }
  if (er.description) {
    const d = document.createElement("p");
    d.className = "ext-detail-employer-desc";
    d.textContent = er.description;
    section.appendChild(d);
  }
  const statParts: string[] = [];
  if (er.responseRate !== null)
    statParts.push(`${Math.round(er.responseRate * 100)}% response rate`);
  if (er.averageResponseInDays !== null) {
    const d = er.averageResponseInDays;
    statParts.push(`~${d} ${d === 1 ? "day" : "days"} to respond`);
  }
  if (statParts.length > 0) {
    const s = document.createElement("div");
    s.className = "ext-detail-employer-stats";
    s.textContent = statParts.join(" · ");
    section.appendChild(s);
  }
  return section;
}

function removeInsights(host: HTMLElement): void {
  const parent = host.parentElement;
  if (!parent) return;
  for (const el of Array.from(parent.querySelectorAll<HTMLElement>(`.${INSIGHTS_CLASS}`))) {
    el.remove();
  }
}

async function renderInsights(host: HTMLElement, jobKey: string): Promise<void> {
  const desc = await fetchJobDescription(jobKey);
  // Another render may have raced past us - bail if the pane has since moved on.
  if (getActiveJobKey() !== jobKey) return;
  const parent = host.parentElement;
  if (!parent) return;

  removeInsights(host);
  if (!desc.ok) return;
  const skillsEl = renderSkillsBlock(desc.mustHaveSkills);
  const employerEl = desc.employerResponsive ? renderEmployerBlock(desc.employerResponsive) : null;
  if (!skillsEl && !employerEl) return;

  const container = document.createElement("div");
  container.className = INSIGHTS_CLASS;
  container.setAttribute("data-ext-jobkey", jobKey);
  if (skillsEl) container.appendChild(skillsEl);
  if (employerEl) container.appendChild(employerEl);
  parent.insertBefore(container, host);
}

/**
 * Starts highlighting configured keywords inside Indeed's right-hand detail
 * pane (#jobDescriptionText). Re-highlights when the user clicks a different
 * card and the pane's content changes.
 * Returns a teardown function.
 */
export function startDetailPaneHighlighter(config: Config): () => void {
  const positiveTerms = [...new Set(config.keywords.map((k) => k.toLowerCase()))];
  const excludedTerms = [...new Set(config.excludedKeywords.map((k) => k.toLowerCase()))];
  const wantsHighlights = positiveTerms.length > 0 || excludedTerms.length > 0;

  let current: HTMLElement | null = null;
  let lastInsightsKey: string | null = null;

  const applyTo = (host: HTMLElement): void => {
    if (host.getAttribute(HIGHLIGHTED_ATTR) === "1") unwrapHighlights(host);
    if (positiveTerms.length > 0) wrapTerms(host, positiveTerms, "ext-kw-hit");
    if (excludedTerms.length > 0) wrapTerms(host, excludedTerms, "ext-kw-excluded");
    host.setAttribute(HIGHLIGHTED_ATTR, "1");
  };

  const applyInsights = (host: HTMLElement): void => {
    const jobKey = getActiveJobKey();
    if (!jobKey) {
      removeInsights(host);
      lastInsightsKey = null;
      return;
    }
    if (jobKey === lastInsightsKey && host.parentElement?.querySelector(`.${INSIGHTS_CLASS}`)) {
      return;
    }
    lastInsightsKey = jobKey;
    void renderInsights(host, jobKey);
  };

  const pickAndApply = (): void => {
    const host = document.querySelector<HTMLElement>(DETAIL_PANE_SELECTOR);
    if (!host) {
      current = null;
      lastInsightsKey = null;
      return;
    }
    if (host !== current) {
      current = host;
      if (wantsHighlights) applyTo(host);
      applyInsights(host);
      return;
    }
    if (wantsHighlights && host.getAttribute(HIGHLIGHTED_ATTR) !== "1") applyTo(host);
    applyInsights(host);
  };

  pickAndApply();

  const mo = new MutationObserver(() => pickAndApply());
  mo.observe(document.body, { childList: true, subtree: true });

  return () => mo.disconnect();
}
