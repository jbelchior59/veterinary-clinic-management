/**
 * printUtils.ts
 * Mantém o layout completo da branch impressao_faturas
 * e adiciona a função printHtml da develop.
 */

export function printHtml(html: string, title: string): void {
  const win = window.open('', '_blank', 'width=900,height=780');

  if (!win) {
    alert('O navegador bloqueou a janela de impressão. Por favor, permita pop-ups para este site.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>

  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
    }

    .fatura-page {
      max-width: 794px;
      margin: 0 auto;
      padding: 20px 24px 28px;
    }

    /* ── Header ── */
    .fatura-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 0;
    }

    .brand-name {
      font-size: 20px;
      font-weight: 900;
      color: #5A5A40;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }

    .brand-sub {
      font-size: 10px;
      color: #555;
      font-style: italic;
      margin-top: 2px;
    }

    .header-title-block {
      text-align: center;
      flex: 1;
      padding: 0 16px;
    }

    .doc-title {
      font-size: 18px;
      font-weight: 900;
      color: #000;
      line-height: 1.1;
    }

    .doc-subtitle {
      font-size: 10px;
      font-weight: 700;
      color: #000;
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .doc-note {
      font-size: 9px;
      color: #555;
      margin-top: 2px;
    }

    .header-meta {
      text-align: right;
      min-width: 120px;
    }

    .header-meta-row {
      font-size: 10px;
      color: #333;
      margin-bottom: 2px;
    }

    .header-meta-row strong {
      color: #000;
    }

    /* ── Client strip ── */
    .client-strip {
      border: 1px solid #000;
      border-top: none;
      padding: 6px 8px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4px 16px;
      background: #fafafa;
      margin-bottom: 0;
    }

    .client-field {
      font-size: 10px;
      color: #000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .client-field strong {
      font-weight: 700;
    }

    /* ── Section block ── */
    .section {
      margin-top: 10px;
    }

    .section-header {
      background: #5A5A40;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 4px 8px;
    }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    thead th {
      background: #E8E8E0;
      color: #000;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 5px 7px;
      border: 1px solid #999;
      text-align: left;
    }

    tbody td {
      padding: 5px 7px;
      border: 1px solid #ccc;
      vertical-align: top;
      color: #000;
    }

    tbody tr:nth-child(even) td {
      background: #f7f7f5;
    }

    .total-row td {
      font-weight: 700;
      background: #EEEEE5 !important;
      border-color: #999;
      border-top: 1.5px solid #000;
    }

    .tr { text-align: right; }
    .tc { text-align: center; }
    .tl { text-align: left; }

    /* ── Grand total bar ── */
    .grand-total-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0;
      border: 1.5px solid #000;
      border-top: none;
    }

    .grand-total-label {
      background: #5A5A40;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 7px 16px;
    }

    .grand-total-amount {
      background: #fff;
      font-size: 14px;
      font-weight: 900;
      color: #000;
      padding: 7px 16px;
      min-width: 120px;
      text-align: right;
      border-left: 1.5px solid #000;
    }

    /* ── Status badge ── */
    .status-row {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #333;
    }

    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: 1px solid;
    }

    .badge-paga {
      background: #dcfce7;
      color: #166534;
      border-color: #86efac;
    }

    .badge-pendente {
      background: #fef9c3;
      color: #854d0e;
      border-color: #fde047;
    }

    .venc-note {
      font-size: 10px;
      color: #555;
    }

    /* ── Footer ── */
    .fatura-footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #999;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-brand {
      font-size: 9px;
      font-weight: 700;
      color: #5A5A40;
    }

    .footer-note {
      font-size: 9px;
      color: #777;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .no-print {
        display: none !important;
      }
    }
  </style>
</head>

<body>
  <div class="fatura-page">
    ${html}
  </div>
</body>
</html>`);

  win.document.close();
  win.focus();

  setTimeout(() => {
    win.print();
  }, 300);
}

export function printDiv(divId: string, title: string): void {
  const el = document.getElementById(divId);

  if (!el) {
    console.warn(`[printDiv] Elemento #${divId} não encontrado.`);
    return;
  }

  printHtml(el.innerHTML, title);
}