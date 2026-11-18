import type { Timestamp } from 'firebase/firestore';

export type ContinentRegion =
  | 'afrique'
  | 'europe'
  | 'ameriques'
  | 'asie_oceanie';

export type CurrencyCode =
  | 'EUR'
  | 'XAF'
  | 'XOF'
  | 'MAD'
  | 'NGN'
  | 'KES'
  | 'ZAR'
  | 'GBP'
  | 'CHF'
  | 'USD'
  | 'CAD';

export type PaymentProvider = 'carte_bancaire' | 'mtn_momo' | 'orange_money';

export type ListingCategory =
  | 'mobilier'
  | 'electronique'
  | 'mode'
  | 'velo'
  | 'audio'
  | 'livres'
  | 'maison'
  | 'autre';

export type ListingCondition =
  | 'neuf_etiquette'
  | 'tres_bon_etat'
  | 'bon_etat'
  | 'etat_satisfaisant';

export type DeliveryMode =
  | 'remise_en_main_propre'
  | 'livraison_securisee'
  | 'les_deux';

export type ListingStatus = 'available' | 'reserved' | 'sold';

export type OfferStatus = 'none' | 'pending' | 'accepted' | 'declined';

export type MessageType =
  | 'text'
  | 'offer'
  | 'offer_accepted'
  | 'offer_declined'
  | 'system';

export type OrderStatus =
  | 'pending_handoff'
  | 'shipped'
  | 'completed'
  | 'cancelled';

/**
 * Exact validation constants synchronized with firebase-blueprint.json & firestore.rules
 */
export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX: 128,
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 80,
  COUNTRY_MIN: 2,
  COUNTRY_MAX: 80,
  CITY_MIN: 2,
  CITY_MAX: 80,
  NEIGHBORHOOD_MAX: 120,
  PHONE_MAX: 30,
  WHATSAPP_MAX: 30,
  LOCATION_SUMMARY_MAX: 160,
  PHOTO_URL_MAX: 500,
  LISTING_TITLE_MIN: 3,
  LISTING_TITLE_MAX: 120,
  LISTING_DESC_MIN: 10,
  LISTING_DESC_MAX: 2000,
  ITEM_SPECS_MAX: 300,
  PRICE_MIN: 1,
  PRICE_MAX: 100000000,
  IMAGE_URL_MAX: 350000,
  LAST_MESSAGE_MAX: 500,
  MESSAGE_TEXT_MIN: 1,
  MESSAGE_TEXT_MAX: 1500,
  HANDOFF_DETAILS_MAX: 240,
  PAYMENT_LABEL_MAX: 80,
  PAYMENT_IDENTIFIER_MAX: 40,
} as const;

export const CONTINENT_LABELS: Record<ContinentRegion, string> = {
  afrique: 'Afrique',
  europe: 'Europe',
  ameriques: 'Amériques',
  asie_oceanie: 'Asie & Océanie',
};

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  regionLabel: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    regionLabel: 'Europe',
    decimals: 2,
  },
  XAF: {
    code: 'XAF',
    symbol: 'FCFA',
    name: 'Franc CFA (BEAC)',
    regionLabel: 'Afrique Centrale',
    decimals: 0,
  },
  XOF: {
    code: 'XOF',
    symbol: 'FCFA',
    name: 'Franc CFA (BCEAO)',
    regionLabel: 'Afrique de l’Ouest',
    decimals: 0,
  },
  MAD: {
    code: 'MAD',
    symbol: 'DH',
    name: 'Dirham marocain',
    regionLabel: 'Afrique du Nord',
    decimals: 2,
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Naira nigérian',
    regionLabel: 'Afrique de l’Ouest',
    decimals: 0,
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Shilling kényan',
    regionLabel: 'Afrique de l’Est',
    decimals: 0,
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'Rand sud-africain',
    regionLabel: 'Afrique Australe',
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Livre sterling',
    regionLabel: 'Royaume-Uni',
    decimals: 2,
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Franc suisse',
    regionLabel: 'Suisse',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dollar américain',
    regionLabel: 'Amériques / International',
    decimals: 2,
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Dollar canadien',
    regionLabel: 'Amérique du Nord',
    decimals: 2,
  },
};

export const CURRENCY_LIST: CurrencyMeta[] = Object.values(CURRENCIES);

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  carte_bancaire: 'Carte bancaire',
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
};

