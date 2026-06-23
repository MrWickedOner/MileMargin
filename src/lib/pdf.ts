import { jsPDF } from 'jspdf'
import type { RateEvaluation } from './types'

/**
 * Generate a professional "Rate Verification PDF" that drivers can
 * share with freight brokers to negotiate higher rates.
 */
export function generateRateVerificationPdf(evaluation: RateEvaluation): void {
  const doc = new jsPDF({ format: 'letter', unit: 'in' })
  const pageWidth = 8.5
  const margin = 0.75
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Colors
  const primary = '#0f172a'   // slate-950
  const gray400 = '#9ca3af'
  const gray700 = '#374151'

  const setColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    doc.setTextColor(r, g, b)
  }

  // ── Header Bar ──
  doc.setFillColor(15, 23, 42) // slate-950
  doc.rect(0, 0, pageWidth, 0.9, 'F')
  setColor('#ffffff')
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('MileMargin', margin, 0.55)
  setColor('#6ee7b7')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Rate Verification Report', pageWidth - margin, 0.55, { align: 'right' })

  y = 1.15

  // ── Report Title ──
  setColor(primary)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Load Profitability Analysis', margin, y)
  y += 0.35

  // ── Evaluation Metadata ──
  setColor(gray400)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const dateStr = new Date(evaluation.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  doc.text(`Generated: ${dateStr}`, margin, y)
  doc.text(`Report ID: ${evaluation.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, y, { align: 'right' })
  y += 0.3

  // ── Trip Info ──
  const tripInfo = [
    ['Customer / Broker', evaluation.customer || '—'],
    ['Origin', evaluation.origin || '—'],
    ['Destination', evaluation.destination || '—'],
    ['Total Miles', `${evaluation.miles.toLocaleString()} mi`],
  ]

  doc.setFillColor(249, 250, 251) // gray-50
  doc.rect(margin, y, contentWidth, tripInfo.length * 0.22 + 0.12, 'F')

  let infoY = y + 0.08
  doc.setFontSize(10)
  for (const [label, value] of tripInfo) {
    setColor(gray700)
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin + 0.1, infoY)
    setColor(primary)
    doc.setFont('helvetica', 'normal')
    doc.text(value, margin + 2.2, infoY)
    infoY += 0.22
  }
  y = infoY + 0.15

  // ── Financial Breakdown Table ──
  setColor(primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Financial Breakdown', margin, y)
  y += 0.3

  // Table header
  doc.setFillColor(15, 23, 42)
  doc.rect(margin, y, contentWidth, 0.25, 'F')
  setColor('#ffffff')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Item', margin + 0.1, y + 0.17)
  doc.text('Amount', margin + contentWidth - 0.1, y + 0.17, { align: 'right' })
  y += 0.3

  const rows: [string, string][] = [
    ['Gross Revenue', `${evaluation.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Rate Per Mile', `${evaluation.ratePerMile.toFixed(2)} / mi`],
    [`Operating Cost (${evaluation.miles} mi x ${evaluation.operatingCPM.toFixed(2)} CPM)`, `-${evaluation.estimatedOperatingCost.toFixed(2)}`],
    ['Fuel Cost', `-${evaluation.fuelCost.toFixed(2)}`],
    ['Tolls', `-${evaluation.tolls.toFixed(2)}`],
    ['Accessorials', `-${evaluation.accessorials.toFixed(2)}`],
    ['Broker Fees', `-${evaluation.brokerFees.toFixed(2)}`],
  ]

  for (const [label, amount] of rows) {
    doc.setFontSize(9)
    setColor(gray700)
    doc.setFont('helvetica', 'normal')
    doc.text(label, margin + 0.1, y)

    const isNegative = amount.startsWith('-')
    setColor(isNegative ? '#dc2626' : primary)
    doc.setFont('helvetica', 'bold')
    doc.text(amount, margin + contentWidth - 0.1, y, { align: 'right' })

    y += 0.2
  }

  // ── Profit / Loss Summary ──
  y += 0.1
  doc.setDrawColor(evaluation.isProfitable ? 5 : 220, evaluation.isProfitable ? 150 : 38, evaluation.isProfitable ? 103 : 38)
  doc.setLineWidth(0.02)
  doc.rect(margin, y - 0.05, contentWidth, 0.45, 'D')

  setColor(evaluation.isProfitable ? '#059669' : '#dc2626')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const profitLabel = evaluation.isProfitable ? 'PROFIT' : 'LOSS'
  doc.text(`${evaluation.isProfitable ? '+' : '-'}$${Math.abs(evaluation.estimatedProfit).toFixed(2)} ${profitLabel}`, margin + 0.15, y + 0.28)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Profit Margin: ${evaluation.profitMargin.toFixed(1)}%`, margin + contentWidth - 0.15, y + 0.28, { align: 'right' })
  y += 0.6

  // ── Verdict ──
  y += 0.05
  doc.setFillColor(evaluation.isProfitable ? 236 : 254, evaluation.isProfitable ? 253 : 226, evaluation.isProfitable ? 245 : 226)
  doc.rect(margin, y, contentWidth, 0.3, 'F')
  setColor(evaluation.isProfitable ? '#059669' : '#dc2626')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const verdict = evaluation.isProfitable
    ? `✅ This load is PROFITABLE at $${evaluation.ratePerMile.toFixed(2)}/mi. Negotiate confidently!`
    : `⚠️ This load is BELOW COST at $${evaluation.ratePerMile.toFixed(2)}/mi. Consider a higher rate.`
  doc.text(verdict, margin + 0.15, y + 0.2)
  y += 0.5

  // ── Footer ──
  setColor(gray400)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Generated by MileMargin — Your Profit Co-Pilot', margin, 10.1)
  doc.text('milemargin.app', pageWidth - margin, 10.1, { align: 'right' })

  // Save PDF
  const filename = `Rate_Verification_${evaluation.id.slice(0, 8).toUpperCase()}.pdf`
  doc.save(filename)
}

/**
 * Alternative: return the PDF as a blob for preview or sharing.
 */
export function generateRateVerificationPdfBlob(): Blob {
  const doc = new jsPDF({ format: 'letter', unit: 'in' })
  return doc.output('blob')
}