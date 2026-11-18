import { useState } from 'react';
import { ArrowLeftRight, Check, RefreshCw } from 'lucide-react';
import { convertCurrency, formatMoney } from '../lib/currency';
import { CURRENCIES, CURRENCY_LIST, type CurrencyCode } from '../types/marketplace';

interface CurrencyConverterViewProps {
  rates: Record<CurrencyCode, number>;
  ratesLabel: string;
  onRefreshRates: () => Promise<void>;
  refreshingRates: boolean;
  displayCurrency: CurrencyCode;
  onApplyDisplayCurrency: (currency: CurrencyCode) => void;
}

export function CurrencyConverterView({
  rates,
  ratesLabel,
  onRefreshRates,
  refreshingRates,
  displayCurrency,
  onApplyDisplayCurrency,
}: CurrencyConverterViewProps) {
  const [amountInput, setAmountInput] = useState('100');
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('EUR');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('XAF');
  const [appliedNotice, setAppliedNotice] = useState(false);

  const numericAmount = Math.max(0, Number(amountInput) || 0);
  const converted = convertCurrency(numericAmount, fromCurrency, toCurrency, rates);
  const unitRate = convertCurrency(1, fromCurrency, toCurrency, rates);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const quickPresets =
    fromCurrency === 'XAF' || fromCurrency === 'XOF' || fromCurrency === 'NGN'
      ? [10000, 50000, 150000, 500000]
      : [25, 100, 350, 1000];

  const handleApplyCurrency = (code: CurrencyCode) => {
    onApplyDisplayCurrency(code);
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 2500);
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413]">
            Convertisseur de devises
          </h1>
          <p className="text-sm text-[#575752] mt-1">
            Estimez instantanément les prix entre l&apos;Afrique, l&apos;Europe,
            les Amériques et l&apos;international.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-[#64645F]">
            {ratesLabel}
          </span>
          <button
            type="button"
            disabled={refreshingRates}
            onClick={() => void onRefreshRates()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#E4E4E0] bg-white rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshingRates ? 'animate-spin' : ''}`}
            />
            <span>Actualiser les taux</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Bi-directional Converter */}
        <div className="lg:col-span-6 bg-white border border-[#E4E4E0] rounded-xl p-6 space-y-6">
          <div>
            <label
              htmlFor="converter-amount"
              className="block text-sm font-medium text-[#141413] mb-2"
            >
              Montant à convertir
            </label>
            <input
              id="converter-amount"
              type="number"
              min="0"
              step="any"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#E4E4E0] text-xl font-mono tabular-nums font-medium text-[#141413] focus:outline-none focus:border-[#0F5132]"
            />
            <div className="flex flex-wrap gap-2 mt-2.5">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountInput(String(preset))}
                  className="px-3 py-1 rounded-lg border border-[#E4E4E0] bg-[#F7F7F5] text-xs font-mono tabular-nums text-[#141413] hover:bg-[#EFECE6] cursor-pointer"
                >
                  {preset.toLocaleString('fr-FR')} {CURRENCIES[fromCurrency].symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label
                htmlFor="from-currency"
                className="block text-xs font-medium text-[#64645F] mb-1.5"
              >
                De
              </label>
              <select
                id="from-currency"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] bg-white text-sm text-[#141413]"
              >
                {CURRENCY_LIST.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.code} — {cur.name} ({cur.regionLabel})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSwap}
              aria-label="Inverser les devises"
              className="w-10 h-10 rounded-lg border border-[#E4E4E0] bg-[#F7F7F5] hover:bg-[#EFECE6] flex items-center justify-center text-[#141413] cursor-pointer mx-auto"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <div>
              <label
                htmlFor="to-currency"
                className="block text-xs font-medium text-[#64645F] mb-1.5"
              >
                Vers
              </label>
              <select
                id="to-currency"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] bg-white text-sm text-[#141413]"
              >
                {CURRENCY_LIST.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.code} — {cur.name} ({cur.regionLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result Summary */}
          <div className="p-5 rounded-xl bg-[#F7F7F5] border border-[#E4E4E0]">
            <p className="text-xs text-[#64645F] mb-1">
              {formatMoney(numericAmount, fromCurrency)} équivaut à
            </p>
            <p className="font-mono tabular-nums text-3xl font-semibold text-[#141413] mb-2">
              {formatMoney(converted, toCurrency)}
            </p>
            <p className="text-xs font-mono tabular-nums text-[#575752]">
              1 {fromCurrency} ={' '}
              {unitRate.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              {toCurrency}
            </p>
          </div>

          <div className="pt-2 border-t border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#64645F]">
              Devise d&apos;affichage du catalogue :{' '}
              <span className="font-semibold text-[#141413]">{displayCurrency}</span>
            </div>
            <button
              type="button"
              onClick={() => handleApplyCurrency(toCurrency)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer"
            >
              {appliedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Devise appliquée</span>
                </>
              ) : (
                <span>Afficher les annonces en {toCurrency}</span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Multi-continent comparison table */}
        <div className="lg:col-span-6 bg-white border border-[#E4E4E0] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E4E4E0] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#141413]">
                Équivalences multi-continents
              </h2>
              <p className="text-xs text-[#64645F]">
                Pour {formatMoney(numericAmount, fromCurrency)}
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#F0EFEA]">
            {CURRENCY_LIST.map((cur) => {
              const val = convertCurrency(numericAmount, fromCurrency, cur.code, rates);
              const isSelectedTarget = cur.code === toCurrency;
              return (
                <div
                  key={cur.code}
                  className={`px-6 py-3.5 flex items-center justify-between gap-4 ${
                    isSelectedTarget ? 'bg-[#F7F7F5]' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#141413]">
                        {cur.code}
                      </span>
                      <span className="text-sm font-medium text-[#141413]">
                        {cur.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#64645F]">{cur.regionLabel}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono tabular-nums text-sm font-semibold text-[#141413]">
                      {formatMoney(val, cur.code)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setToCurrency(cur.code)}
                      className="text-xs text-[#0F5132] font-medium hover:underline cursor-pointer whitespace-nowrap"
                    >
                      Sélectionner
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