export const MOMO_COUNTRIES: { code: string; country: string }[] = [
  { code: '+237', country: 'Cameroun' },
  { code: '+225', country: "Côte d'Ivoire" },
  { code: '+221', country: 'Sénégal' },
  { code: '+229', country: 'Bénin' },
  { code: '+228', country: 'Togo' },
  { code: '+223', country: 'Mali' },
  { code: '+226', country: 'Burkina Faso' },
  { code: '+242', country: 'Congo' },
  { code: '+241', country: 'Gabon' },
  { code: '+224', country: 'Guinée' },
  { code: '+233', country: 'Ghana' },
  { code: '+250', country: 'Rwanda' },
  { code: '+256', country: 'Ouganda' },
  { code: '+212', country: 'Maroc' },
  { code: '+261', country: 'Madagascar' },
  { code: '+33', country: 'France' },
];

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  mobilier: 'Mobilier',
  electronique: 'Photo & Tech',
  mode: 'Mode',
  velo: 'Vélos',
  audio: 'Audio & Vinyles',
  livres: 'Livres & Art',
  maison: 'Maison',
  autre: 'Autre',
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  neuf_etiquette: 'Neuf avec étiquette',
  tres_bon_etat: 'Très bon état',
  bon_etat: 'Bon état',
  etat_satisfaisant: 'État satisfaisant',
};

export const DELIVERY_LABELS: Record<DeliveryMode, string> = {
  remise_en_main_propre: 'Remise en main propre',
  livraison_securisee: 'Livraison sécurisée',
  les_deux: 'Main propre ou livraison',
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  sold: 'Vendu',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_handoff: 'En attente de remise',
  shipped: 'Expédié',
  completed: 'Reçu et clôturé',
  cancelled: 'Annulé',
};

export interface PublicProfile {
  uid: string;
  displayName: string;
  city: string;
  photoURL: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  country?: string;
  city: string;
  neighborhood?: string;
  continent?: ContinentRegion;
  preferredCurrency?: CurrencyCode;
  phone: string;
  whatsappNumber?: string;
  photoURL: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  provider: PaymentProvider;
  label: string;
  holderName: string;
  maskedIdentifier: string;
  cardBrand: string;
  expiry: string;
  countryDialCode: string;
  isDefault: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerCity: string;
  title: string;
  description: string;
  itemSpecs?: string;
  price: number;
  currency?: CurrencyCode;
  region?: ContinentRegion;
  country?: string;
  category: ListingCategory;
  condition: ListingCondition;
  deliveryMode: DeliveryMode;
  city: string;
  neighborhood?: string;
  imageUrl: string;
  status: ListingStatus;
  buyerId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  currency?: CurrencyCode;
  listingImageUrl: string;
  buyerId: string;
  buyerName: string;
  buyerWhatsapp?: string;
  buyerLocation?: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp?: string;
  sellerLocation?: string;
  lastMessage: string;
  lastSenderId: string;
  offerPrice: number;
  offerStatus: OfferStatus;
  unreadByBuyer: number;
  unreadBySeller: number;
  status: 'open' | 'closed';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  buyerId: string;
  sellerId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
  offerAmount: number;
  createdAt: Timestamp | null;
}

export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl: string;
  buyerId: string;
  buyerName: string;
  buyerWhatsapp?: string;
  buyerLocation?: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp?: string;
  sellerLocation?: string;
  currency?: CurrencyCode;
  agreedPrice: number;
  protectionFee: number;
  totalAmount: number;
  paymentMethod?: PaymentProvider;
  paymentSummary?: string;
  deliveryMethod: 'remise_en_main_propre' | 'livraison_securisee';
  handoffDetails: string;
  status: OrderStatus;
  conversationId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export const STUDIO_MEDIA = {
  hero: '/src/assets/images/hero_secondhand_atelier_1794987469658.jpg',
  camera: '/src/assets/images/item_leica_camera_1794987470574.jpg',
  armchair: '/src/assets/images/item_leather_armchair_1794987470478.jpg',
  bicycle: '/src/assets/images/item_road_bicycle_1794987471456.jpg',
  turntable: '/src/assets/images/item_turntable_audio_1794987472106.jpg',
  coat: '/src/assets/images/item_linen_coat_1794987472672.jpg',
} as const;

