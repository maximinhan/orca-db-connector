// Renders images/icon.png and images/cover.png with Playwright: node scripts/render-images.cjs images
const { chromium } = require('playwright')
const out = process.argv[2]
const mark = (s) => `
<svg width="${s}" height="${s}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12324a"/><stop offset="1" stop-color="#0b1b2b"/></linearGradient>
    <linearGradient id="cy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe3d4"/><stop offset="1" stop-color="#2bb6a3"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g>
    <path d="M132 150v212c0 30 55 54 124 54s124-24 124-54V150z" fill="url(#cy)"/>
    <ellipse cx="256" cy="150" rx="124" ry="54" fill="#b6f3e9"/>
    <path d="M132 220c0 30 55 54 124 54s124-24 124-54" fill="none" stroke="#0b1b2b" stroke-opacity=".35" stroke-width="14"/>
    <path d="M132 292c0 30 55 54 124 54s124-24 124-54" fill="none" stroke="#0b1b2b" stroke-opacity=".35" stroke-width="14"/>
  </g>
  <g transform="translate(318 300)">
    <circle cx="62" cy="62" r="78" fill="#0b1b2b"/>
    <circle cx="62" cy="62" r="62" fill="#f5b942"/>
    <path d="M44 22v26M80 22v26" stroke="#0b1b2b" stroke-width="12" stroke-linecap="round"/>
    <path d="M30 48h64v14a32 32 0 0 1-64 0z" fill="#0b1b2b"/>
    <path d="M62 92v16" stroke="#0b1b2b" stroke-width="12" stroke-linecap="round"/>
  </g>
</svg>`
;(async () => {
  const b = await chromium.launch()
  let p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })
  await p.setContent(`<body style="margin:0;background:transparent">${mark(512)}</body>`)
  await p.screenshot({ path: `${out}/icon.png`, omitBackground: true })
  p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
  const chip = (t) => `<span style="border:2px solid #2bb6a3;color:#b6f3e9;border-radius:999px;padding:14px 28px;font-size:30px">${t}</span>`
  await p.setContent(`<body style="margin:0;width:1600px;height:1000px;background:linear-gradient(135deg,#12324a,#0b1b2b 65%);font-family:'DejaVu Sans',Arial,sans-serif;color:#fff;display:flex;align-items:center">
    <div style="margin-left:120px">${mark(360)}</div>
    <div style="margin-left:90px;width:900px">
      <div style="font-size:108px;font-weight:700;letter-spacing:-2px">DB Connector</div>
      <div style="font-size:40px;color:#9fb6c8;margin-top:18px;line-height:1.35">PostgreSQL, MySQL and SQLite<br>for you and your coding agents</div>
      <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:56px">
        ${chip('Agent writes ask first')}${chip('Query log with results')}${chip('MCP tools')}${chip('AWS Secrets Manager')}${chip('Dangerous-environment guard')}
      </div>
    </div></body>`)
  await p.screenshot({ path: `${out}/cover.png` })
  await b.close()
})()
