/**
 * Parses raw barcode strings from a USB HID scanner.
 *
 * Torrey wLabel 20 EAN-13 weight-embedded format:
 *   2 P PPPPP WWWWW C   (13 digits total)
 *   ─┬─ ──┬── ──┬──  └─ EAN-13 check digit (ignored here)
 *    │    │     └─────── weight with 2 decimals (e.g. 00093 = 0.93 kg, 01250 = 12.50 kg)
 *    │    └───────────── 5-digit PLU (store this in product's Barcode field)
 *    └────────────────── 2-digit scale prefix (e.g. "20")
 *
 * To set up: program the Torrey with a PLU per product (e.g. 00001 for Arrachera),
 * then enter that same 5-digit PLU in the product's "Barcode" field in the POS.
 */

export type ParsedScan =
  | { kind: 'weighted'; plu: string; weightKg: number }
  | { kind: 'plain'; barcode: string }

const EAN13_WEIGHT_RE = /^2\d{12}$/

export function parseScan(raw: string): ParsedScan | null {
  const s = raw.trim()
  if (s.length < 3) return null

  // 13-digit barcode starting with "2" → Torrey/GS1 weight-embedded
  if (EAN13_WEIGHT_RE.test(s)) {
    const plu      = String(parseInt(s.slice(2, 7), 10)) // chars 2-6: PLU (strip leading zeros, e.g. "00008" → "8")
    const raw      = parseInt(s.slice(7, 12), 10) // chars 7-11: weight × 100 (e.g. 00093 = 0.93 kg)
    const weightKg = raw / 100
    if (weightKg > 0 && weightKg < 1000) {
      return { kind: 'weighted', plu, weightKg }
    }
  }

  return { kind: 'plain', barcode: s }
}