export interface CuratedTemplate {
  title: string;
  description: string;
  itemSpecs: string;
  price: number;
  currency: CurrencyCode;
  region: ContinentRegion;
  country: string;
  category: ListingCategory;
  condition: ListingCondition;
  deliveryMode: DeliveryMode;
  city: string;
  neighborhood: string;
  imageUrl: string;
}

export const CURATED_TEMPLATES: CuratedTemplate[] = [
  {
    title: 'Appareil télémétrique argentique 35mm + 50mm f/2',
    description:
      'Boîtier argentique mécanique révisé en atelier, télémètre net et contrasté, vitesses exactes. Vendu avec optique 50mm f/2 propre sans champignons ni rayures, bouchon avant et sangle cuir.',
    itemSpecs: 'Format 35mm · Objectif 50mm f/2 · Révisé 2025 · Poids 740g',
    price: 1290,
    currency: 'EUR',
    region: 'europe',
    country: 'France',
    category: 'electronique',
    condition: 'tres_bon_etat',
    deliveryMode: 'les_deux',
    city: 'Paris',
    neighborhood: '11e · Bastille / Rue de la Roquette',
    imageUrl: STUDIO_MEDIA.camera,
  },
  {
    title: 'Fauteuil lounge cuir cognac et structure acier brossé',
    description:
      'Fauteuil bas des années 1980 en cuir pleine fleur cognac avec patine homogène et structure tubulaire en acier brossé. Assise ferme et très confortable, aucune déchirure ni affaissement.',
    itemSpecs: 'Cuir pleine fleur · Acier brossé · Dim. 78 x 82 x 74 cm',
    price: 380000,
    currency: 'XAF',
    region: 'afrique',
    country: 'Cameroun',
    category: 'mobilier',
    condition: 'tres_bon_etat',
    deliveryMode: 'remise_en_main_propre',
    city: 'Douala',
    neighborhood: 'Bonapriso · Rue des Cocotiers',
    imageUrl: STUDIO_MEDIA.armchair,
  },
  {
    title: 'Vélo de route cadre acier Columbus vert anglais (56 cm)',
    description:
      'Vélo de course classique entretenu avec soin : cadre acier brasé taille 56, selle cuir Brooks, transmission révisée, câbles et gaines neufs. Prêt à rouler immédiatement.',
    itemSpecs: 'Cadre 56 cm (1m75–1m85) · 14 vitesses · Selle Brooks B17',
    price: 540,
    currency: 'EUR',
    region: 'europe',
    country: 'Belgique',
    category: 'velo',
    condition: 'bon_etat',
    deliveryMode: 'remise_en_main_propre',
    city: 'Bruxelles',
    neighborhood: 'Ixelles · Place Flagey',
    imageUrl: STUDIO_MEDIA.bicycle,
  },
  {
    title: 'Platine vinyle hi-fi noyer et aluminium brossé',
    description:
      'Platine à entraînement par courroie avec socle en noyer massif et plateau lourd en aluminium. Cellule récente (moins de 40 heures d’écoute), fonctionnement silencieux et précis.',
    itemSpecs: '33/45 tours · Cellule Ortofon · Capot acrylique inclus',
    price: 275000,
    currency: 'XOF',
    region: 'afrique',
    country: "Côte d'Ivoire",
    category: 'audio',
    condition: 'tres_bon_etat',
    deliveryMode: 'les_deux',
    city: 'Abidjan',
    neighborhood: 'Cocody · Riviera Golf',
    imageUrl: STUDIO_MEDIA.turntable,
  },
  {
    title: 'Manteau droit 100% laine vierge camel — Taille M',
    description:
      'Manteau croisé en laine vierge épaisse coloris camel, doublure viscose impeccable. Porté deux hivers uniquement, sort de pressing. Coupes nettes et finitions tailleur.',
    itemSpecs: 'Taille M (FR 48/50) · 100% laine vierge · Longueur 108 cm',
    price: 230,
    currency: 'USD',
    region: 'ameriques',
    country: 'Canada',
    category: 'mode',
    condition: 'tres_bon_etat',
    deliveryMode: 'livraison_securisee',
    city: 'Montréal',
    neighborhood: 'Plateau-Mont-Royal',
    imageUrl: STUDIO_MEDIA.coat,
  },
];
