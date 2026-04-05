/** Formatea número con separador de miles y decimales fijos. */
export const fmt = (n: number, decimals = 2): string =>
  n.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
