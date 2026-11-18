import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Globe2,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AccountAndActivityView } from './components/AccountAndActivityView';
import { CreateListingModal } from './components/CreateListingModal';
import { CurrencyConverterView } from './components/CurrencyConverterView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ListingCard } from './components/ListingCard';
import { ListingDetailModal } from './components/ListingDetailModal';
import { MessagingCenter } from './components/MessagingCenter';
import { Navbar, type AppTab } from './components/Navbar';
import { SafeImage } from './components/SafeImage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import {
  BASELINE_EUR_RATES,
  fetchLiveEurRates,
  formatMoney,
} from './lib/currency';
import {
  seedStarterListings,
  subscribeToConversations,
  subscribeToFavorites,
  subscribeToListings,
  subscribeToOrders,
  subscribeToPaymentMethods,
  toggleFavorite,
} from './services/marketplaceService';
import {
  CATEGORY_LABELS,
  CONTINENT_LABELS,
  CURATED_TEMPLATES,
  CURRENCY_LIST,
  STUDIO_MEDIA,
  type ContinentRegion,
  type Conversation,
  type CurrencyCode,
  type Listing,
  type ListingCategory,
  type Order,
  type PaymentMethod,
} from './types/marketplace';

type SortOption = 'recent' | 'price_asc' | 'price_desc';

