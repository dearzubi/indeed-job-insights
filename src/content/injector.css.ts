export const INJECTOR_CSS = `
.ext-footer { display: flex; padding: 10px 16px 12px; border-top: 1px solid #e2e8f0; margin-top: 6px; position: relative; z-index: 2; }
/* Indeed's .slider_container sets overflow:hidden + a fixed height so cards
   align uniformly; when we add a footer we need the box to grow and not clip. */
.slider_container:has(> .ext-footer) { height: auto !important; overflow: visible !important; }
.ext-pills { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 0; position: relative; z-index: 2; }
.ext-pill { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; letter-spacing: 0.2px; border: 1px solid transparent; position: relative; z-index: 2; }
.ext-pill-city { background: #e9d5ff; color: #6b21a8; border-color: #c084fc; }
.ext-pill-remote { background: #bfdbfe; color: #075985; border-color: #60a5fa; }
.ext-pill-hybrid { background: #d9f99d; color: #3f6212; border-color: #a3e635; }
.ext-pill-onsite { background: #e2e8f0; color: #334155; border-color: #94a3b8; }
.ext-pill-keywords { background: #bbf7d0; color: #166534; border-color: #4ade80; }
.ext-pill-excluded { background: #fecaca; color: #991b1b; border-color: #f87171; }
.ext-pill-posted { background: #c7d2fe; color: #3730a3; border-color: #818cf8; }
.ext-pill-interested { background: #fecdd3; color: #9f1239; border-color: #fb7185; }
.ext-distance { display: inline-flex; align-items: center; gap: 4px; background: #bae6fd; color: #075985; font-size: 13px; font-weight: 600; padding: 3px 10px; border-radius: 12px; border: 1px solid #38bdf8; position: relative; z-index: 2; }
.ext-distance-far { background: #fed7aa; color: #9a4c00; border-color: #fb923c; }
.ext-distance-err { background: #fecaca; color: #991b1b; border-color: #f87171; }
.ext-kw-hit { background: #bbf7d0; padding: 0 2px; border-radius: 2px; font-weight: 500; }
.ext-kw-excluded { background: #fecaca; padding: 0 2px; border-radius: 2px; font-weight: 500; }
.ext-dim { opacity: 0.45; transition: opacity 0.15s ease; }
.ext-detail-insights { display: flex; flex-direction: column; gap: 12px; margin: 0 0 16px 0; }
.ext-detail-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; }
.ext-detail-heading { margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: 0.2px; }
.ext-detail-skills-row { display: flex; flex-wrap: wrap; gap: 6px; }
.ext-detail-skill-pill { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; background: #e9d5ff; color: #6b21a8; border: 1px solid #c084fc; letter-spacing: 0.2px; }
.ext-detail-employer-headline { font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px; }
.ext-detail-employer-desc { font-size: 13px; color: #334155; margin: 0 0 6px 0; line-height: 1.4; }
.ext-detail-employer-stats { font-size: 12px; color: #475569; font-weight: 600; }
`;

export function ensureStylesInjected(): void {
  if (document.getElementById("indeed-job-insights-styles")) return;
  const style = document.createElement("style");
  style.id = "indeed-job-insights-styles";
  style.textContent = INJECTOR_CSS;
  document.head.appendChild(style);
}
