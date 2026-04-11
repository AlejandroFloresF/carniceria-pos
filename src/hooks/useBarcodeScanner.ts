import { useEffect, useRef } from 'react'

/**
 * Detects USB HID barcode scanner input.
 *
 * Scanners behave like a keyboard but type characters very rapidly
 * (< 50 ms between keystrokes) and end with an Enter key.
 * This hook distinguishes scanner input from normal user typing by measuring
 * the time from the first character to the Enter key.
 */

const INTER_KEY_THRESHOLD_MS = 50 // max ms between scanner keystrokes
const MIN_LENGTH = 4               // ignore scans shorter than this

export function useBarcodeScanner(
  onScan: (code: string) => void,
  enabled = true,
) {
  const bufferRef    = useRef('')
  const bufferStart  = useRef(0)
  const lastKeyTime  = useRef(0)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now()

      if (e.key === 'Enter') {
        const code    = bufferRef.current
        const elapsed = now - bufferStart.current
        bufferRef.current = ''

        // Validate: enough chars, and they arrived fast (scanner speed)
        const maxAllowed = code.length * INTER_KEY_THRESHOLD_MS
        if (code.length >= MIN_LENGTH && elapsed <= maxAllowed) {
          e.preventDefault()
          e.stopPropagation()
          onScan(code)
        }
        return
      }

      // Reset buffer if too much time passed since last keystroke
      if (bufferRef.current.length > 0 && now - lastKeyTime.current > INTER_KEY_THRESHOLD_MS) {
        bufferRef.current = ''
      }

      // Accumulate printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (bufferRef.current.length === 0) bufferStart.current = now
        bufferRef.current += e.key
      }

      lastKeyTime.current = now
    }

    // capture: true so we intercept before React synthetic events
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [onScan, enabled])
}
