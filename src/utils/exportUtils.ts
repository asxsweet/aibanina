import html2canvas from 'html2canvas';
import { DailyMessage } from '../types';
import { PARTNER_NAME } from '../data/constants';

// Loads the handwriting font used on the exported poster. Safe to call
// repeatedly — the browser dedupes identical <link> tags.
function ensureFontLoaded(): void {
  const id = 'poster-export-font';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Nunito:wght@400;600&display=swap';
  document.head.appendChild(link);
}

function formatTodayKk(): string {
  const months = [
    'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
    'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
  ];
  const now = new Date();
  return `${now.getFullYear()} жылғы ${months[now.getMonth()]}`;
}

// Builds the offscreen notebook-letter DOM node used for the export —
// kept visually identical to the in-app card design.
function buildPosterNode(message: DailyMessage): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = '380px';

  wrapper.innerHTML = `
    <div style="position:relative;background:#FFFBFA;border-radius:24px;padding:26px 16px;overflow:hidden;font-family:'Nunito',sans-serif;">
      <svg style="position:absolute;top:-16px;left:-30px;width:120px;height:120px;opacity:0.3;" viewBox="0 0 100 100"><path d="M8 68 Q 18 18 48 38 Q 78 58 88 16" stroke="#F5A9C0" stroke-width="6" fill="none" stroke-linecap="round"/></svg>
      <svg style="position:absolute;bottom:-18px;right:-26px;width:120px;height:120px;opacity:0.3;transform:rotate(160deg);" viewBox="0 0 100 100"><path d="M8 68 Q 18 18 48 38 Q 78 58 88 16" stroke="#F5A9C0" stroke-width="6" fill="none" stroke-linecap="round"/></svg>

      <div style="width:100%;background:repeating-linear-gradient(#FEFEFE,#FEFEFE 27px,#E4E9F5 28px);border-radius:10px;padding:22px 22px 22px 38px;position:relative;">
        <div style="position:absolute;left:28px;top:0;bottom:0;width:1px;background:#F2A9C0;"></div>

        <svg width="30" height="26" viewBox="0 0 30 26" style="margin-bottom:10px;">
          <path d="M15 24 C 4 16, 2 6, 9 3 C 13 1, 15 5, 15 7 C 15 5, 17 1, 21 3 C 28 6, 26 16, 15 24 Z" fill="none" stroke="#D9497A" stroke-width="2"/>
        </svg>

        <div style="font-family:'Caveat',cursive;font-weight:700;font-size:23px;color:#B4437A;margin-bottom:8px;">${escapeHtml(message.title)}</div>

        <div style="font-family:'Caveat',cursive;font-size:20px;line-height:1.4;color:#3A3A3A;">«${escapeHtml(message.text)}»</div>

        ${message.hint ? `<div style="font-family:'Caveat',cursive;font-size:19px;color:#D9497A;margin-top:16px;">${escapeHtml(message.hint)}</div>` : ''}

        <div style="margin-top:18px;padding-top:10px;border-top:1px dashed rgba(217,73,122,0.3);font-family:'Caveat',cursive;font-size:15px;color:#8B7A66;text-align:right;">
          Күн ${message.dayNumber} · ${formatTodayKk()}
        </div>
      </div>
    </div>
  `;

  return wrapper;
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

// Waits for the just-injected Google Font to actually be ready so
// html2canvas doesn't rasterize the poster with the fallback font on the
// very first export of a session.
async function waitForFont(): Promise<void> {
  try {
    await (document as unknown as { fonts: { load: (f: string) => Promise<unknown>; ready: Promise<unknown> } }).fonts.load('600 20px Caveat');
    await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
  } catch {
    // document.fonts not available (very old browser) — export proceeds
    // with whatever font is on hand rather than blocking the download.
  }
}

// Renders the given day's message as a notebook-style poster and triggers
// a PNG download — used both from the daily reward popup and from tapping
// a star on the constellation map (both flow through the same MessageCard).
export async function downloadMessagePoster(message: DailyMessage): Promise<void> {
  ensureFontLoaded();
  await waitForFont();

  const node = buildPosterNode(message);
  document.body.appendChild(node);

  try {
    const canvas = await html2canvas(node, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `kun-${message.dayNumber}-${PARTNER_NAME.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    node.remove();
  }
}
