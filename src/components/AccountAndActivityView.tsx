import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Sparkles,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatMoney } from '../lib/currency';
import { WORLD_LANGUAGES } from '../lib/i18n';
import {
  seedStarterListings,
  updateOrderStatus,
} from '../services/marketplaceService';
import {
  BLUEPRINT_LIMITS,
  CONTINENT_LABELS,
  CURRENCY_LIST,
  DELIVERY_LABELS,
  ORDER_STATUS_LABELS,
  type ContinentRegion,
  type CurrencyCode,
  type Listing,
  type Order,
  type PaymentMethod,
} from '../types/marketplace';
import { ListingCard } from './ListingCard';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { SafeImage } from './SafeImage';

interface AccountAndActivityViewProps {
  mode: 'activity' | 'account';
  listings: Listing[];
  favoriteIds: Set<string>;
  orders: Order[];
  paymentMethods: PaymentMethod[];
  displayCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onToggleFavorite: (listing: Listing) => void;
  onSelectListing: (listing: Listing) => void;
  onOpenCreateListing: () => void;
}

function formatWaLink(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}`;
}

export function AccountAndActivityView({
  mode,
  listings,
  favoriteIds,
  orders,
  paymentMethods,
  displayCurrency,
  rates,
  onToggleFavorite,
  onSelectListing,
  onOpenCreateListing,
}: AccountAndActivityViewProps) {
  const {
    user,
    userProfile,
    authError,
    signingIn,
    signIn,
    signOut,
    updateProfileDetails,
  } = useAuth();
  const { languageCode, setLanguageCode, t } = useLanguage();

  const [activitySubTab, setActivitySubTab] = useState<
    'listings' | 'favorites' | 'orders'
  >('listings');
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('France');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [continent, setContinent] = useState<ContinentRegion>('europe');
  const [preferredCurrency, setPreferredCurrency] =
    useState<CurrencyCode>('EUR');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [trackingNoteByOrder, setTrackingNoteByOrder] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setCountry(userProfile.country || 'France');
      setCity(userProfile.city || '');
      setNeighborhood(userProfile.neighborhood || '');
      setContinent(userProfile.continent || 'europe');
      setPreferredCurrency(userProfile.preferredCurrency || 'EUR');
      setPhone(userProfile.phone || '');
      setWhatsappNumber(userProfile.whatsappNumber || userProfile.phone || '');
    }
  }, [userProfile]);

  if (!user) {
    return (
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#E4E4E0] rounded-xl p-10 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-lg bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#141413] mb-2">
            {mode === 'activity' ? t.activityTitle : t.accountTitle}
          </h1>
          <p className="text-sm text-[#575752] leading-relaxed mb-6">
            Connectez-vous avec Google pour gérer vos annonces, votre
            localisation, votre numéro WhatsApp, vos cartes bancaires, MTN MoMo
            et Orange Money.
          </p>
          {authError && (
            <p className="text-xs text-red-700 mb-4">{authError}</p>
          )}
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void signIn()}
            className="px-5 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {signingIn ? 'Connexion...' : 'Continuer avec Google'}
          </button>
        </div>
      </section>
    );
  }

  const myListings = listings.filter((l) => l.sellerId === user.uid);
  const favoriteListings = listings.filter((l) => favoriteIds.has(l.id));

  const handleSeedDemo = async () => {
    setActionError(null);
    setSeeding(true);
    try {
      await seedStarterListings(
        user,
        userProfile?.displayName || user.displayName || 'Vendeur'
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Impossible de publier les annonces de démonstration.'
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await updateProfileDetails({
        displayName,
        country,
        city,
        neighborhood,
        continent,
        preferredCurrency,
        phone,
        whatsappNumber,
      });
      setProfileSaved(true);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Impossible de mettre à jour le profil.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOrderTransition = async (
    order: Order,
    nextStatus: 'shipped' | 'completed' | 'cancelled'
  ) => {
    setActionError(null);
    try {
      const sellerLoc = [
        userProfile?.neighborhood,
        userProfile?.city,
        userProfile?.country,
      ]
        .filter(Boolean)
        .join(', ');
      await updateOrderStatus(
        order.id,
        nextStatus,
        trackingNoteByOrder[order.id] ?? order.handoffDetails,
        nextStatus === 'shipped'
          ? {
              sellerWhatsapp:
                userProfile?.whatsappNumber ||
                userProfile?.phone ||
                order.sellerWhatsapp ||
                '',
              sellerLocation: sellerLoc || order.sellerLocation || '',
            }
          : undefined
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Erreur sur la commande.'
      );
    }
  };

  if (mode === 'activity') {
    return (
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413]">
              {t.activityTitle}
            </h1>
            <p className="text-sm text-[#575752] mt-1">{t.activitySubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {myListings.length === 0 && (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedDemo()}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E4E4E0] bg-white text-xs sm:text-sm font-medium text-[#141413] rounded-lg hover:bg-[#F7F7F5] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#0F5132]" />
                <span>
                  {seeding
                    ? 'Publication...'
                    : 'Charger 5 articles d’exemple'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenCreateListing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F5132] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle annonce</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation segmented buttons */}
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-[#E4E4E0] rounded-lg">
          <button
            type="button"
            onClick={() => setActivitySubTab('listings')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activitySubTab === 'listings'
                ? 'bg-[#0F5132] text-white'
                : 'text-[#575752] hover:text-[#141413]'
            }`}
          >
            Mes annonces ({myListings.length})
          </button>
          <button
            type="button"
            onClick={() => setActivitySubTab('favorites')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activitySubTab === 'favorites'
                ? 'bg-[#0F5132] text-white'
                : 'text-[#575752] hover:text-[#141413]'
            }`}
          >
            Favoris ({favoriteListings.length})
          </button>
          <button
            type="button"
            onClick={() => setActivitySubTab('orders')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activitySubTab === 'orders'
                ? 'bg-[#0F5132] text-white'
                : 'text-[#575752] hover:text-[#141413]'
            }`}
          >
            Commandes ({orders.length})
          </button>
        </div>

        {actionError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {actionError}
          </div>
        )}

        {activitySubTab === 'listings' && (
          <>
            {myListings.length === 0 ? (
              <div className="bg-white border border-[#E4E4E0] rounded-xl p-12 text-center">
                <Package className="w-8 h-8 text-[#64645F] mx-auto mb-3 opacity-70" />
                <h2 className="font-display text-xl font-semibold text-[#141413] mb-1.5">
                  Vous n&apos;avez pas encore publié d&apos;annonce
                </h2>
                <p className="text-sm text-[#575752] max-w-md mx-auto">
                  Déposez un article ou chargez 5 annonces d&apos;exemple
                  multi-continents (Europe, Afrique, Amériques).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isFavorited={favoriteIds.has(listing.id)}
                    displayCurrency={displayCurrency}
                    rates={rates}
                    onToggleFavorite={onToggleFavorite}
                    onSelect={onSelectListing}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activitySubTab === 'favorites' && (
          <>
            {favoriteListings.length === 0 ? (
              <div className="bg-white border border-[#E4E4E0] rounded-xl p-12 text-center text-sm text-[#575752]">
                Aucun favori enregistré pour le moment. Cliquez sur le cœur
                d&apos;une annonce pour la sauvegarder ici.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isFavorited={true}
                    displayCurrency={displayCurrency}
                    rates={rates}
                    onToggleFavorite={onToggleFavorite}
                    onSelect={onSelectListing}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activitySubTab === 'orders' && (
          <>
            {orders.length === 0 ? (
              <div className="bg-white border border-[#E4E4E0] rounded-xl p-8 text-sm text-[#64645F]">
                Aucune commande enregistrée pour l&apos;instant.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isBuyer = order.buyerId === user.uid;
                  const orderCurrency: CurrencyCode = order.currency || 'EUR';
                  const isTerminal =
                    order.status === 'completed' || order.status === 'cancelled';
                  const buyerWaLink = formatWaLink(order.buyerWhatsapp);
                  const sellerWaLink = formatWaLink(order.sellerWhatsapp);

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-[#E4E4E0] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E4E4E0] shrink-0">
                          <SafeImage
                            src={order.listingImageUrl}
                            alt={order.listingTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64645F]">
                            <span className="font-semibold text-[#141413]">
                              {isBuyer ? 'Achat' : 'Vente'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{DELIVERY_LABELS[order.deliveryMethod]}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#0F5132]">
                              {ORDER_STATUS_LABELS[order.status]}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-[#141413]">
                            {order.listingTitle}
                          </h3>
                          <p className="text-xs text-[#575752]">
                            {isBuyer
                              ? `Vendeur : ${order.sellerName}`
                              : `Acheteur : ${order.buyerName}`}{' '}
                            · Total :{' '}
                            <span className="font-mono tabular-nums font-medium text-[#141413]">
                              {formatMoney(order.totalAmount, orderCurrency)}
                            </span>
                            {order.paymentSummary
                              ? ` · Payé via ${order.paymentSummary}`
                              : ''}
                          </p>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#575752] pt-1">
                            {(order.sellerLocation || order.sellerWhatsapp) && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#0F5132]" />
                                Vendeur : {order.sellerLocation || '—'}
                                {order.sellerWhatsapp && (
                                  <>
                                    {' · '}
                                    {sellerWaLink ? (
                                      <a
                                        href={sellerWaLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-[#0F5132] hover:underline"
                                      >
                                        WA {order.sellerWhatsapp}
                                      </a>
                                    ) : (
                                      <span className="font-mono">
                                        {order.sellerWhatsapp}
                                      </span>
                                    )}
                                  </>
                                )}
                              </span>
                            )}
                            {(order.buyerLocation || order.buyerWhatsapp) && (
                              <span className="inline-flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 text-[#0F5132]" />
                                Acheteur : {order.buyerLocation || '—'}
                                {order.buyerWhatsapp && (
                                  <>
                                    {' · '}
                                    {buyerWaLink ? (
                                      <a
                                        href={buyerWaLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-[#0F5132] hover:underline"
                                      >
                                        WA {order.buyerWhatsapp}
                                      </a>
                                    ) : (
                                      <span className="font-mono">
                                        {order.buyerWhatsapp}
                                      </span>
                                    )}
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          {order.handoffDetails && (
                            <p className="text-xs text-[#64645F]">
                              Note : {order.handoffDetails}
                            </p>
                          )}
                        </div>
                      </div>

                      {!isTerminal && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isBuyer && order.status === 'pending_handoff' && (
                            <>
                              <input
                                type="text"
                                placeholder="N° de suivi ou lieu de remise"
                                value={trackingNoteByOrder[order.id] ?? ''}
                                onChange={(e) =>
                                  setTrackingNoteByOrder((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value,
                                  }))
                                }
                                className="px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs w-48"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void handleOrderTransition(order, 'shipped')
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Marquer expédié
                              </button>
                            </>
                          )}

                          {isBuyer &&
                            (order.status === 'pending_handoff' ||
                              order.status === 'shipped') && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleOrderTransition(order, 'completed')
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Confirmer la réception
                              </button>
                            )}

                          {order.status === 'pending_handoff' && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleOrderTransition(order, 'cancelled')
                              }
                              className="px-3.5 py-2 border border-[#E4E4E0] text-xs font-medium text-[#575752] rounded-lg hover:text-red-700 hover:border-red-200 cursor-pointer"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    );
  }

  // Account + Payment Methods mode
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413]">
            {t.accountTitle}
          </h1>
          <p className="text-sm text-[#575752] mt-1">{t.accountSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#E4E4E0] bg-white rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Profile, location, WhatsApp, language & currency preferences */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-6 bg-white border border-[#E4E4E0] rounded-xl p-6 space-y-5"
        >
          <h2 className="font-display text-xl font-semibold text-[#141413]">
            Informations, Localisation & WhatsApp
          </h2>

          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {actionError}
            </div>
          )}
          {profileSaved && (
            <div className="p-3 rounded-lg bg-[#0F5132]/10 border border-[#0F5132]/20 text-xs text-[#0F5132] font-medium">
              Votre profil, localisation et numéro WhatsApp ont été enregistrés.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#64645F] mb-1">
              Adresse e-mail vérifiée (privée)
            </label>
            <input
              type="text"
              disabled
              value={user.email || ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] bg-[#F7F7F5] text-sm text-[#64645F]"
            />
          </div>

          <div>
            <label
              htmlFor="account-display-name"
              className="block text-sm font-medium text-[#141413] mb-1.5"
            >
              Nom affiché (vendeur / acheteur)
            </label>
            <input
              id="account-display-name"
              type="text"
              required
              minLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MIN}
              maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="account-language"
                className="block text-sm font-medium text-[#141413] mb-1.5"
              >
                Langue de l&apos;application
              </label>
              <select
                id="account-language"
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white"
              >
                {WORLD_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} — {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="account-currency"
                className="block text-sm font-medium text-[#141413] mb-1.5"
              >
                Devise préférée
              </label>
              <select
                id="account-currency"
                value={preferredCurrency}
                onChange={(e) =>
                  setPreferredCurrency(e.target.value as CurrencyCode)
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white"
              >
                {CURRENCY_LIST.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.code} ({cur.symbol}) — {cur.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="account-continent"
                className="block text-sm font-medium text-[#141413] mb-1.5"
              >
                Continent
              </label>
              <select
                id="account-continent"
                value={continent}
                onChange={(e) =>
                  setContinent(e.target.value as ContinentRegion)
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white"
              >
                {(Object.keys(CONTINENT_LABELS) as ContinentRegion[]).map(
                  (reg) => (
                    <option key={reg} value={reg}>
                      {CONTINENT_LABELS[reg]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="account-country"
                className="block text-sm font-medium text-[#141413] mb-1.5"
              >
                Pays
              </label>
              <input
                id="account-country"
                type="text"
                maxLength={BLUEPRINT_LIMITS.COUNTRY_MAX}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Cameroun, France..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413]"
              />
            </div>

            <div>
              <label
                htmlFor="account-city"
                className="block text-sm font-medium text-[#141413] mb-1.5"
              >
                Ville
              </label>
              <input
                id="account-city"
                type="text"
                maxLength={BLUEPRINT_LIMITS.CITY_MAX}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Douala, Paris..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="account-neighborhood"
              className="block text-sm font-medium text-[#141413] mb-1.5"
            >
              Quartier / Point de repère
            </label>
            <input
              id="account-neighborhood"
              type="text"
              maxLength={BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX}
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Ex. : Bonapriso, Plateau, Bastille..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="account-whatsapp"
                className="block text-sm font-medium text-[#141413] mb-1.5"
              >
                Numéro WhatsApp (vendeur / acheteur)
              </label>
              <input
                id="account-whatsapp"
                type="tel"
                maxLength={BLUEPRINT_LIMITS.WHATSAPP_MAX}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+237 6XX XX XX XX"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm font-mono tabular-nums text-[#141413]"
              />
            </div>

            <div>
              <label
                htmlFor="account-phone"
                className="block text-sm font-medium text-[#141413] mb-1.5"
              >
                Téléphone secondaire (privé)
              </label>
              <input
                id="account-phone"
                type="tel"
                maxLength={BLUEPRINT_LIMITS.PHONE_MAX}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 / +33..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm font-mono tabular-nums text-[#141413]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] disabled:opacity-60 cursor-pointer"
            >
              {savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>
        </form>

        {/* Right: Payment Methods (Cartes bancaires, MTN MoMo, Orange Money) */}
        <div className="lg:col-span-6">
          <PaymentMethodsPanel
            userId={user.uid}
            defaultHolderName={
              userProfile?.displayName || user.displayName || 'Titulaire'
            }
            paymentMethods={paymentMethods}
          />
        </div>
      </div>
    </section>
  );
}
