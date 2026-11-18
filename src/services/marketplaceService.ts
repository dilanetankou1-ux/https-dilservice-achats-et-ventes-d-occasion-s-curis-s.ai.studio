import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { formatMoney } from '../lib/currency';
import {
  db,
  generateSafeId,
  handleFirestoreError,
  makeConversationId,
  OperationType,
} from '../lib/firebase';
import {
  BLUEPRINT_LIMITS,
  CURATED_TEMPLATES,
  type ChatMessage,
  type ContinentRegion,
  type Conversation,
  type CurrencyCode,
  type DeliveryMode,
  type Listing,
  type ListingCategory,
  type ListingCondition,
  type ListingStatus,
  type Order,
  type OrderStatus,
  type PaymentMethod,
  type PaymentProvider,
} from '../types/marketplace';

function tsToMs(ts: Timestamp | null | undefined): number {
  if (!ts) return Date.now();
  return typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now();
}

export function subscribeToListings(
  onData: (listings: Listing[]) => void
): () => void {
  const q = query(
    collection(db, 'listings'),
    where('status', 'in', ['available', 'reserved', 'sold'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => {
          const raw = d.data() as Listing;
          return {
            ...raw,
            currency: raw.currency || 'EUR',
            region: raw.region || 'europe',
            country: raw.country || 'France',
            neighborhood: raw.neighborhood || '',
            itemSpecs: raw.itemSpecs || '',
          };
        })
        .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'listings');
    }
  );
}

