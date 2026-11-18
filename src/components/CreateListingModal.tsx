import React, { useEffect, useState } from 'react';
import { ImagePlus, MapPin, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { compressImageToDataUrl } from '../lib/firebase';
import {
  createListing,
  updateListingDetails,
} from '../services/marketplaceService';
import {
  BLUEPRINT_LIMITS,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  CONTINENT_LABELS,
  CURATED_TEMPLATES,
  CURRENCY_LIST,
  DELIVERY_LABELS,
  type ContinentRegion,
  type CurrencyCode,
  type DeliveryMode,
  type Listing,
  type ListingCategory,
  type ListingCondition,
} from '../types/marketplace';
import { SafeImage } from './SafeImage';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingListing?: Listing | null;
  initialTemplateIndex?: number | null;
  onSuccess?: (listingId: string) => void;
}

export function CreateListingModal({
  isOpen,
  onClose,
  editingListing,
  initialTemplateIndex,
  onSuccess,
}: CreateListingModalProps) {
  const { user, userProfile, signIn, updateProfileDetails } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemSpecs, setItemSpecs] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [region, setRegion] = useState<ContinentRegion>('europe');
  const [country, setCountry] = useState('France');
  const [city, setCity] = useState('Paris');
  const [neighborhood, setNeighborhood] = useState('');
  const [sellerWhatsapp, setSellerWhatsapp] = useState('');
  const [category, setCategory] = useState<ListingCategory>('mobilier');
  const [condition, setCondition] = useState<ListingCondition>('tres_bon_etat');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('les_deux');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSellerWhatsapp(userProfile?.whatsappNumber || userProfile?.phone || '');
    if (editingListing) {
      setTitle(editingListing.title);
      setDescription(editingListing.description);
      setItemSpecs(editingListing.itemSpecs || '');
      setPrice(String(editingListing.price));
      setCurrency(editingListing.currency || 'EUR');
      setRegion(editingListing.region || 'europe');
      setCountry(editingListing.country || userProfile?.country || 'France');
      setCity(editingListing.city);
      setNeighborhood(
        editingListing.neighborhood || userProfile?.neighborhood || ''
      );
      setCategory(editingListing.category);
      setCondition(editingListing.condition);
      setDeliveryMode(editingListing.deliveryMode);
      setImageUrl(editingListing.imageUrl);
    } else if (
      typeof initialTemplateIndex === 'number' &&
      CURATED_TEMPLATES[initialTemplateIndex]
    ) {
      const tpl = CURATED_TEMPLATES[initialTemplateIndex];
      setTitle(tpl.title);
      setDescription(tpl.description);
      setItemSpecs(tpl.itemSpecs);
      setPrice(String(tpl.price));
      setCurrency(tpl.currency);
      setRegion(tpl.region);
      setCountry(tpl.country);
      setCity(userProfile?.city || tpl.city);
      setNeighborhood(userProfile?.neighborhood || tpl.neighborhood);
      setCategory(tpl.category);
      setCondition(tpl.condition);
      setDeliveryMode(tpl.deliveryMode);
      setImageUrl(tpl.imageUrl);
    } else {
      setTitle('');
      setDescription('');
      setItemSpecs('');
      setPrice('');
      setCurrency(userProfile?.preferredCurrency || 'EUR');
      setRegion(userProfile?.continent || 'europe');
      setCountry(userProfile?.country || 'France');
      setCity(userProfile?.city || 'Paris');
      setNeighborhood(userProfile?.neighborhood || '');
      setCategory('mobilier');
      setCondition('tres_bon_etat');
      setDeliveryMode('les_deux');
      setImageUrl('');
    }
  }, [
    isOpen,
    editingListing,
    initialTemplateIndex,
    userProfile?.country,
    userProfile?.city,
    userProfile?.neighborhood,
    userProfile?.continent,
    userProfile?.preferredCurrency,
    userProfile?.whatsappNumber,
    userProfile?.phone,
  ]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageToDataUrl(file);
      setImageUrl(compressed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement de la photo.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signIn();
      return;
    }

    const cleanWa = sellerWhatsapp.trim();
    if (cleanWa.replace(/\D/g, '').length < 7) {
      setError(
        'Veuillez renseigner votre numéro WhatsApp (avec indicatif pays, ex. +237 ou +33) pour coordonner la remise avec les acheteurs.'
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const numericPrice = Number(price);
      const sellerName =
        userProfile?.displayName ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'Vendeur';
      const sellerCity = userProfile?.city || city;

      await updateProfileDetails({
        displayName: sellerName,
        country: country.trim() || userProfile?.country || 'France',
        city: city.trim() || sellerCity,
        neighborhood: neighborhood.trim(),
        continent: region,
        preferredCurrency: userProfile?.preferredCurrency || currency,
        phone: userProfile?.phone || cleanWa,
        whatsappNumber: cleanWa,
      });

      const payload = {
        title,
        description,
        itemSpecs,
        price: numericPrice,
        currency,
        region,
        country,
        category,
        condition,
        deliveryMode,
        city,
        neighborhood,
        imageUrl,
      };

      if (editingListing) {
        await updateListingDetails(
          editingListing.id,
          sellerName,
          city.trim() || sellerCity,
          payload
        );
        onSuccess?.(editingListing.id);
      } else {
        const newId = await createListing(
          user,
          sellerName,
          city.trim() || sellerCity,
          payload
        );
        onSuccess?.(newId);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer votre annonce."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141413]/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-listing-title"
    >
      <div className="bg-white border border-[#E4E4E0] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#E4E4E0] flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
          <h2
            id="create-listing-title"
            className="font-display text-xl font-semibold text-[#141413]"
          >
            {editingListing ? "Modifier l'annonce" : 'Déposer une annonce'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#575752] hover:bg-[#F7F7F5] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[#575752] mb-5 max-w-md mx-auto">
              Connectez-vous avec votre compte Google pour publier une annonce sur
              Dilservice et recevoir des messages sécurisés d&apos;acheteurs.
            </p>
            <button
              type="button"
              onClick={() => void signIn()}
              className="px-5 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] transition-colors cursor-pointer"
            >
              Continuer avec Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </div>
            )}

            {/* Photo upload & studio presets */}
            <div>
              <label className="block text-sm font-medium text-[#141413] mb-2">
                Photo de l&apos;article
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-[#E4E4E0] bg-[#EFECE6]">
                  <SafeImage
                    src={imageUrl}
                    alt={title || 'Aperçu du produit'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E4E4E0] rounded-lg text-sm font-medium text-[#141413] bg-[#F7F7F5] hover:bg-[#EFECE6] cursor-pointer transition-colors">
                    <ImagePlus className="w-4 h-4" />
                    <span>Importer une photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-xs text-[#64645F]">
                    Compression automatique sécurisée. Ou sélectionnez un visuel
                    d&apos;illustration :
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CURATED_TEMPLATES.map((tpl, idx) => (
                      <button
                        key={tpl.imageUrl}
                        type="button"
                        onClick={() => setImageUrl(tpl.imageUrl)}
                        title={tpl.title}
                        className={`aspect-square rounded-md overflow-hidden border cursor-pointer transition-opacity ${
                          imageUrl === tpl.imageUrl
                            ? 'border-[#0F5132] ring-2 ring-[#0F5132]/30'
                            : 'border-[#E4E4E0] opacity-75 hover:opacity-100'
                        }`}
                      >
                        <SafeImage
                          src={tpl.imageUrl}
                          alt={`Exemple ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="listing-title"
                  className="text-sm font-medium text-[#141413]"
                >
                  Titre de l&apos;annonce
                </label>
                <span className="text-xs font-mono tabular-nums text-[#64645F]">
                  {title.length}/{BLUEPRINT_LIMITS.LISTING_TITLE_MAX}
                </span>
              </div>
              <input
                id="listing-title"
                type="text"
                required
                minLength={BLUEPRINT_LIMITS.LISTING_TITLE_MIN}
                maxLength={BLUEPRINT_LIMITS.LISTING_TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. : Platine vinyle Technics SL-1200MK2 révisée"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="listing-price"
                  className="block text-sm font-medium text-[#141413] mb-1.5"
                >
                  Prix
                </label>
                <input
                  id="listing-price"
                  type="number"
                  required
                  min={BLUEPRINT_LIMITS.PRICE_MIN}
                  max={BLUEPRINT_LIMITS.PRICE_MAX}
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="250"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm font-mono tabular-nums text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label
                  htmlFor="listing-currency"
                  className="block text-sm font-medium text-[#141413] mb-1.5"
                >
                  Devise de vente
                </label>
                <select
                  id="listing-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
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
                  htmlFor="listing-category"
                  className="block text-sm font-medium text-[#141413] mb-1.5"
                >
                  Catégorie
                </label>
                <select
                  id="listing-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ListingCategory)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                >
                  {(Object.keys(CATEGORY_LABELS) as ListingCategory[]).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="listing-condition"
                  className="block text-sm font-medium text-[#141413] mb-1.5"
                >
                  État
                </label>
                <select
                  id="listing-condition"
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as ListingCondition)
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                >
                  {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map(
                    (cond) => (
                      <option key={cond} value={cond}>
                        {CONDITION_LABELS[cond]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="listing-delivery"
                  className="block text-sm font-medium text-[#141413] mb-1.5"
                >
                  Remise souhaitée
                </label>
                <select
                  id="listing-delivery"
                  value={deliveryMode}
                  onChange={(e) => setDeliveryMode(e.target.value as DeliveryMode)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                >
                  {(Object.keys(DELIVERY_LABELS) as DeliveryMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {DELIVERY_LABELS[mode]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seller Location + Private WhatsApp Block */}
            <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E4E4E0] space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#141413]">
                <MapPin className="w-4 h-4 text-[#0F5132]" />
                <span>Localisation de l&apos;article & Contact WhatsApp vendeur</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="listing-region"
                    className="block text-xs font-medium text-[#141413] mb-1"
                  >
                    Continent
                  </label>
                  <select
                    id="listing-region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value as ContinentRegion)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
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
                    htmlFor="listing-country"
                    className="block text-xs font-medium text-[#141413] mb-1"
                  >
                    Pays *
                  </label>
                  <input
                    id="listing-country"
                    type="text"
                    required
                    minLength={BLUEPRINT_LIMITS.COUNTRY_MIN}
                    maxLength={BLUEPRINT_LIMITS.COUNTRY_MAX}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Cameroun, France, Sénégal..."
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="listing-city"
                    className="block text-xs font-medium text-[#141413] mb-1"
                  >
                    Ville *
                  </label>
                  <input
                    id="listing-city"
                    type="text"
                    required
                    minLength={BLUEPRINT_LIMITS.CITY_MIN}
                    maxLength={BLUEPRINT_LIMITS.CITY_MAX}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Douala, Dakar, Paris..."
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="listing-neighborhood"
                    className="block text-xs font-medium text-[#141413] mb-1"
                  >
                    Quartier / Point de repère
                  </label>
                  <input
                    id="listing-neighborhood"
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX}
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex. : Bonapriso, Cocody, Bastille..."
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="listing-whatsapp"
                    className="flex items-center gap-1.5 text-xs font-medium text-[#141413] mb-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#0F5132]" />
                    <span>Numéro WhatsApp (privé) *</span>
                  </label>
                  <input
                    id="listing-whatsapp"
                    type="tel"
                    required
                    maxLength={BLUEPRINT_LIMITS.WHATSAPP_MAX}
                    value={sellerWhatsapp}
                    onChange={(e) => setSellerWhatsapp(e.target.value)}
                    placeholder="+237 6XX XX XX XX / +33 6..."
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E4E0] text-xs font-mono tabular-nums text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#64645F]">
                Votre numéro WhatsApp reste privé sur votre compte et n&apos;est
                partagé que dans vos conversations ou commandes sécurisées.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="listing-specs"
                  className="text-sm font-medium text-[#141413]"
                >
                  Caractéristiques de l&apos;article (marque, dimensions, accessoires)
                </label>
                <span className="text-xs font-mono tabular-nums text-[#64645F]">
                  {itemSpecs.length}/{BLUEPRINT_LIMITS.ITEM_SPECS_MAX}
                </span>
              </div>
              <input
                id="listing-specs"
                type="text"
                maxLength={BLUEPRINT_LIMITS.ITEM_SPECS_MAX}
                value={itemSpecs}
                onChange={(e) => setItemSpecs(e.target.value)}
                placeholder="Ex. : Marque Sony · 256 Go · Boîte et chargeur inclus"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white focus:outline-none focus:border-[#0F5132]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="listing-description"
                  className="text-sm font-medium text-[#141413]"
                >
                  Description détaillée de l&apos;article *
                </label>
                <span className="text-xs font-mono tabular-nums text-[#64645F]">
                  {description.length}/{BLUEPRINT_LIMITS.LISTING_DESC_MAX}
                </span>
              </div>
              <textarea
                id="listing-description"
                rows={4}
                required
                minLength={BLUEPRINT_LIMITS.LISTING_DESC_MIN}
                maxLength={BLUEPRINT_LIMITS.LISTING_DESC_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez précisément votre article : état réel, historique d'utilisation, défauts éventuels et accessoires fournis..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-white focus:outline-none focus:border-[#0F5132] resize-y"
              />
            </div>

            <div className="pt-3 border-t border-[#E4E4E0] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-[#575752] hover:text-[#141413] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Publication...'
                  : editingListing
                  ? 'Enregistrer les modifications'
                  : "Publier l'annonce"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
