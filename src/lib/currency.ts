import { CURRENCIES, type CurrencyCode } from '../types/marketplace';

/**
 * Reference exchange rates expressed as 1 EUR = N units of target currency.
 * Fixed official BCEAO/BEAC parity for XOF and XAF: 1 EUR = 655.957 FCFA.
 */
export const BASELINE_EUR_RATES: Record<CurrencyCode, number> = {
  EUR: 1,
  XAF: 655.957,
  XOF: 655.957,
  MAD: 10.85,
  NGN: 1760,
  KES: 139,
  ZAR: 19.45,
  GBP: 0.835,
  CHF: 0.935,
  USD: 1.06,
  CAD: 1.48,
};

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<CurrencyCode, number> = BASELINE_EUR_RATES
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const fromRate = rates[from] || BASELINE_EUR_RATES[from] || 1;
  const toRate = rates[to] || BASELINE_EUR_RATES[to] || 1;
  const inEur = amount / fromRate;
  return inEur * toRate;
}

export function formatMoney(amount: number, currency: CurrencyCode = 'EUR'): string {
  const meta = CURRENCIES[currency] || CURRENCIES.EUR;
  const isWhole = meta.decimals === 0 || Number.isInteger(amount);
  const formattedNumber = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: meta.decimals === 0 ? 0 : isWhole ? 0 : 2,
    maximumFractionDigits: meta.decimals,
  });
  return `${formattedNumber} ${meta.symbol}`;
}

export async function fetchLiveEurRates(): Promise<{
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
  isLive: boolean;
}> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (!response.ok) {
      throw new Error('HTTP error');
    }
    const data = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid rates payload');
    }

    const next: Record<CurrencyCode, number> = { ...BASELINE_EUR_RATES };
    (Object.keys(BASELINE_EUR_RATES) as CurrencyCode[]).forEach((code) => {
      if (code === 'XAF' || code === 'XOF') {
        next[code] = 655.957;
      } else if (typeof data.rates?.[code] === 'number' && data.rates[code] > 0) {
        next[code] = data.rates[code];
      }
    });

    return {
      rates: next,
      updatedAt: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isLive: true,
    };
  } catch {
    return {
      rates: { ...BASELINE_EUR_RATES },
      updatedAt: 'Taux de référence',
      isLive: false,
    };
  }
}