export interface ListingInput {
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

function sanitizeListingInput(input: ListingInput) {
  const title = input.title.trim().slice(0, BLUEPRINT_LIMITS.LISTING_TITLE_MAX);
  const description = input.description
    .trim()
    .slice(0, BLUEPRINT_LIMITS.LISTING_DESC_MAX);
  const itemSpecs = input.itemSpecs
    .trim()
    .slice(0, BLUEPRINT_LIMITS.ITEM_SPECS_MAX);
  const country = input.country.trim().slice(0, BLUEPRINT_LIMITS.COUNTRY_MAX);
  const city = input.city.trim().slice(0, BLUEPRINT_LIMITS.CITY_MAX);
  const neighborhood = input.neighborhood
    .trim()
    .slice(0, BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX);
  const price = Math.round(Number(input.price) * 100) / 100;
  const imageUrl = (input.imageUrl || '').slice(0, BLUEPRINT_LIMITS.IMAGE_URL_MAX);

  if (title.length < BLUEPRINT_LIMITS.LISTING_TITLE_MIN) {
    throw new Error('Le titre doit contenir au moins 3 caractères.');
  }
  if (description.length < BLUEPRINT_LIMITS.LISTING_DESC_MIN) {
    throw new Error('La description doit contenir au moins 10 caractères.');
  }
  if (country.length < BLUEPRINT_LIMITS.COUNTRY_MIN) {
    throw new Error('Veuillez indiquer un pays valide (min. 2 caractères).');
  }
  if (city.length < BLUEPRINT_LIMITS.CITY_MIN) {
    throw new Error('Veuillez indiquer une ville valide (min. 2 caractères).');
  }
  if (
    Number.isNaN(price) ||
    price < BLUEPRINT_LIMITS.PRICE_MIN ||
    price > BLUEPRINT_LIMITS.PRICE_MAX
  ) {
    throw new Error('Veuillez saisir un prix valide supérieur à 0.');
  }

  return {
    title,
    description,
    itemSpecs,
    price,
    currency: input.currency,
    region: input.region,
    country,
    category: input.category,
    condition: input.condition,
    deliveryMode: input.deliveryMode,
    city,
    neighborhood,
    imageUrl,
  };
}

export async function createListing(
  user: User,
  sellerDisplayName: string,
  sellerCity: string,
  input: ListingInput
): Promise<string> {
  const clean = sanitizeListingInput(input);
  const id = generateSafeId('lst');
  const safeSellerName =
    (sellerDisplayName || 'Vendeur')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Vendeur';
  const safeSellerCity =
    (sellerCity || clean.city).trim().slice(0, BLUEPRINT_LIMITS.CITY_MAX) ||
    clean.city;

  const ref = doc(db, 'listings', id);
  try {
    await setDoc(ref, {
      id,
      sellerId: user.uid,
      sellerName: safeSellerName,
      sellerCity: safeSellerCity,
      title: clean.title,
      description: clean.description,
      itemSpecs: clean.itemSpecs,
      price: clean.price,
      currency: clean.currency,
      region: clean.region,
      country: clean.country,
      category: clean.category,
      condition: clean.condition,
      deliveryMode: clean.deliveryMode,
      city: clean.city,
      neighborhood: clean.neighborhood,
      imageUrl: clean.imageUrl,
      status: 'available',
      buyerId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `listings/${id}`);
  }
}

export async function updateListingDetails(
  listingId: string,
  sellerDisplayName: string,
  sellerCity: string,
  input: ListingInput
): Promise<void> {
  const clean = sanitizeListingInput(input);
  const safeSellerName =
    (sellerDisplayName || 'Vendeur')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Vendeur';
  const safeSellerCity =
    (sellerCity || clean.city).trim().slice(0, BLUEPRINT_LIMITS.CITY_MAX) ||
    clean.city;

  const ref = doc(db, 'listings', listingId);
  try {
    await updateDoc(ref, {
      title: clean.title,
      description: clean.description,
      itemSpecs: clean.itemSpecs,
      price: clean.price,
      currency: clean.currency,
      region: clean.region,
      country: clean.country,
      category: clean.category,
      condition: clean.condition,
      deliveryMode: clean.deliveryMode,
      city: clean.city,
      neighborhood: clean.neighborhood,
      imageUrl: clean.imageUrl,
      sellerName: safeSellerName,
      sellerCity: safeSellerCity,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `listings/${listingId}`);
  }
}

export async function updateListingStatus(
  listingId: string,
  status: ListingStatus,
  buyerId = ''
): Promise<void> {
  const ref = doc(db, 'listings', listingId);
  try {
    await updateDoc(ref, {
      status,
      buyerId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `listings/${listingId}`);
  }
}

export async function deleteListing(listingId: string): Promise<void> {
  const ref = doc(db, 'listings', listingId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `listings/${listingId}`);
  }
}

export async function seedStarterListings(
  user: User,
  sellerDisplayName: string
): Promise<void> {
  const batch = writeBatch(db);
  const safeSellerName =
    (sellerDisplayName || 'Vendeur')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Vendeur';

  for (const tpl of CURATED_TEMPLATES) {
    const id = generateSafeId('lst');
    const ref = doc(db, 'listings', id);
    batch.set(ref, {
      id,
      sellerId: user.uid,
      sellerName: safeSellerName,
      sellerCity: tpl.city,
      title: tpl.title.slice(0, BLUEPRINT_LIMITS.LISTING_TITLE_MAX),
      description: tpl.description.slice(0, BLUEPRINT_LIMITS.LISTING_DESC_MAX),
      itemSpecs: tpl.itemSpecs.slice(0, BLUEPRINT_LIMITS.ITEM_SPECS_MAX),
      price: tpl.price,
      currency: tpl.currency,
      region: tpl.region,
      country: tpl.country.slice(0, BLUEPRINT_LIMITS.COUNTRY_MAX),
      category: tpl.category,
      condition: tpl.condition,
      deliveryMode: tpl.deliveryMode,
      city: tpl.city.slice(0, BLUEPRINT_LIMITS.CITY_MAX),
      neighborhood: tpl.neighborhood.slice(0, BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX),
      imageUrl: tpl.imageUrl,
      status: 'available',
      buyerId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'listings');
  }
}

export function subscribeToFavorites(
  userId: string,
  onData: (favoriteIds: Set<string>) => void
): () => void {
  const q = query(
    collection(db, 'users', userId, 'favorites'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const ids = new Set<string>();
      snapshot.docs.forEach((d) => ids.add(d.id));
      onData(ids);
    },
    (error) => {
      handleFirestoreError(
        error,
        OperationType.LIST,
        `users/${userId}/favorites`
      );
    }
  );
}

export async function toggleFavorite(
  userId: string,
  listingId: string,
  currentlyFavorited: boolean
): Promise<void> {
  const ref = doc(db, 'users', userId, 'favorites', listingId);
  try {
    if (currentlyFavorited) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        listingId,
        userId,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      currentlyFavorited ? OperationType.DELETE : OperationType.CREATE,
      `users/${userId}/favorites/${listingId}`
    );
  }
}

// =========================================================================
// Payment Methods Vault (Carte bancaire, MTN MoMo, Orange Money)
// =========================================================================

export function subscribeToPaymentMethods(
  userId: string,
  onData: (methods: PaymentMethod[]) => void
): () => void {
  const q = query(
    collection(db, 'users', userId, 'paymentMethods'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as PaymentMethod)
        .sort((a, b) => {
          if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
          return tsToMs(b.createdAt) - tsToMs(a.createdAt);
        });
      onData(items);
    },
    (error) => {
      handleFirestoreError(
        error,
        OperationType.LIST,
        `users/${userId}/paymentMethods`
      );
    }
  );
}

export interface CreatePaymentMethodInput {
  provider: PaymentProvider;
  label: string;
  holderName: string;
  maskedIdentifier: string;
  cardBrand: string;
  expiry: string;
  countryDialCode: string;
  isDefault: boolean;
}

export async function addPaymentMethod(
  userId: string,
  existingMethods: PaymentMethod[],
  input: CreatePaymentMethodInput
): Promise<string> {
  const id = generateSafeId('pm');
  const ref = doc(db, 'users', userId, 'paymentMethods', id);
  const batch = writeBatch(db);

  if (input.isDefault) {
    existingMethods.forEach((m) => {
      if (m.isDefault) {
        batch.update(doc(db, 'users', userId, 'paymentMethods', m.id), {
          isDefault: false,
          label: m.label,
          holderName: m.holderName,
          updatedAt: serverTimestamp(),
        });
      }
    });
  }

  batch.set(ref, {
    id,
    userId,
    provider: input.provider,
    label: input.label.trim().slice(0, BLUEPRINT_LIMITS.PAYMENT_LABEL_MAX),
    holderName: input.holderName
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
    maskedIdentifier: input.maskedIdentifier
      .trim()
      .slice(0, BLUEPRINT_LIMITS.PAYMENT_IDENTIFIER_MAX),
    cardBrand: input.cardBrand.trim().slice(0, 30),
    expiry: input.expiry.trim().slice(0, 10),
    countryDialCode: input.countryDialCode.trim().slice(0, 10),
    isDefault: input.isDefault || existingMethods.length === 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `users/${userId}/paymentMethods/${id}`
    );
  }
}

export async function setDefaultPaymentMethod(
  userId: string,
  targetMethod: PaymentMethod,
  allMethods: PaymentMethod[]
): Promise<void> {
  const batch = writeBatch(db);
  allMethods.forEach((m) => {
    const shouldBeDefault = m.id === targetMethod.id;
    if (m.isDefault !== shouldBeDefault) {
      batch.update(doc(db, 'users', userId, 'paymentMethods', m.id), {
        isDefault: shouldBeDefault,
        label: m.label,
        holderName: m.holderName,
        updatedAt: serverTimestamp(),
      });
    }
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${userId}/paymentMethods/${targetMethod.id}`
    );
  }
}

export async function deletePaymentMethod(
  userId: string,
  methodId: string
): Promise<void> {
  const ref = doc(db, 'users', userId, 'paymentMethods', methodId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${userId}/paymentMethods/${methodId}`
    );
  }
}

// =========================================================================
// Secure Conversations & Messaging
// =========================================================================

export function subscribeToConversations(
  userId: string,
  onData: (conversations: Conversation[]) => void
): () => void {
  const map = new Map<string, Conversation>();

  const emit = () => {
    const merged = Array.from(map.values()).sort(
      (a, b) => tsToMs(b.updatedAt) - tsToMs(a.updatedAt)
    );
    onData(merged);
  };

  const buyerQuery = query(
    collection(db, 'conversations'),
    where('buyerId', '==', userId)
  );
  const sellerQuery = query(
    collection(db, 'conversations'),
    where('sellerId', '==', userId)
  );

  const unsubBuyer = onSnapshot(
    buyerQuery,
    (snapshot) => {
      snapshot.docs.forEach((d) => {
        const raw = d.data() as Conversation;
        map.set(d.id, {
          ...raw,
          currency: raw.currency || 'EUR',
          buyerWhatsapp: raw.buyerWhatsapp || '',
          buyerLocation: raw.buyerLocation || '',
          sellerWhatsapp: raw.sellerWhatsapp || '',
          sellerLocation: raw.sellerLocation || '',
        });
      });
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    }
  );

  const unsubSeller = onSnapshot(
    sellerQuery,
    (snapshot) => {
      snapshot.docs.forEach((d) => {
        const raw = d.data() as Conversation;
        map.set(d.id, {
          ...raw,
          currency: raw.currency || 'EUR',
          buyerWhatsapp: raw.buyerWhatsapp || '',
          buyerLocation: raw.buyerLocation || '',
          sellerWhatsapp: raw.sellerWhatsapp || '',
          sellerLocation: raw.sellerLocation || '',
        });
      });
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    }
  );

  return () => {
    unsubBuyer();
    unsubSeller();
  };
}

export async function startOrGetConversation(
  listing: Listing,
  buyer: User,
  buyerDisplayName: string,
  initialMessage?: string,
  offerAmount?: number,
  buyerWhatsapp = '',
  buyerLocation = ''
): Promise<string> {
  if (listing.sellerId === buyer.uid) {
    throw new Error(
      'Vous ne pouvez pas démarrer une conversation sur votre propre annonce.'
    );
  }

  const listingCurrency: CurrencyCode = listing.currency || 'EUR';
  const conversationId = makeConversationId(listing.id, buyer.uid);

  let existingConv: Conversation | null = null;
  try {
    const snap = await getDocs(
      query(collection(db, 'conversations'), where('buyerId', '==', buyer.uid))
    );
    const found = snap.docs.find((d) => d.id === conversationId);
    if (found) {
      existingConv = found.data() as Conversation;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'conversations');
  }

  const safeBuyerName =
    (buyerDisplayName || 'Acheteur')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Acheteur';
  const cleanBuyerWhatsapp = buyerWhatsapp
    .trim()
    .slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
  const cleanBuyerLocation = buyerLocation
    .trim()
    .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);
  const cleanMsg = (
    initialMessage?.trim() ||
    (offerAmount
      ? `Bonjour, je vous propose ${formatMoney(offerAmount, listingCurrency)} pour « ${listing.title} ».`
      : `Bonjour, votre article « ${listing.title} » est-il toujours disponible ?`)
  ).slice(0, BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX);

  const msgId = generateSafeId('msg');
  const convRef = doc(db, 'conversations', conversationId);
  const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);

