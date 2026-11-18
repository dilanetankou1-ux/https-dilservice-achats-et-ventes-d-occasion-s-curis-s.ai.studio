import React, { useState } from 'react';
import { CreditCard, Lock, Plus, Smartphone, Star, Trash2 } from 'lucide-react';
import {
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from '../services/marketplaceService';
import {
  MOMO_COUNTRIES,
  PAYMENT_PROVIDER_LABELS,
  type PaymentMethod,
  type PaymentProvider,
} from '../types/marketplace';

interface PaymentMethodsPanelProps {
  userId: string;
  defaultHolderName: string;
  paymentMethods: PaymentMethod[];
}

function detectCardBrand(digits: string): string {
  if (digits.startsWith('4')) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Carte bancaire';
}

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function PaymentMethodsPanel({
  userId,
  defaultHolderName,
  paymentMethods,
}: PaymentMethodsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>('carte_bancaire');
  const [holderName, setHolderName] = useState(defaultHolderName);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [countryDialCode, setCountryDialCode] = useState('+237');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCardNumber('');
    setExpiry('');
    setPhoneNumber('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanHolder = holderName.trim();
    if (cleanHolder.length < 2) {
      setError('Veuillez indiquer le nom du titulaire.');
      return;
    }

    let label = '';
    let maskedIdentifier = '';
    let cardBrand = '';
    let cleanExpiry = '';
    let cleanDial = '';

    if (provider === 'carte_bancaire') {
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19 || !luhnCheck(digits)) {
        setError('Numéro de carte bancaire invalide (13 à 19 chiffres).');
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim())) {
        setError("Veuillez saisir une date d'expiration au format MM/AA.");
        return;
      }
      const last4 = digits.slice(-4);
      cardBrand = detectCardBrand(digits);
      maskedIdentifier = `•••• ${last4}`;
      label = `${cardBrand} ${maskedIdentifier}`;
      cleanExpiry = expiry.trim();
    } else {
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 12) {
        setError('Veuillez saisir un numéro Mobile Money valide (7 à 12 chiffres).');
        return;
      }
      const head = digits.slice(0, 3);
      const tail = digits.slice(-2);
      cleanDial = countryDialCode;
      maskedIdentifier = `${cleanDial} ${head} •• ${tail}`;
      const countryName =
        MOMO_COUNTRIES.find((c) => c.code === cleanDial)?.country || '';
      label = `${PAYMENT_PROVIDER_LABELS[provider]} ${countryName}`.trim();
    }

    setSaving(true);
    try {
      await addPaymentMethod(userId, paymentMethods, {
        provider,
        label,
        holderName: cleanHolder,
        maskedIdentifier,
        cardBrand,
        expiry: cleanExpiry,
        countryDialCode: cleanDial,
        isDefault,
      });
      resetForm();
      setShowAddForm(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'ajouter ce moyen de paiement."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#E4E4E0] rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#141413]">
            Moyens de paiement
          </h2>
          <p className="text-xs text-[#575752] mt-1">
            Enregistrez vos cartes bancaires et comptes MTN MoMo ou Orange Money
            pour régler vos achats sur Dilservice.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm((v) => !v);
            setHolderName(defaultHolderName);
            resetForm();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Fermer' : 'Ajouter un moyen'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#0F5132] bg-[#0F5132]/[0.05] border border-[#0F5132]/15 rounded-lg px-3.5 py-2.5">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span>
          Sécurité renforcée : les numéros complets de carte et codes CVV ne sont
          jamais stockés. Seuls les 4 derniers chiffres ou numéros masqués sont
          conservés.
        </span>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl bg-[#F7F7F5] border border-[#E4E4E0] space-y-4"
        >
          {/* Provider selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                'carte_bancaire',
                'mtn_momo',
                'orange_money',
              ] as PaymentProvider[]
            ).map((prov) => {
              const active = provider === prov;
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => {
                    setProvider(prov);
                    setError(null);
                  }}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#141413] text-white border-[#141413]'
                      : 'bg-white text-[#141413] border-[#E4E4E0] hover:bg-[#EFECE6]'
                  }`}
                >
                  {prov === 'carte_bancaire' ? (
                    <CreditCard className="w-3.5 h-3.5" />
                  ) : (
                    <Smartphone className="w-3.5 h-3.5" />
                  )}
                  <span>{PAYMENT_PROVIDER_LABELS[prov]}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="pm-holder"
              className="block text-xs font-medium text-[#141413] mb-1"
            >
              Nom du titulaire
            </label>
            <input
              id="pm-holder"
              type="text"
              required
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Nom complet"
              className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E0] bg-white text-sm text-[#141413]"
            />
          </div>

          {provider === 'carte_bancaire' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="pm-card-number"
                  className="block text-xs font-medium text-[#141413] mb-1"
                >
                  Numéro de carte (Visa, Mastercard)
                </label>
                <input
                  id="pm-card-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  required
                  value={cardNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 19)
                      .replace(/(.{4})/g, '$1 ')
                      .trim();
                    setCardNumber(cleaned);
                  }}
                  placeholder="4532 •••• •••• 4242"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E0] bg-white text-sm font-mono tabular-nums text-[#141413]"
                />
              </div>

              <div>
                <label
                  htmlFor="pm-card-expiry"
                  className="block text-xs font-medium text-[#141413] mb-1"
                >
                  Expiration (MM/AA)
                </label>
                <input
                  id="pm-card-expiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  required
                  maxLength={5}
                  value={expiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d/]/g, '');
                    if (val.length === 2 && !val.includes('/') && expiry.length < 2) {
                      val += '/';
                    }
                    setExpiry(val.slice(0, 5));
                  }}
                  placeholder="08/28"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E0] bg-white text-sm font-mono tabular-nums text-[#141413]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="pm-momo-country"
                  className="block text-xs font-medium text-[#141413] mb-1"
                >
                  Pays / Indicatif
                </label>
                <select
                  id="pm-momo-country"
                  value={countryDialCode}
                  onChange={(e) => setCountryDialCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-sm text-[#141413]"
                >
                  {MOMO_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.country} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="pm-momo-phone"
                  className="block text-xs font-medium text-[#141413] mb-1"
                >
                  Numéro {PAYMENT_PROVIDER_LABELS[provider]}
                </label>
                <input
                  id="pm-momo-phone"
                  type="tel"
                  inputMode="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="670 00 00 00"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E0] bg-white text-sm font-mono tabular-nums text-[#141413]"
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-[#141413] cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-[#E4E4E0] accent-[#0F5132]"
            />
            <span>Définir comme moyen de paiement par défaut</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-[#575752] hover:text-[#141413] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer ce moyen'}
            </button>
          </div>
        </form>
      )}

      {paymentMethods.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-[#D6D6D0] text-center text-xs text-[#64645F]">
          Aucun moyen de paiement enregistré. Ajoutez une carte bancaire (Visa,
          Mastercard), un compte MTN MoMo ou Orange Money.
        </div>
      ) : (
        <ul className="divide-y divide-[#F0EFEA] border border-[#E4E4E0] rounded-xl overflow-hidden">
          {paymentMethods.map((method) => (
            <li
              key={method.id}
              className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-white"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#F7F7F5] border border-[#E4E4E0] flex items-center justify-center text-[#141413] shrink-0">
                  {method.provider === 'carte_bancaire' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-[#0F5132]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#141413]">
                    <span className="truncate">{method.label}</span>
                    {method.isDefault && (
                      <span className="text-xs font-medium text-[#0F5132]">
                        · Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64645F] font-mono tabular-nums">
                    {method.maskedIdentifier}
                    {method.expiry ? ` · Exp. ${method.expiry}` : ''} ·{' '}
                    <span className="font-sans">{method.holderName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!method.isDefault && (
                  <button
                    type="button"
                    onClick={() =>
                      void setDefaultPaymentMethod(userId, method, paymentMethods)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E4E4E0] rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] cursor-pointer"
                  >
                    <Star className="w-3 h-3" />
                    <span>Par défaut</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Supprimer ce moyen de paiement"
                  onClick={() => void deletePaymentMethod(userId, method.id)}
                  className="w-8 h-8 rounded-lg border border-[#E4E4E0] flex items-center justify-center text-[#64645F] hover:text-red-700 hover:border-red-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