function DilserviceWorkspace() {
  const { user, userProfile, signIn, updateProfileDetails } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Multi-currency & multi-continent state
  const [rates, setRates] =
    useState<Record<CurrencyCode, number>>(BASELINE_EUR_RATES);
  const [ratesLabel, setRatesLabel] = useState('Taux de référence');
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('EUR');

  // Explore filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<
    ContinentRegion | 'all'
  >('all');
  const [selectedCategory, setSelectedCategory] = useState<
    ListingCategory | 'all'
  >('all');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Modals & selection
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [templateIndex, setTemplateIndex] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [seedingCatalog, setSeedingCatalog] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToListings((items) => {
      setListings(items);
      setListingsLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userProfile?.preferredCurrency) {
      setDisplayCurrency(userProfile.preferredCurrency);
    }
  }, [userProfile?.preferredCurrency]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      setConversations([]);
      setOrders([]);
      setPaymentMethods([]);
      return;
    }

    const unsubFav = subscribeToFavorites(user.uid, setFavoriteIds);
    const unsubConv = subscribeToConversations(user.uid, setConversations);
    const unsubOrders = subscribeToOrders(user.uid, setOrders);
    const unsubPay = subscribeToPaymentMethods(user.uid, setPaymentMethods);

    return () => {
      unsubFav();
      unsubConv();
      unsubOrders();
      unsubPay();
    };
  }, [user]);

  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    const res = await fetchLiveEurRates();
    setRates(res.rates);
    setRatesLabel(
      res.isLive ? `Mis à jour à ${res.updatedAt}` : 'Taux de référence'
    );
    setRefreshingRates(false);
  };

  const handleApplyDisplayCurrency = (nextCurrency: CurrencyCode) => {
    setDisplayCurrency(nextCurrency);
    if (user && userProfile) {
      void updateProfileDetails({
        displayName: userProfile.displayName,
        country: userProfile.country || 'France',
        city: userProfile.city,
        neighborhood: userProfile.neighborhood || '',
        continent: userProfile.continent || 'europe',
        preferredCurrency: nextCurrency,
        phone: userProfile.phone || '',
        whatsappNumber: userProfile.whatsappNumber || '',
      });
    }
  };

  const unreadMessagesCount = useMemo(() => {
    if (!user) return 0;
    return conversations.reduce((acc, conv) => {
      const count =
        conv.buyerId === user.uid ? conv.unreadByBuyer : conv.unreadBySeller;
      return acc + (count || 0);
    }, 0);
  }, [conversations, user]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = listings.filter((item) => {
      if (onlyAvailable && item.status !== 'available') return false;
      if (selectedRegion !== 'all' && (item.region || 'europe') !== selectedRegion)
        return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory)
        return false;
      if (q) {
        const hay =
          `${item.title} ${item.description} ${item.itemSpecs || ''} ${item.country || ''} ${item.city} ${item.neighborhood || ''} ${item.sellerName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') {
      return [...filtered].sort((a, b) => {
        const aRate = rates[a.currency || 'EUR'] || 1;
        const bRate = rates[b.currency || 'EUR'] || 1;
        return a.price / aRate - b.price / bRate;
      });
    }
    if (sortBy === 'price_desc') {
      return [...filtered].sort((a, b) => {
        const aRate = rates[a.currency || 'EUR'] || 1;
        const bRate = rates[b.currency || 'EUR'] || 1;
        return b.price / bRate - a.price / aRate;
      });
    }
    return filtered;
  }, [
    listings,
    onlyAvailable,
    selectedRegion,
    selectedCategory,
    searchQuery,
    sortBy,
    rates,
  ]);

  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedListingId) || null,
    [listings, selectedListingId]
  );

  const selectedListingConversation = useMemo(() => {
    if (!user || !selectedListing) return null;
    return (
      conversations.find(
        (c) => c.listingId === selectedListing.id && c.buyerId === user.uid
      ) || null
    );
  }, [conversations, selectedListing, user]);

  const handleToggleFavorite = async (listing: Listing) => {
    if (!user) {
      await signIn();
      return;
    }
    await toggleFavorite(user.uid, listing.id, favoriteIds.has(listing.id));
  };

  const handleOpenCreateModal = (tplIdx: number | null = null) => {
    setEditingListing(null);
    setTemplateIndex(tplIdx);
    setCreateModalOpen(true);
  };

  const handleSeedFromExplore = async () => {
    if (!user) {
      await signIn();
      return;
    }
    setSeedingCatalog(true);
    try {
      await seedStarterListings(
        user,
        userProfile?.displayName || user.displayName || 'Vendeur'
      );
      setBannerNotice(
        '5 annonces multi-continents (Europe, Afrique, Amériques) ont été publiées.'
      );
    } finally {
      setSeedingCatalog(false);
    }
  };

  const regions: { id: ContinentRegion | 'all'; label: string }[] = [
    { id: 'all', label: t.allContinents },
    { id: 'afrique', label: 'Afrique' },
    { id: 'europe', label: 'Europe' },
    { id: 'ameriques', label: 'Amériques' },
    { id: 'asie_oceanie', label: 'Asie & Océanie' },
  ];

  const categories: { id: ListingCategory | 'all'; label: string }[] = [
    { id: 'all', label: t.allCategories },
    { id: 'mobilier', label: 'Mobilier' },
    { id: 'electronique', label: 'Photo & Tech' },
    { id: 'audio', label: 'Audio' },
    { id: 'velo', label: 'Vélos' },
    { id: 'mode', label: 'Mode' },
    { id: 'maison', label: 'Maison' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#141413]">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadMessagesCount={unreadMessagesCount}
        onOpenCreateListing={() => handleOpenCreateModal(null)}
      />

      {bannerNotice && (
        <div className="bg-[#0F5132] text-white text-xs py-2 px-4">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
            <span>{bannerNotice}</span>
            <button
              type="button"
              onClick={() => setBannerNotice(null)}
              className="underline cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeTab === 'explore' && (
          <>
            {/* Editorial Split Hero */}
            <section className="border-b border-[#E4E4E0] bg-white">
              <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch">
                <div className="lg:col-span-6 px-4 sm:px-6 lg:pr-10 py-10 lg:py-16 flex flex-col justify-center">
                  <p className="text-xs font-medium text-[#0F5132] mb-3">
                    {t.heroEyebrow}
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-[#141413] leading-[1.12] [text-wrap:balance] mb-4">
                    {t.heroTitle}
                  </h1>
                  <p className="text-[15px] text-[#575752] leading-relaxed max-w-xl mb-7">
                    {t.heroSubtitle}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mb-8">
                    <a
                      href="#catalogue"
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] transition-colors whitespace-nowrap"
                    >
                      <span>{t.heroPrimaryCta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveTab('converter')}
                      className="inline-flex items-center gap-2 px-5 py-3 border border-[#E4E4E0] bg-[#F7F7F5] text-[#141413] text-sm font-medium rounded-lg hover:bg-[#EFECE6] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {t.heroSecondaryCta}
                    </button>
                  </div>

                  <div className="pt-5 border-t border-[#E4E4E0] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#64645F]">
                    <span className="inline-flex items-center gap-1.5 text-[#141413] font-medium">
                      <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
                      {t.heroTrustLeft}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t.heroTrustRight}</span>
                  </div>
                </div>

                <div className="lg:col-span-6 min-h-[260px] lg:min-h-[440px] bg-[#EFECE6]">
                  <SafeImage
                    src={STUDIO_MEDIA.hero}
                    alt="Collection d'objets d'occasion sélectionnés"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </section>

            {/* Search, Continent & Currency Filter Workspace Toolbar */}
            <section
              id="catalogue"
              className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-16"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E4E4E0]">
                {/* Search input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#64645F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E4E4E0] bg-white text-sm text-[#141413] focus:outline-none focus:border-[#0F5132]"
                  />
                </div>

                {/* Display currency, availability, sort */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]">
                    <Globe2 className="w-3.5 h-3.5 text-[#0F5132]" />
                    <label htmlFor="display-currency" className="text-[#64645F]">
                      {t.displayIn}
                    </label>
                    <select
                      id="display-currency"
                      value={displayCurrency}
                      onChange={(e) =>
                        handleApplyDisplayCurrency(e.target.value as CurrencyCode)
                      }
                      className="font-mono font-semibold text-[#141413] bg-transparent focus:outline-none cursor-pointer"
                    >
                      {CURRENCY_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlyAvailable((v) => !v)}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      onlyAvailable
                        ? 'bg-[#141413] text-white border-[#141413]'
                        : 'bg-white text-[#575752] border-[#E4E4E0] hover:text-[#141413]'
                    }`}
                  >
                    {onlyAvailable ? t.availableOnly : t.allListings}
                  </button>

                  <select
                    aria-label="Trier les annonces"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3.5 py-2 rounded-lg border border-[#E4E4E0] bg-white text-xs font-medium text-[#141413]"
                  >
                    <option value="recent">{t.sortRecent}</option>
                    <option value="price_asc">{t.sortPriceAsc}</option>
                    <option value="price_desc">{t.sortPriceDesc}</option>
                  </select>
                </div>
              </div>

              {/* Continent & Category Filter Strips */}
              <div className="py-4 space-y-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {regions.map((reg) => {
                    const active = selectedRegion === reg.id;
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => setSelectedRegion(reg.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#141413] text-white'
                            : 'bg-white border border-[#E4E4E0] text-[#575752] hover:text-[#141413]'
                        }`}
                      >
                        {reg.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {categories.map((cat) => {
                    const active = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0F5132] text-white'
                            : 'bg-white border border-[#E4E4E0] text-[#575752] hover:text-[#141413]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Listings Grid */}
              {listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white border border-[#E4E4E0] rounded-xl overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[4/3] bg-[#ECEAE4]" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 w-1/2 bg-[#ECEAE4] rounded" />
                        <div className="h-4 w-3/4 bg-[#ECEAE4] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorited={favoriteIds.has(listing.id)}
                      displayCurrency={displayCurrency}
                      rates={rates}
                      onToggleFavorite={handleToggleFavorite}
                      onSelect={(item) => setSelectedListingId(item.id)}
                    />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="mt-6 space-y-8">
                  <div className="bg-white border border-[#E4E4E0] rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-[#141413] mb-1.5">
                        Le catalogue international est prêt
                      </h2>
                      <p className="text-sm text-[#575752] max-w-xl">
                        Publiez votre propre objet ou initialisez la base avec 5
                        articles d&apos;exemple en Afrique, en Europe et en
                        Amérique du Nord.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 shrink-0">
                      <button
                        type="button"
                        disabled={seedingCatalog}
                        onClick={() => void handleSeedFromExplore()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E4E4E0] bg-[#F7F7F5] text-sm font-medium text-[#141413] rounded-lg hover:bg-[#EFECE6] cursor-pointer whitespace-nowrap"
                      >
                        <Sparkles className="w-4 h-4 text-[#0F5132]" />
                        <span>
                          {seedingCatalog
                            ? 'Publication...'
                            : 'Publier 5 articles d’exemple'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateModal(null)}
                        className="px-4 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer whitespace-nowrap"
                      >
                        Créer une annonce
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#141413] mb-4">
                      Modèles multi-continents prêts à publier
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {CURATED_TEMPLATES.map((tpl, idx) => (
                        <button
                          key={tpl.title}
                          type="button"
                          onClick={() => handleOpenCreateModal(idx)}
                          className="group bg-white border border-[#E4E4E0] rounded-xl overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-12px_rgba(20,20,19,0.14)] cursor-pointer flex flex-col"
                        >
                          <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden w-full">
                            <SafeImage
                              src={tpl.imageUrl}
                              alt={tpl.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between w-full">
                            <div>
                              <div className="text-xs text-[#64645F] mb-1.5">
                                {CATEGORY_LABELS[tpl.category]} ·{' '}
                                {CONTINENT_LABELS[tpl.region]} · {tpl.city}
                              </div>
                              <p className="text-[15px] font-semibold text-[#141413] line-clamp-2 mb-3">
                                {tpl.title}
                              </p>
                            </div>
                            <div className="pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-xs">
                              <span className="font-mono tabular-nums text-[15px] font-medium text-[#141413]">
                                {formatMoney(tpl.price, tpl.currency)}
                              </span>
                              <span className="text-[#0F5132] font-medium">
                                Utiliser ce modèle →
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#E4E4E0] rounded-xl p-10 text-center mt-4">
                  <p className="text-sm text-[#575752] mb-4">
                    Aucune annonce ne correspond à vos critères actuels.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedRegion('all');
                      setSelectedCategory('all');
                      setOnlyAvailable(false);
                    }}
                    className="px-4 py-2 border border-[#E4E4E0] rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] cursor-pointer"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'converter' && (
          <CurrencyConverterView
            rates={rates}
            ratesLabel={ratesLabel}
            onRefreshRates={handleRefreshRates}
            refreshingRates={refreshingRates}
            displayCurrency={displayCurrency}
            onApplyDisplayCurrency={handleApplyDisplayCurrency}
          />
        )}

        {activeTab === 'messages' && (
          <MessagingCenter
            conversations={conversations}
            listings={listings}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onOpenListing={(item) => setSelectedListingId(item.id)}
          />
        )}

        {(activeTab === 'activity' || activeTab === 'account') && (
          <AccountAndActivityView
            mode={activeTab}
            listings={listings}
            favoriteIds={favoriteIds}
            orders={orders}
            paymentMethods={paymentMethods}
            displayCurrency={displayCurrency}
            rates={rates}
            onToggleFavorite={handleToggleFavorite}
            onSelectListing={(item) => setSelectedListingId(item.id)}
            onOpenCreateListing={() => handleOpenCreateModal(null)}
          />
        )}
      </main>

      <footer className="border-t border-[#E4E4E0] bg-white py-8 px-4 sm:px-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#64645F]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-sm font-semibold text-[#141413]">
              Dilservice
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Afrique, Europe & International · Cartes bancaires, MTN MoMo &
              Orange Money
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Explorer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('converter')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Convertisseur
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Messagerie
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Paiements
            </button>
          </div>
        </div>
      </footer>

      <ListingDetailModal
        listing={selectedListing}
        isFavorited={
          selectedListing ? favoriteIds.has(selectedListing.id) : false
        }
        existingConversation={selectedListingConversation}
        displayCurrency={displayCurrency}
        rates={rates}
        paymentMethods={paymentMethods}
        onToggleFavorite={handleToggleFavorite}
        onClose={() => setSelectedListingId(null)}
        onOpenConversation={(convId) => {
          setSelectedConversationId(convId);
          setActiveTab('messages');
        }}
        onEditListing={(item) => {
          setEditingListing(item);
          setTemplateIndex(null);
          setCreateModalOpen(true);
        }}
        onOrderCreated={() => {
          setBannerNotice(
            'Votre achat est confirmé. Retrouvez le reçu et le suivi dans « Activité ».'
          );
          setActiveTab('activity');
        }}
        onGoToPaymentVault={() => setActiveTab('account')}
      />

      <CreateListingModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingListing(null);
          setTemplateIndex(null);
        }}
        editingListing={editingListing}
        initialTemplateIndex={templateIndex}
        onSuccess={() => {
          setBannerNotice(
            editingListing
              ? 'Votre annonce a bien été mise à jour.'
              : 'Votre annonce est maintenant en ligne sur Dilservice.'
          );
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <DilserviceWorkspace />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
