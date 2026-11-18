import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Edit3,
  Heart,
  Languages,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { convertCurrency, formatMoney } from '../lib/currency';
import { translateTextWithApi } from '../lib/i18n';
import {
  createOrderAtomic,
  deleteListing,
  startOrGetConversation,
  updateListingStatus,
} from '../services/marketplaceService';
import {
  BLUEPRINT_LIMITS,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  CONTINENT_LABELS,
  DELIVERY_LABELS,
  LISTING_STATUS_LABELS,
  MOMO_COUNTRIES,
  PAYMENT_PROVIDER_LABELS,
  type Conversation,
  type CurrencyCode,
  type Listing,
  type PaymentMethod,
  type PaymentProvider,
} from '../types/marketplace';
import { SafeImage } from './SafeImage';

interface ListingDetailModalProps {
  listing: Listing | null;
  isFavorited: boolean;
  existingConversation?: Conversation | null;
  displayCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  paymentMethods: PaymentMethod[];
  onToggleFavorite: (listing: Listing) => void;
  onClose: () => void;
  onOpenConversation: (conversationId: string) => void;
  onEditListing: (listing: Listing) => void;
  onOrderCreated: (orderId: string) => void;
  onGoToPaymentVault: () => void;
}

export function ListingDetailModal({
  listing,
  isFavorited,
  existingConversation,
  displayCurrency,
  rates,
  paymentMethods,
  onToggleFavorite,
  onClose,
  onOpenConversation,
  onEditListing,
  onOrderCreated,
  onGoToPaymentVault,
}: ListingDetailModalProps) {
  const { user, userProfile, signIn, updateProfileDetails } = useAuth();
  const { languageMeta, languageCode } = useLanguage();

  const [showContactForm, setShowContactForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerValue, setOfferValue] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [buyerWhatsapp, setBuyerWhatsapp] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<
    'remise_en_main_propre' | 'livraison_securisee'
  >('livraison_securisee');
  const [handoffDetails, setHandoffDetails] = useState('');
  const [selectedSavedMethodId, setSelectedSavedMethodId] =
    useState<string>('');
  const [oneOffProvider, setOneOffProvider] =
    useState<PaymentProvider>('mtn_momo');
  const [momoDialCode, setMomoDialCode] = useState('+237');
  const [momoPhone, setMomoPhone] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listing translation state
  const [translatingListing, setTranslatingListing] = useState(false);
  const [translatedDesc, setTranslatedDesc] = useState<{
    lang: string;
    detected: string;
    title: string;
    specs: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    const def = paymentMethods.find((m) => m.isDefault) || paymentMethods[0];
    if (def) {
      setSelectedSavedMethodId(def.id);
    } else {
      setSelectedSavedMethodId('one_off');
    }
  }, [paymentMethods, listing?.id]);

  useEffect(() => {
    setShowContactForm(false);
    setShowOfferForm(false);
    setShowCheckout(false);
    setConfirmDelete(false);
    setError(null);
    setTranslatedDesc(null);
    setContactMessage('');

    if (userProfile) {
      setBuyerWhatsapp(userProfile.whatsappNumber || userProfile.phone || '');
      const locParts = [
        userProfile.neighborhood,
        userProfile.city,
        userProfile.country,
      ]
        .filter(Boolean)
        .join(', ');
      setBuyerLocation(locParts);
    }
  }, [listing?.id, userProfile]);

  if (!listing) return null;

  const itemCurrency: CurrencyCode = listing.currency || 'EUR';
  const itemRegion = listing.region || 'europe';
  const isOwnListing = Boolean(user && listing.sellerId === user.uid);
  const isReservedForMe =
    listing.status === 'reserved' && Boolean(user && listing.buyerId === user.uid);
  const canBuy =
    !isOwnListing && (listing.status === 'available' || isReservedForMe);

  const agreedPrice =
    existingConversation?.offerStatus === 'accepted' &&
    existingConversation.offerPrice > 0
      ? existingConversation.offerPrice
      : listing.price;
  const protectionFee = Math.max(1, Math.round(agreedPrice * 0.04));
  const totalAmount = agreedPrice + protectionFee;

  const showConverted = itemCurrency !== displayCurrency;
  const convertedAgreed = showConverted
    ? convertCurrency(agreedPrice, itemCurrency, displayCurrency, rates)
    : agreedPrice;

  const buyerName =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Acheteur';

  const listingLocationLabel = [
    listing.neighborhood,
    listing.city,
    listing.country,
  ]
    .filter(Boolean)
    .join(', ');

  const syncBuyerContactToProfile = async (wa: string, loc: string) => {
    if (!user || !userProfile) return;
    const cleanWa = wa.trim();
    const cleanLoc = loc.trim();
    if (
      cleanWa !== (userProfile.whatsappNumber || '') ||
      (!userProfile.neighborhood && cleanLoc)
    ) {
      await updateProfileDetails({
        displayName: userProfile.displayName || buyerName,
        country: userProfile.country || 'France',
        city: userProfile.city || cleanLoc.split(',')[0]?.trim() || 'Paris',
        neighborhood: userProfile.neighborhood || cleanLoc,
        continent: userProfile.continent || 'europe',
        preferredCurrency: userProfile.preferredCurrency || displayCurrency,
        phone: userProfile.phone || cleanWa,
        whatsappNumber: cleanWa,
      });
    }
  };

  const handleTranslateListing = async () => {
    const targetName = `${languageMeta.label} (${languageMeta.nativeName})`;
    if (translatedDesc && translatedDesc.lang === languageCode) {
      setTranslatedDesc(null);
      return;
    }
    setTranslatingListing(true);
    setError(null);
    try {
      const combined = [
        `TITRE: ${listing.title}`,
        listing.itemSpecs ? `CARACTÉRISTIQUES: ${listing.itemSpecs}` : '',
        `DESCRIPTION: ${listing.description}`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await translateTextWithApi({
        text: combined,
        targetLanguage: targetName,
        context: 'second-hand product listing',
      });

      const lines = res.translatedText.split('\n');
      const titleLine =
        lines
          .find((l) => l.toUpperCase().startsWith('TITRE:') || l.includes(':'))
          ?.replace(/^[^:]+:\s*/, '') || listing.title;
      const specsLine =
        lines
          .find((l) => l.toUpperCase().startsWith('CARACT'))
          ?.replace(/^[^:]+:\s*/, '') || '';
      const descIdx = lines.findIndex((l) =>
        l.toUpperCase().startsWith('DESCRIPTION:')
      );
      const descText =
        descIdx >= 0
          ? lines
              .slice(descIdx)
              .join('\n')
              .replace(/^[^:]+:\s*/, '')
          : res.translatedText;

      setTranslatedDesc({
        lang: languageCode,
        detected: res.detectedLanguage,
        title: titleLine,
        specs: specsLine,
        description: descText,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de traduire l'annonce pour le moment."
      );
    } finally {
      setTranslatingListing(false);
    }
  };

  const handleOpenContact = async () => {
    if (!user) {
      await signIn();
      return;
    }
    if (buyerWhatsapp.replace(/\D/g, '').length >= 7 && buyerLocation.trim().length >= 2) {
      setError(null);
      setBusy(true);
      try {
        const convId = await startOrGetConversation(
          listing,
          user,
          buyerName,
          undefined,
          undefined,
          buyerWhatsapp,
          buyerLocation
        );
        onOpenConversation(convId);
        onClose();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de démarrer la conversation.'
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    setShowContactForm(true);
    setShowOfferForm(false);
    setShowCheckout(false);
  };

  const handleSubmitContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signIn();
      return;
    }
    if (buyerWhatsapp.replace(/\D/g, '').length < 7) {
      setError('Veuillez saisir un numéro WhatsApp valide avec indicatif.');
      return;
    }
    if (buyerLocation.trim().length < 2) {
      setError('Veuillez indiquer votre localisation (ville, pays / quartier).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await syncBuyerContactToProfile(buyerWhatsapp, buyerLocation);
      const convId = await startOrGetConversation(
        listing,
        user,
        buyerName,
        contactMessage.trim() || undefined,
        undefined,
        buyerWhatsapp,
        buyerLocation
      );
      onOpenConversation(convId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de démarrer la conversation.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signIn();
      return;
    }
    const amount = Number(offerValue);
    if (Number.isNaN(amount) || amount < 1 || amount > listing.price) {
      setError(
        `Saisissez un montant entre 1 et ${formatMoney(listing.price, itemCurrency)}.`
      );
      return;
    }
    if (buyerWhatsapp.replace(/\D/g, '').length < 7) {
      setError('Veuillez indiquer votre numéro WhatsApp pour votre offre.');
      return;
    }
    if (buyerLocation.trim().length < 2) {
      setError('Veuillez indiquer votre localisation (ville / quartier).');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await syncBuyerContactToProfile(buyerWhatsapp, buyerLocation);
      const convId = await startOrGetConversation(
        listing,
        user,
        buyerName,
        undefined,
        amount,
        buyerWhatsapp,
        buyerLocation
      );
      onOpenConversation(convId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible d'envoyer l'offre."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signIn();
      return;
    }

    if (buyerWhatsapp.replace(/\D/g, '').length < 7) {
      setError(
        'Votre numéro WhatsApp est requis pour coordonner la remise ou livraison.'
      );
      return;
    }
    if (buyerLocation.trim().length < 2) {
      setError('Votre localisation précise est requise pour finaliser la commande.');
      return;
    }

    let chosenProvider: PaymentProvider = oneOffProvider;
    let chosenSummary = '';

    const saved = paymentMethods.find((m) => m.id === selectedSavedMethodId);
    if (saved) {
      chosenProvider = saved.provider;
      chosenSummary = `${PAYMENT_PROVIDER_LABELS[saved.provider]} (${saved.maskedIdentifier})`;
    } else if (oneOffProvider === 'carte_bancaire') {
      const digits = cardLast4.replace(/\D/g, '');
      if (digits.length !== 4) {
        setError(
          'Indiquez les 4 derniers chiffres de votre carte ou enregistrez une carte dans Compte.'
        );
        return;
      }
      chosenSummary = `Carte bancaire •••• ${digits}`;
    } else {
      const digits = momoPhone.replace(/\D/g, '');
      if (digits.length < 7) {
        setError('Veuillez saisir un numéro Mobile Money valide.');
        return;
      }
      const head = digits.slice(0, 3);
      const tail = digits.slice(-2);
      chosenSummary = `${PAYMENT_PROVIDER_LABELS[oneOffProvider]} (${momoDialCode} ${head}••${tail})`;
    }

    setError(null);
    setBusy(true);
    try {
      await syncBuyerContactToProfile(buyerWhatsapp, buyerLocation);
      const orderId = await createOrderAtomic({
        listing,
        buyer: user,
        buyerName,
        buyerWhatsapp,
        buyerLocation,
        agreedPrice,
        paymentMethod: chosenProvider,
        paymentSummary: chosenSummary,
        deliveryMethod,
        handoffDetails:
          handoffDetails.trim() ||
          (deliveryMethod === 'remise_en_main_propre'
            ? `Remise en main propre à ${listing.city}`
            : `Livraison sécurisée vers ${buyerLocation}`),
        conversation: existingConversation,
      });
      onOrderCreated(orderId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la validation.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSellerStatusChange = async (
    nextStatus: 'available' | 'reserved' | 'sold'
  ) => {
    setError(null);
    setBusy(true);
    try {
      await updateListingStatus(listing.id, nextStatus, listing.buyerId || '');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de changer le statut.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setBusy(true);
    try {
      await deleteListing(listing.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de supprimer l'annonce."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141413]/55 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div className="bg-white border border-[#E4E4E0] rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-3.5 border-b border-[#E4E4E0] flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 text-xs text-[#64645F] truncate">
            <span>{CATEGORY_LABELS[listing.category]}</span>
            <span aria-hidden="true">·</span>
            <span>{CONTINENT_LABELS[itemRegion]}</span>
            <span aria-hidden="true">·</span>
            <span>{listingLocationLabel || listing.city}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-[#141413]">
              {LISTING_STATUS_LABELS[listing.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={translatingListing}
              onClick={() => void handleTranslateListing()}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                translatedDesc
                  ? 'bg-[#0F5132]/10 border-[#0F5132] text-[#0F5132]'
                  : 'border-[#E4E4E0] text-[#141413] hover:bg-[#F7F7F5]'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>
                {translatingListing
                  ? 'Traduction...'
                  : translatedDesc
                  ? 'Original'
                  : `Traduire (${languageMeta.nativeName})`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(listing)}
              aria-label={
                isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'
              }
              className={`w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                isFavorited
                  ? 'bg-[#0F5132] border-[#0F5132] text-white'
                  : 'border-[#E4E4E0] text-[#141413] hover:bg-[#F7F7F5]'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[#575752] hover:bg-[#F7F7F5] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left column: Image & seller location info */}
          <div className="md:col-span-6 p-6 bg-[#F7F7F5]/60 border-b md:border-b-0 md:border-r border-[#E4E4E0] space-y-5">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E4E4E0]">
              <SafeImage
                src={listing.imageUrl}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="pt-4 border-t border-[#E4E4E0] space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[#64645F] mb-0.5">
                    Vendeur particulier
                  </p>
                  <p className="text-sm font-semibold text-[#141413]">
                    {listing.sellerName}
                  </p>
                  <p className="text-xs text-[#575752] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                    <span>
                      {listingLocationLabel || listing.sellerCity} ·{' '}
                      {CONTINENT_LABELS[itemRegion]}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#64645F] mb-0.5">Remise</p>
                  <p className="text-xs font-medium text-[#141413]">
                    {DELIVERY_LABELS[listing.deliveryMode]}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-[#64645F] flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                <span>
                  Le numéro WhatsApp est échangé en privé dans la messagerie
                  sécurisée ou lors de la commande.
                </span>
              </p>
            </div>
          </div>

          {/* Right column: Item details, translation, checkout & negotiation */}
          <div className="md:col-span-6 p-6 flex flex-col justify-between gap-6">
            <div>
              <div className="text-xs text-[#64645F] mb-2">
                {CONDITION_LABELS[listing.condition]}
              </div>
              <h2
                id="pdp-title"
                className="font-display text-2xl font-semibold text-[#141413] leading-snug mb-3"
              >
                {translatedDesc ? translatedDesc.title : listing.title}
              </h2>

              <div className="mb-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                    {formatMoney(agreedPrice, itemCurrency)}
                  </span>
                  {agreedPrice !== listing.price && (
                    <span className="font-mono tabular-nums text-sm text-[#64645F] line-through">
                      {formatMoney(listing.price, itemCurrency)}
                    </span>
                  )}
                  {existingConversation?.offerStatus === 'accepted' && (
                    <span className="text-xs font-medium text-[#0F5132]">
                      Prix négocié accepté
                    </span>
                  )}
                </div>
                {showConverted && (
                  <p className="font-mono tabular-nums text-xs text-[#64645F] mt-1">
                    Équivalent indicatif : ≈{' '}
                    {formatMoney(convertedAgreed, displayCurrency)}
                  </p>
                )}
              </div>

              {(listing.itemSpecs || translatedDesc?.specs) && (
                <div className="mb-4 p-3 rounded-lg bg-[#F7F7F5] border border-[#E4E4E0]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64645F] mb-1">
                    Caractéristiques de l&apos;article
                  </p>
                  <p className="text-xs text-[#141413] leading-relaxed">
                    {translatedDesc?.specs || listing.itemSpecs}
                  </p>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm text-[#3A3A36] leading-relaxed whitespace-pre-line">
                  {translatedDesc ? translatedDesc.description : listing.description}
                </p>
                {translatedDesc && (
                  <p className="text-[11px] text-[#0F5132] mt-2">
                    Traduit automatiquement depuis {translatedDesc.detected} vers{' '}
                    {languageMeta.nativeName}.
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {error}
                </div>
              )}

              {/* Buyer Contact Form (when WhatsApp/location not yet filled on profile) */}
              {showContactForm && canBuy && (
                <form
                  onSubmit={handleSubmitContactForm}
                  className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E4E4E0] space-y-3 mb-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#141413]">
                      Vos coordonnées pour contacter le vendeur
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="text-xs text-[#64645F] hover:text-[#141413] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-buyer-location"
                      className="block text-xs font-medium text-[#141413] mb-1"
                    >
                      Votre localisation (Ville, Pays / Quartier) *
                    </label>
                    <input
                      id="contact-buyer-location"
                      type="text"
                      required
                      maxLength={BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX}
                      value={buyerLocation}
                      onChange={(e) => setBuyerLocation(e.target.value)}
                      placeholder="Ex. : Akwa, Douala, Cameroun"
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-buyer-wa"
                      className="block text-xs font-medium text-[#141413] mb-1"
                    >
                      Votre numéro WhatsApp *
                    </label>
                    <input
                      id="contact-buyer-wa"
                      type="tel"
                      required
                      maxLength={BLUEPRINT_LIMITS.WHATSAPP_MAX}
                      value={buyerWhatsapp}
                      onChange={(e) => setBuyerWhatsapp(e.target.value)}
                      placeholder="+237 6XX XX XX XX"
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs font-mono tabular-nums text-[#141413]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-buyer-msg"
                      className="block text-xs font-medium text-[#141413] mb-1"
                    >
                      Message initial (optionnel)
                    </label>
                    <input
                      id="contact-buyer-msg"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Bonjour, votre article est-il toujours disponible ?"
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 px-4 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer"
                  >
                    {busy ? 'Ouverture...' : 'Démarrer la discussion sécurisée'}
                  </button>
                </form>
              )}

              {/* Buyer Checkout Panel */}
              {showCheckout && canBuy && (
                <form
                  onSubmit={handleConfirmPurchase}
                  className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E4E4E0] space-y-4 mb-4"
                >
                  <div className="flex items-center justify-between text-sm font-semibold text-[#141413]">
                    <span>Paiement & Coordonnées acheteur</span>
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="text-xs font-normal text-[#64645F] hover:text-[#141413] cursor-pointer"
                    >
                      Retour
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#575752]">
                    <div className="flex justify-between">
                      <span>Prix convenu</span>
                      <span className="font-mono tabular-nums text-[#141413]">
                        {formatMoney(agreedPrice, itemCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Protection Dilservice (4%)</span>
                      <span className="font-mono tabular-nums text-[#141413]">
                        {formatMoney(protectionFee, itemCurrency)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#E4E4E0] flex justify-between text-sm font-semibold text-[#141413]">
                      <span>Total</span>
                      <span className="font-mono tabular-nums">
                        {formatMoney(totalAmount, itemCurrency)}
                      </span>
                    </div>
                  </div>

                  {/* Buyer Location & WhatsApp required for checkout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="checkout-buyer-loc"
                        className="block text-xs font-medium text-[#141413] mb-1"
                      >
                        Votre localisation *
                      </label>
                      <input
                        id="checkout-buyer-loc"
                        type="text"
                        required
                        maxLength={BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX}
                        value={buyerLocation}
                        onChange={(e) => setBuyerLocation(e.target.value)}
                        placeholder="Quartier, Ville, Pays"
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-buyer-wa"
                        className="block text-xs font-medium text-[#141413] mb-1"
                      >
                        Votre WhatsApp *
                      </label>
                      <input
                        id="checkout-buyer-wa"
                        type="tel"
                        required
                        maxLength={BLUEPRINT_LIMITS.WHATSAPP_MAX}
                        value={buyerWhatsapp}
                        onChange={(e) => setBuyerWhatsapp(e.target.value)}
                        placeholder="+237 / +33..."
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs font-mono tabular-nums text-[#141413]"
                      />
                    </div>
                  </div>

                  {/* Payment method choice */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#141413]">
                        Moyen de paiement
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onGoToPaymentVault();
                        }}
                        className="text-[11px] text-[#0F5132] hover:underline cursor-pointer"
                      >
                        Gérer mes cartes / MoMo
                      </button>
                    </div>

                    {paymentMethods.length > 0 && (
                      <div className="space-y-1.5">
                        {paymentMethods.map((m) => (
                          <label
                            key={m.id}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs cursor-pointer ${
                              selectedSavedMethodId === m.id
                                ? 'bg-white border-[#0F5132] text-[#141413]'
                                : 'bg-white/60 border-[#E4E4E0] text-[#575752]'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <input
                                type="radio"
                                name="payment-method"
                                checked={selectedSavedMethodId === m.id}
                                onChange={() => setSelectedSavedMethodId(m.id)}
                                className="accent-[#0F5132]"
                              />
                              <span className="font-medium truncate">
                                {m.label}
                              </span>
                            </span>
                            <span className="font-mono tabular-nums text-[11px] shrink-0">
                              {m.maskedIdentifier}
                            </span>
                          </label>
                        ))}

                        <label
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer ${
                            selectedSavedMethodId === 'one_off'
                              ? 'bg-white border-[#0F5132] text-[#141413]'
                              : 'bg-white/60 border-[#E4E4E0] text-[#575752]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment-method"
                            checked={selectedSavedMethodId === 'one_off'}
                            onChange={() => setSelectedSavedMethodId('one_off')}
                            className="accent-[#0F5132]"
                          />
                          <span>Utiliser une autre carte ou compte Mobile Money</span>
                        </label>
                      </div>
                    )}

                    {(paymentMethods.length === 0 ||
                      selectedSavedMethodId === 'one_off') && (
                      <div className="p-3 rounded-lg bg-white border border-[#E4E4E0] space-y-2.5">
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              'carte_bancaire',
                              'mtn_momo',
                              'orange_money',
                            ] as PaymentProvider[]
                          ).map((prov) => (
                            <button
                              key={prov}
                              type="button"
                              onClick={() => setOneOffProvider(prov)}
                              className={`px-2 py-2 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
                                oneOffProvider === prov
                                  ? 'bg-[#141413] text-white border-[#141413]'
                                  : 'bg-[#F7F7F5] text-[#141413] border-[#E4E4E0]'
                              }`}
                            >
                              {prov === 'carte_bancaire' ? (
                                <CreditCard className="w-3 h-3" />
                              ) : (
                                <Smartphone className="w-3 h-3" />
                              )}
                              <span className="truncate">
                                {PAYMENT_PROVIDER_LABELS[prov]}
                              </span>
                            </button>
                          ))}
                        </div>

                        {oneOffProvider === 'carte_bancaire' ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={cardLast4}
                            onChange={(e) =>
                              setCardLast4(e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="4 derniers chiffres de la carte (ex. 4242)"
                            className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs font-mono tabular-nums"
                          />
                        ) : (
                          <div className="grid grid-cols-5 gap-2">
                            <select
                              value={momoDialCode}
                              onChange={(e) => setMomoDialCode(e.target.value)}
                              className="col-span-2 px-2 py-2 rounded-lg border border-[#E4E4E0] text-xs bg-white"
                            >
                              {MOMO_COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.code} {c.country}
                                </option>
                              ))}
                            </select>
                            <input
                              type="tel"
                              value={momoPhone}
                              onChange={(e) => setMomoPhone(e.target.value)}
                              placeholder="N° Mobile Money"
                              className="col-span-3 px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs font-mono tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1.5">
                      Mode de réception
                    </label>
                    <select
                      value={deliveryMethod}
                      onChange={(e) =>
                        setDeliveryMethod(
                          e.target.value as
                            | 'remise_en_main_propre'
                            | 'livraison_securisee'
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]"
                    >
                      {listing.deliveryMode !== 'remise_en_main_propre' && (
                        <option value="livraison_securisee">
                          Livraison sécurisée avec suivi
                        </option>
                      )}
                      {listing.deliveryMode !== 'livraison_securisee' && (
                        <option value="remise_en_main_propre">
                          Remise en main propre ({listing.city})
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="handoff-note"
                      className="block text-xs font-medium text-[#141413] mb-1"
                    >
                      Précisions de livraison ou rendez-vous
                    </label>
                    <input
                      id="handoff-note"
                      type="text"
                      maxLength={BLUEPRINT_LIMITS.HANDOFF_DETAILS_MAX}
                      value={handoffDetails}
                      onChange={(e) => setHandoffDetails(e.target.value)}
                      placeholder={
                        deliveryMethod === 'remise_en_main_propre'
                          ? 'Ex. : Disponible en fin de journée'
                          : 'Ex. : Adresse / point relais souhaité'
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 px-4 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {busy
                      ? 'Confirmation en cours...'
                      : `Confirmer (${formatMoney(totalAmount, itemCurrency)})`}
                  </button>
                </form>
              )}

              {/* Offer Form with buyer WhatsApp & Location */}
              {showOfferForm && canBuy && !showCheckout && (
                <form
                  onSubmit={handleSubmitOffer}
                  className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E4E4E0] space-y-3 mb-4"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="offer-amount"
                      className="text-xs font-semibold text-[#141413]"
                    >
                      Proposer un prix ({itemCurrency})
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowOfferForm(false)}
                      className="text-xs text-[#64645F] hover:text-[#141413] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      maxLength={BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX}
                      value={buyerLocation}
                      onChange={(e) => setBuyerLocation(e.target.value)}
                      placeholder="Votre localisation (Ville, Pays)"
                      className="px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]"
                    />
                    <input
                      type="tel"
                      required
                      maxLength={BLUEPRINT_LIMITS.WHATSAPP_MAX}
                      value={buyerWhatsapp}
                      onChange={(e) => setBuyerWhatsapp(e.target.value)}
                      placeholder="Votre N° WhatsApp"
                      className="px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs font-mono tabular-nums text-[#141413]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      id="offer-amount"
                      type="number"
                      min={1}
                      max={listing.price}
                      required
                      value={offerValue}
                      onChange={(e) => setOfferValue(e.target.value)}
                      placeholder={String(Math.round(listing.price * 0.9))}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-sm font-mono tabular-nums"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer whitespace-nowrap"
                    >
                      Envoyer l&apos;offre
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-[#E4E4E0]">
              {isOwnListing ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-[#64645F]">
                    Ceci est votre annonce. Vous pouvez mettre à jour son statut ou
                    répondre aux acheteurs dans la messagerie.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {listing.status === 'available' && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditListing(listing);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#E4E4E0] rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                    )}

                    {listing.status === 'available' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSellerStatusChange('reserved')}
                        className="px-3.5 py-2 border border-[#E4E4E0] rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] cursor-pointer"
                      >
                        Marquer réservé
                      </button>
                    )}

                    {listing.status === 'reserved' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSellerStatusChange('available')}
                        className="px-3.5 py-2 border border-[#E4E4E0] rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] cursor-pointer"
                      >
                        Remettre disponible
                      </button>
                    )}

                    {listing.status !== 'sold' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSellerStatusChange('sold')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5132] text-white rounded-lg text-xs font-medium hover:bg-[#0B3D26] cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Marquer vendu
                      </button>
                    )}

                    {listing.status === 'available' && !confirmDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    )}

                    {listing.status === 'available' && confirmDelete && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete()}
                        className="px-3.5 py-2 bg-red-700 text-white rounded-lg text-xs font-medium hover:bg-red-800 cursor-pointer"
                      >
                        Confirmer la suppression
                      </button>
                    )}
                  </div>
                </div>
              ) : canBuy ? (
                <>
                  {!showCheckout && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          void signIn();
                        } else {
                          setShowCheckout(true);
                          setShowOfferForm(false);
                          setShowContactForm(false);
                        }
                      }}
                      className="w-full py-3 px-5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isReservedForMe
                          ? `Finaliser l'achat (${formatMoney(agreedPrice, itemCurrency)})`
                          : `Acheter maintenant (${formatMoney(agreedPrice, itemCurrency)})`}
                      </span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleOpenContact()}
                      className="py-2.5 px-4 border border-[#E4E4E0] bg-white text-[#141413] text-xs font-medium rounded-lg hover:bg-[#F7F7F5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Contacter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          void signIn();
                        } else {
                          setShowOfferForm((v) => !v);
                          setShowCheckout(false);
                          setShowContactForm(false);
                        }
                      }}
                      className="py-2.5 px-4 border border-[#E4E4E0] bg-white text-[#141413] text-xs font-medium rounded-lg hover:bg-[#F7F7F5] transition-colors cursor-pointer"
                    >
                      Faire une offre
                    </button>
                  </div>

                  <p className="flex items-center gap-1.5 text-xs text-[#64645F] pt-1">
                    <Lock className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                    <span>
                      Carte bancaire, MTN MoMo et Orange Money acceptés.
                    </span>
                  </p>
                </>
              ) : (
                <div className="p-3.5 rounded-lg bg-[#F7F7F5] border border-[#E4E4E0] text-xs text-[#575752]">
                  Cet article est actuellement{' '}
                  {LISTING_STATUS_LABELS[listing.status].toLowerCase()}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
