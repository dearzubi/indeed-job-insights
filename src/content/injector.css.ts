export const INJECTOR_CSS = `
.ext-pills { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 8px 0; }
.ext-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.2px; }
.ext-pill-city { background: #f3e8ff; color: #6b21a8; }
.ext-pill-remote { background: #dbeafe; color: #075985; }
.ext-pill-keywords { background: #dcfce7; color: #166534; }
.ext-distance { display: inline-flex; align-items: center; gap: 4px; background: #f0f7ff; color: #2557a7; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 10px; border: 1px solid #c7dcf7; margin-left: 8px; }
.ext-distance-far { background: #fff4e6; color: #9a4c00; border-color: #ffd9a8; }
.ext-distance-err { background: #fff1f1; color: #991b1b; border-color: #fecaca; }
.ext-kw-hit { background: #fff3a8; padding: 0 2px; border-radius: 2px; font-weight: 500; }
.ext-border-green { border-left: 4px solid #16a34a !important; }
.ext-border-blue { border-left: 4px solid #0284c7 !important; }
.ext-border-purple { border-left: 4px solid #9333ea !important; }
.ext-dim { opacity: 0.45; transition: opacity 0.15s ease; }
`;

export function ensureStylesInjected(): void {
  if (document.getElementById("indeed-helper-styles")) return;
  const style = document.createElement("style");
  style.id = "indeed-helper-styles";
  style.textContent = INJECTOR_CSS;
  document.head.appendChild(style);
}