  const batch = writeBatch(db);

  if (!existingConv) {
    const isOffer = typeof offerAmount === 'number' && offerAmount > 0;
    const defaultSellerLoc = [
      listing.neighborhood,
      listing.city,
      listing.country,
    ]
      .filter(Boolean)
      .join(', ')
      .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);

    batch.set(convRef, {
      id: conversationId,
      listingId: listing.id,
      listingTitle: listing.title.slice(0, BLUEPRINT_LIMITS.LISTING_TITLE_MAX),
      listingPrice: listing.price,
      currency: listingCurrency,
      listingImageUrl: listing.imageUrl.slice(0, BLUEPRINT_LIMITS.IMAGE_URL_MAX),
      buyerId: buyer.uid,
      buyerName: safeBuyerName,
      buyerWhatsapp: cleanBuyerWhatsapp,
      buyerLocation: cleanBuyerLocation,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName.slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
      sellerWhatsapp: '',
      sellerLocation: defaultSellerLoc,
      lastMessage: cleanMsg.slice(0, BLUEPRINT_LIMITS.LAST_MESSAGE_MAX),
      lastSenderId: buyer.uid,
      offerPrice: isOffer ? offerAmount : 0,
      offerStatus: isOffer ? 'pending' : 'none',
      unreadByBuyer: 0,
      unreadBySeller: 1,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(msgRef, {
      id: msgId,
      conversationId,
      buyerId: buyer.uid,
      sellerId: listing.sellerId,
      senderId: buyer.uid,
      senderName: safeBuyerName,
      text: cleanMsg,
      type: isOffer ? 'offer' : 'text',
      offerAmount: isOffer ? offerAmount : 0,
      createdAt: serverTimestamp(),
    });
  } else if (
    initialMessage?.trim() ||
    (typeof offerAmount === 'number' && offerAmount > 0) ||
    cleanBuyerWhatsapp ||
    cleanBuyerLocation
  ) {
    const isOffer = typeof offerAmount === 'number' && offerAmount > 0;
    const shouldSendMsg =
      Boolean(initialMessage?.trim()) ||
      (typeof offerAmount === 'number' && offerAmount > 0);
    batch.update(convRef, {
      buyerWhatsapp: cleanBuyerWhatsapp || existingConv.buyerWhatsapp || '',
      buyerLocation: cleanBuyerLocation || existingConv.buyerLocation || '',
      lastMessage: shouldSendMsg
        ? cleanMsg.slice(0, BLUEPRINT_LIMITS.LAST_MESSAGE_MAX)
        : existingConv.lastMessage,
      lastSenderId: shouldSendMsg ? buyer.uid : existingConv.lastSenderId,
      offerPrice: isOffer ? offerAmount : existingConv.offerPrice,
      offerStatus: isOffer ? 'pending' : existingConv.offerStatus,
      unreadByBuyer: 0,
      unreadBySeller: shouldSendMsg
        ? Math.min(999, (existingConv.unreadBySeller || 0) + 1)
        : existingConv.unreadBySeller || 0,
      updatedAt: serverTimestamp(),
    });

    if (shouldSendMsg) {
      batch.set(msgRef, {
        id: msgId,
        conversationId,
        buyerId: buyer.uid,
        sellerId: listing.sellerId,
        senderId: buyer.uid,
        senderName: safeBuyerName,
        text: cleanMsg,
        type: isOffer ? 'offer' : 'text',
        offerAmount: isOffer ? offerAmount : 0,
        createdAt: serverTimestamp(),
      });
    }
  } else {
    return conversationId;
  }

  try {
    await batch.commit();
    return conversationId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversationId}`
    );
  }
}

export function subscribeToMessages(
  conversation: Conversation,
  currentUid: string,
  onData: (messages: ChatMessage[]) => void
): () => void {
  const roleField = conversation.buyerId === currentUid ? 'buyerId' : 'sellerId';
  const q = query(
    collection(db, 'conversations', conversation.id, 'messages'),
    where(roleField, '==', currentUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs
        .map((d) => d.data() as ChatMessage)
        .sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt));
      onData(msgs);
    },
    (error) => {
      handleFirestoreError(
        error,
        OperationType.LIST,
        `conversations/${conversation.id}/messages`
      );
    }
  );
}

export async function markConversationRead(
  conversation: Conversation,
  currentUid: string
): Promise<void> {
  const isBuyer = conversation.buyerId === currentUid;
  const currentUnread = isBuyer
    ? conversation.unreadByBuyer
    : conversation.unreadBySeller;
  if (!currentUnread || currentUnread === 0) return;

  const convRef = doc(db, 'conversations', conversation.id);
  try {
    await updateDoc(
      convRef,
      isBuyer
        ? { unreadByBuyer: 0, updatedAt: serverTimestamp() }
        : { unreadBySeller: 0, updatedAt: serverTimestamp() }
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `conversations/${conversation.id}`
    );
  }
}

export async function updateConversationContact(params: {
  conversation: Conversation;
  user: User;
  userName: string;
  whatsapp: string;
  location: string;
}): Promise<void> {
  const { conversation, user, userName, whatsapp, location } = params;
  const isBuyer = conversation.buyerId === user.uid;
  const cleanWhatsapp = whatsapp.trim().slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
  const cleanLocation = location
    .trim()
    .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);

  if (!cleanWhatsapp && !cleanLocation) {
    throw new Error('Veuillez saisir un numéro WhatsApp ou une localisation.');
  }

  const safeName =
    (userName || 'Membre')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Membre';
  const msgId = generateSafeId('msg');
  const sysText = `${safeName} a mis à jour ses coordonnées (${[
    cleanLocation,
    cleanWhatsapp ? `WhatsApp : ${cleanWhatsapp}` : '',
  ]
    .filter(Boolean)
    .join(' · ')}).`;

  const convRef = doc(db, 'conversations', conversation.id);
  const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgId);
  const batch = writeBatch(db);

  batch.set(msgRef, {
    id: msgId,
    conversationId: conversation.id,
    buyerId: conversation.buyerId,
    sellerId: conversation.sellerId,
    senderId: user.uid,
    senderName: safeName,
    text: sysText.slice(0, BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX),
    type: 'system',
    offerAmount: 0,
    createdAt: serverTimestamp(),
  });

  if (isBuyer) {
    batch.update(convRef, {
      buyerWhatsapp: cleanWhatsapp,
      buyerLocation: cleanLocation,
      lastMessage: sysText.slice(0, BLUEPRINT_LIMITS.LAST_MESSAGE_MAX),
      lastSenderId: user.uid,
      unreadByBuyer: 0,
      unreadBySeller: Math.min(999, (conversation.unreadBySeller || 0) + 1),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(convRef, {
      sellerWhatsapp: cleanWhatsapp,
      sellerLocation: cleanLocation,
      lastMessage: sysText.slice(0, BLUEPRINT_LIMITS.LAST_MESSAGE_MAX),
      lastSenderId: user.uid,
      unreadByBuyer: Math.min(999, (conversation.unreadByBuyer || 0) + 1),
      unreadBySeller: 0,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `conversations/${conversation.id}`
    );
  }
}

export async function sendMessage(
  conversation: Conversation,
  sender: User,
  senderName: string,
  text: string,
  senderContact?: { whatsapp?: string; location?: string }
): Promise<void> {
  const cleanText = text.trim().slice(0, BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX);
  if (cleanText.length < BLUEPRINT_LIMITS.MESSAGE_TEXT_MIN) return;

  const isBuyer = conversation.buyerId === sender.uid;
  const safeName =
    (senderName || 'Membre')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Membre';
  const msgId = generateSafeId('msg');

  const convRef = doc(db, 'conversations', conversation.id);
  const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgId);

  const batch = writeBatch(db);
  batch.set(msgRef, {
    id: msgId,
    conversationId: conversation.id,
    buyerId: conversation.buyerId,
    sellerId: conversation.sellerId,
    senderId: sender.uid,
    senderName: safeName,
    text: cleanText,
    type: 'text',
    offerAmount: 0,
    createdAt: serverTimestamp(),
  });

  const convUpdate: Record<string, unknown> = {
    lastMessage: cleanText.slice(0, BLUEPRINT_LIMITS.LAST_MESSAGE_MAX),
    lastSenderId: sender.uid,
    unreadByBuyer: isBuyer
      ? 0
      : Math.min(999, (conversation.unreadByBuyer || 0) + 1),
    unreadBySeller: isBuyer
      ? Math.min(999, (conversation.unreadBySeller || 0) + 1)
      : 0,
    updatedAt: serverTimestamp(),
  };

  if (isBuyer) {
    if (!conversation.buyerWhatsapp && senderContact?.whatsapp?.trim()) {
      convUpdate.buyerWhatsapp = senderContact.whatsapp
        .trim()
        .slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
    }
    if (!conversation.buyerLocation && senderContact?.location?.trim()) {
      convUpdate.buyerLocation = senderContact.location
        .trim()
        .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);
    }
  } else {
    if (!conversation.sellerWhatsapp && senderContact?.whatsapp?.trim()) {
      convUpdate.sellerWhatsapp = senderContact.whatsapp
        .trim()
        .slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
    }
    if (!conversation.sellerLocation && senderContact?.location?.trim()) {
      convUpdate.sellerLocation = senderContact.location
        .trim()
        .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);
    }
  }

  batch.update(convRef, convUpdate);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversation.id}`
    );
  }
}

export async function sendOffer(
  conversation: Conversation,
  buyer: User,
  buyerName: string,
  offerAmount: number
): Promise<void> {
  const amount = Math.round(Number(offerAmount) * 100) / 100;
  if (
    Number.isNaN(amount) ||
    amount < BLUEPRINT_LIMITS.PRICE_MIN ||
    amount > BLUEPRINT_LIMITS.PRICE_MAX
  ) {
    throw new Error('Veuillez saisir un montant d’offre valide.');
  }

  const convCurrency: CurrencyCode = conversation.currency || 'EUR';
  const safeName =
    (buyerName || 'Acheteur')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Acheteur';
  const text = `Offre proposée : ${formatMoney(amount, convCurrency)}`;
  const msgId = generateSafeId('msg');

  const convRef = doc(db, 'conversations', conversation.id);
  const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgId);

  const batch = writeBatch(db);
  batch.set(msgRef, {
    id: msgId,
    conversationId: conversation.id,
    buyerId: conversation.buyerId,
    sellerId: conversation.sellerId,
    senderId: buyer.uid,
    senderName: safeName,
    text,
    type: 'offer',
    offerAmount: amount,
    createdAt: serverTimestamp(),
  });

  batch.update(convRef, {
    lastMessage: text,
    lastSenderId: buyer.uid,
    offerPrice: amount,
    offerStatus: 'pending',
    unreadByBuyer: 0,
    unreadBySeller: Math.min(999, (conversation.unreadBySeller || 0) + 1),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversation.id}`
    );
  }
}

export async function respondToOffer(
  conversation: Conversation,
  listing: Listing | undefined,
  seller: User,
  sellerName: string,
  decision: 'accepted' | 'declined'
): Promise<void> {
  const convCurrency: CurrencyCode = conversation.currency || 'EUR';
  const safeName =
    (sellerName || 'Vendeur')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Vendeur';
  const msgId = generateSafeId('msg');
  const amount = conversation.offerPrice;
  const formatted = formatMoney(amount, convCurrency);
  const text =
    decision === 'accepted'
      ? `Offre de ${formatted} acceptée. L'article vous est réservé.`
      : `Offre de ${formatted} déclinée.`;

  const convRef = doc(db, 'conversations', conversation.id);
  const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgId);

  const batch = writeBatch(db);
  batch.set(msgRef, {
    id: msgId,
    conversationId: conversation.id,
    buyerId: conversation.buyerId,
    sellerId: conversation.sellerId,
    senderId: seller.uid,
    senderName: safeName,
    text,
    type: decision === 'accepted' ? 'offer_accepted' : 'offer_declined',
    offerAmount: amount,
    createdAt: serverTimestamp(),
  });

  batch.update(convRef, {
    lastMessage: text,
    lastSenderId: seller.uid,
    offerStatus: decision,
    unreadByBuyer: Math.min(999, (conversation.unreadByBuyer || 0) + 1),
    unreadBySeller: 0,
    updatedAt: serverTimestamp(),
  });

  if (decision === 'accepted' && listing && listing.status === 'available') {
    const listingRef = doc(db, 'listings', listing.id);
    batch.update(listingRef, {
      status: 'reserved',
      buyerId: conversation.buyerId,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversation.id}`
    );
  }
}

// =========================================================================
// Orders
// =========================================================================

export function subscribeToOrders(
  userId: string,
  onData: (orders: Order[]) => void
): () => void {
  const map = new Map<string, Order>();

  const emit = () => {
    const merged = Array.from(map.values()).sort(
      (a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)
    );
    onData(merged);
  };

  const buyerQ = query(collection(db, 'orders'), where('buyerId', '==', userId));
  const sellerQ = query(
    collection(db, 'orders'),
    where('sellerId', '==', userId)
  );

  const unsubBuyer = onSnapshot(
    buyerQ,
    (snap) => {
      snap.docs.forEach((d) => map.set(d.id, d.data() as Order));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );

  const unsubSeller = onSnapshot(
    sellerQ,
    (snap) => {
      snap.docs.forEach((d) => map.set(d.id, d.data() as Order));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );

  return () => {
    unsubBuyer();
    unsubSeller();
  };
}

export async function createOrderAtomic(params: {
  listing: Listing;
  buyer: User;
  buyerName: string;
  buyerWhatsapp: string;
  buyerLocation: string;
  agreedPrice: number;
  paymentMethod: PaymentProvider;
  paymentSummary: string;
  deliveryMethod: 'remise_en_main_propre' | 'livraison_securisee';
  handoffDetails: string;
  conversation?: Conversation | null;
}): Promise<string> {
  const {
    listing,
    buyer,
    buyerName,
    buyerWhatsapp,
    buyerLocation,
    agreedPrice,
    paymentMethod,
    paymentSummary,
    deliveryMethod,
    handoffDetails,
    conversation,
  } = params;

  const listingCurrency: CurrencyCode = listing.currency || 'EUR';
  const orderId = generateSafeId('ord');
  const protectionFee = Math.max(1, Math.round(agreedPrice * 0.04));
  const totalAmount = Math.round((agreedPrice + protectionFee) * 100) / 100;
  const safeBuyerName =
    (buyerName || 'Acheteur')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Acheteur';
  const safeBuyerWhatsapp = buyerWhatsapp
    .trim()
    .slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
  const safeBuyerLocation = buyerLocation
    .trim()
    .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);
  const safeSellerWhatsapp = (conversation?.sellerWhatsapp || '')
    .trim()
    .slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
  const fallbackSellerLoc = [
    listing.neighborhood,
    listing.city,
    listing.country,
  ]
    .filter(Boolean)
    .join(', ');
  const safeSellerLocation = (conversation?.sellerLocation || fallbackSellerLoc)
    .trim()
    .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);
  const safeHandoff = handoffDetails
    .trim()
    .slice(0, BLUEPRINT_LIMITS.HANDOFF_DETAILS_MAX);
  const safePaySummary =
    paymentSummary.trim().slice(0, BLUEPRINT_LIMITS.PAYMENT_LABEL_MAX) ||
    paymentMethod;

  const batch = writeBatch(db);
  const listingRef = doc(db, 'listings', listing.id);
  const orderRef = doc(db, 'orders', orderId);

  batch.update(listingRef, {
    status: 'sold',
    buyerId: buyer.uid,
    updatedAt: serverTimestamp(),
  });

  batch.set(orderRef, {
    id: orderId,
    listingId: listing.id,
    listingTitle: listing.title.slice(0, BLUEPRINT_LIMITS.LISTING_TITLE_MAX),
    listingImageUrl: listing.imageUrl.slice(0, BLUEPRINT_LIMITS.IMAGE_URL_MAX),
    buyerId: buyer.uid,
    buyerName: safeBuyerName,
    buyerWhatsapp: safeBuyerWhatsapp,
    buyerLocation: safeBuyerLocation,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName.slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX),
    sellerWhatsapp: safeSellerWhatsapp,
    sellerLocation: safeSellerLocation,
    currency: listingCurrency,
    agreedPrice,
    protectionFee,
    totalAmount,
    paymentMethod,
    paymentSummary: safePaySummary,
    deliveryMethod,
    handoffDetails: safeHandoff,
    status: 'pending_handoff',
    conversationId: conversation?.id || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (conversation && conversation.status === 'open') {
    const msgId = generateSafeId('msg');
    const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgId);
    const convRef = doc(db, 'conversations', conversation.id);
    const sysText = `Commande confirmée (${formatMoney(agreedPrice, listingCurrency)} via ${safePaySummary}). Acheteur : ${safeBuyerLocation}${safeBuyerWhatsapp ? ` · WhatsApp ${safeBuyerWhatsapp}` : ''}.`;

    batch.set(msgRef, {
      id: msgId,
      conversationId: conversation.id,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      senderId: buyer.uid,
      senderName: safeBuyerName,
      text: sysText.slice(0, BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX),
      type: 'system',
      offerAmount: agreedPrice,
      createdAt: serverTimestamp(),
    });

    batch.update(convRef, {
      buyerWhatsapp: safeBuyerWhatsapp || conversation.buyerWhatsapp || '',
      buyerLocation: safeBuyerLocation || conversation.buyerLocation || '',
      lastMessage: sysText.slice(0, BLUEPRINT_LIMITS.LAST_MESSAGE_MAX),
      lastSenderId: buyer.uid,
      unreadByBuyer: 0,
      unreadBySeller: Math.min(999, (conversation.unreadBySeller || 0) + 1),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: Exclude<OrderStatus, 'pending_handoff'>,
  handoffDetails?: string,
  sellerContact?: { sellerWhatsapp?: string; sellerLocation?: string }
): Promise<void> {
  const ref = doc(db, 'orders', orderId);
  const payload: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (status === 'shipped') {
    if (typeof handoffDetails === 'string') {
      payload.handoffDetails = handoffDetails
        .trim()
        .slice(0, BLUEPRINT_LIMITS.HANDOFF_DETAILS_MAX);
    }
    if (typeof sellerContact?.sellerWhatsapp === 'string') {
      payload.sellerWhatsapp = sellerContact.sellerWhatsapp
        .trim()
        .slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
    }
    if (typeof sellerContact?.sellerLocation === 'string') {
      payload.sellerLocation = sellerContact.sellerLocation
        .trim()
        .slice(0, BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX);
    }
  }
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }
}
