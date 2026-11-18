import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Languages,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatMoney } from '../lib/currency';
import { translateTextWithApi, WORLD_LANGUAGES } from '../lib/i18n';
import {
  markConversationRead,
  respondToOffer,
  sendMessage,
  sendOffer,
  subscribeToMessages,
  updateConversationContact,
} from '../services/marketplaceService';
import {
  BLUEPRINT_LIMITS,
  type ChatMessage,
  type Conversation,
  type CurrencyCode,
  type Listing,
} from '../types/marketplace';
import { SafeImage } from './SafeImage';

interface MessagingCenterProps {
  conversations: Conversation[];
  listings: Listing[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onOpenListing: (listing: Listing) => void;
}

function formatMessageTime(ts: ChatMessage['createdAt']): string {
  if (!ts || typeof ts.toDate !== 'function') return 'À l’instant';
  const date = ts.toDate();
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatWaHref(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}`;
}

interface MessageTranslation {
  detectedLanguage: string;
  translatedText: string;
  targetLanguage: string;
}

export function MessagingCenter({
  conversations,
  listings,
  selectedConversationId,
  onSelectConversation,
  onOpenListing,
}: MessagingCenterProps) {
  const { user, userProfile, signIn, updateProfileDetails } = useAuth();
  const { languageMeta, t } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [offerMode, setOfferMode] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Translation controls (any world language + custom input + auto-translate)
  const [targetLanguage, setTargetLanguage] = useState<string>(
    `${languageMeta.label} (${languageMeta.nativeName})`
  );
  const [customLanguageInput, setCustomLanguageInput] = useState('');
  const [autoTranslateIncoming, setAutoTranslateIncoming] = useState(false);
  const [translatingDraft, setTranslatingDraft] = useState(false);
  const [translatingMsgIds, setTranslatingMsgIds] = useState<Set<string>>(
    new Set()
  );
  const [translations, setTranslations] = useState<
    Record<string, MessageTranslation>
  >({});

  // Location & WhatsApp coordination editor inside active conversation
  const [editingCoords, setEditingCoords] = useState(false);
  const [myWhatsapp, setMyWhatsapp] = useState('');
  const [myLocation, setMyLocation] = useState('');
  const [savingCoords, setSavingCoords] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTargetLanguage(`${languageMeta.label} (${languageMeta.nativeName})`);
  }, [languageMeta.label, languageMeta.nativeName]);

  const effectiveTargetLanguage = useMemo(() => {
    const custom = customLanguageInput.trim();
    return custom.length > 0 ? custom : targetLanguage;
  }, [customLanguageInput, targetLanguage]);

  const activeConversation =
    conversations.find((c) => c.id === selectedConversationId) ||
    conversations[0] ||
    null;

  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      onSelectConversation(conversations[0].id);
    }
  }, [activeConversation, conversations, onSelectConversation]);

  useEffect(() => {
    if (!user || !activeConversation) {
      setMessages([]);
      return;
    }

    const unsub = subscribeToMessages(activeConversation, user.uid, (msgs) => {
      setMessages(msgs);
    });

    void markConversationRead(activeConversation, user.uid);

    return () => unsub();
  }, [user, activeConversation]);

  useEffect(() => {
    if (!activeConversation || !user) return;
    const isBuyerRole = activeConversation.buyerId === user.uid;
    const convWa = isBuyerRole
      ? activeConversation.buyerWhatsapp
      : activeConversation.sellerWhatsapp;
    const convLoc = isBuyerRole
      ? activeConversation.buyerLocation
      : activeConversation.sellerLocation;

    const profileLoc = [
      userProfile?.neighborhood,
      userProfile?.city,
      userProfile?.country,
    ]
      .filter(Boolean)
      .join(', ');

    setMyWhatsapp(convWa || userProfile?.whatsappNumber || userProfile?.phone || '');
    setMyLocation(convLoc || profileLoc);
    setEditingCoords(false);
  }, [activeConversation?.id, user?.uid, userProfile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const translateSingleMessage = async (msg: ChatMessage, lang: string) => {
    const cacheKey = `${msg.id}::${lang}`;
    if (translations[cacheKey] || translatingMsgIds.has(cacheKey)) return;

    setTranslatingMsgIds((prev) => new Set(prev).add(cacheKey));
    try {
      const result = await translateTextWithApi({
        text: msg.text,
        targetLanguage: lang,
        context: 'peer-to-peer marketplace chat message',
      });
      setTranslations((prev) => ({
        ...prev,
        [cacheKey]: {
          detectedLanguage: result.detectedLanguage,
          translatedText: result.translatedText,
          targetLanguage: lang,
        },
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'La traduction du message a échoué.'
      );
    } finally {
      setTranslatingMsgIds((prev) => {
        const next = new Set(prev);
        next.delete(cacheKey);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!autoTranslateIncoming || !user || messages.length === 0) return;
    const incomingToTranslate = messages.filter((m) => {
      if (m.senderId === user.uid || m.type === 'system') return false;
      const cacheKey = `${m.id}::${effectiveTargetLanguage}`;
      return !translations[cacheKey] && !translatingMsgIds.has(cacheKey);
    });
    incomingToTranslate.slice(-5).forEach((m) => {
      void translateSingleMessage(m, effectiveTargetLanguage);
    });
  }, [autoTranslateIncoming, messages, effectiveTargetLanguage, user?.uid]);

  if (!user) {
    return (
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#E4E4E0] rounded-xl p-10 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-lg bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#141413] mb-2">
            {t.messagesTitle}
          </h1>
          <p className="text-sm text-[#575752] leading-relaxed mb-6">
            Connectez-vous avec votre compte Google pour négocier en toute langue,
            échanger vos localisations et vos contacts WhatsApp en privé.
          </p>
          <button
            type="button"
            onClick={() => void signIn()}
            className="px-5 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] transition-colors cursor-pointer"
          >
            Se connecter avec Google
          </button>
        </div>
      </section>
    );
  }

  const displayName =
    userProfile?.displayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Membre';

  const activeListing = activeConversation
    ? listings.find((l) => l.id === activeConversation.listingId)
    : undefined;

  const activeCurrency: CurrencyCode = activeConversation?.currency || 'EUR';
  const isBuyer = activeConversation
    ? activeConversation.buyerId === user.uid
    : false;

  const myProfileContact = {
    whatsapp: userProfile?.whatsappNumber || userProfile?.phone || '',
    location: [
      userProfile?.neighborhood,
      userProfile?.city,
      userProfile?.country,
    ]
      .filter(Boolean)
      .join(', '),
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !draft.trim()) return;
    setError(null);
    setSending(true);
    try {
      await sendMessage(
        activeConversation,
        user,
        displayName,
        draft,
        myProfileContact
      );
      setDraft('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'envoi du message."
      );
    } finally {
      setSending(false);
    }
  };

  const handleTranslateDraft = async () => {
    if (!draft.trim()) return;
    setError(null);
    setTranslatingDraft(true);
    try {
      const res = await translateTextWithApi({
        text: draft,
        targetLanguage: effectiveTargetLanguage,
        context: 'buyer-seller marketplace chat draft',
      });
      setDraft(res.translatedText.slice(0, BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de traduire votre message.'
      );
    } finally {
      setTranslatingDraft(false);
    }
  };

  const handleSaveConversationCoords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;
    setError(null);
    setSavingCoords(true);
    try {
      await updateConversationContact({
        conversation: activeConversation,
        user,
        userName: displayName,
        whatsapp: myWhatsapp,
        location: myLocation,
      });
      if (userProfile) {
        await updateProfileDetails({
          displayName: userProfile.displayName || displayName,
          country: userProfile.country || 'France',
          city: userProfile.city || myLocation.split(',')[0]?.trim() || 'Paris',
          neighborhood: userProfile.neighborhood || myLocation,
          continent: userProfile.continent || 'europe',
          preferredCurrency: userProfile.preferredCurrency || 'EUR',
          phone: userProfile.phone || myWhatsapp,
          whatsappNumber: myWhatsapp.trim(),
        });
      }
      setEditingCoords(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de partager vos coordonnées.'
      );
    } finally {
      setSavingCoords(false);
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;
    setError(null);
    setSending(true);
    try {
      await sendOffer(activeConversation, user, displayName, Number(offerAmount));
      setOfferAmount('');
      setOfferMode(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'envoi de l'offre."
      );
    } finally {
      setSending(false);
    }
  };

  const handleOfferDecision = async (decision: 'accepted' | 'declined') => {
    if (!activeConversation) return;
    setError(null);
    setSending(true);
    try {
      await respondToOffer(
        activeConversation,
        activeListing,
        user,
        displayName,
        decision
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de traiter cette offre.'
      );
    } finally {
      setSending(false);
    }
  };

  const buyerWaHref = formatWaHref(activeConversation?.buyerWhatsapp);
  const sellerWaHref = formatWaHref(activeConversation?.sellerWhatsapp);

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413]">
            {t.messagesTitle}
          </h1>
          <p className="text-sm text-[#575752] mt-1">{t.messagesSubtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#0F5132] font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>{t.messagesSecurityBadge}</span>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white border border-[#E4E4E0] rounded-xl p-12 text-center">
          <MessageSquare className="w-8 h-8 text-[#64645F] mx-auto mb-3 opacity-70" />
          <h2 className="font-display text-xl font-semibold text-[#141413] mb-1.5">
            Aucune conversation pour le moment
          </h2>
          <p className="text-sm text-[#575752] max-w-md mx-auto">
            Ouvrez une annonce qui vous intéresse puis cliquez sur « Contacter » ou «
            Faire une offre » pour démarrer un échange sécurisé avec le vendeur.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E4E4E0] rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
          <aside
            className={`lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E4E4E0] overflow-y-auto max-h-[720px] ${
              selectedConversationId ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="px-4 py-3 border-b border-[#E4E4E0] bg-[#F7F7F5]/60 text-xs font-medium text-[#575752]">
              Discussions ({conversations.length})
            </div>
            <ul className="divide-y divide-[#F0EFEA]">
              {conversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const convIsBuyer = conv.buyerId === user.uid;
                const peerName = convIsBuyer ? conv.sellerName : conv.buyerName;
                const unread = convIsBuyer
                  ? conv.unreadByBuyer
                  : conv.unreadBySeller;
                const convCurrency = conv.currency || 'EUR';

                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full p-4 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#F7F7F5]' : 'hover:bg-[#F7F7F5]/60'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E4E4E0] shrink-0">
                        <SafeImage
                          src={conv.listingImageUrl}
                          alt={conv.listingTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span
                            className={`text-sm truncate ${
                              unread > 0
                                ? 'font-bold text-[#141413]'
                                : 'font-semibold text-[#141413]'
                            }`}
                          >
                            {peerName}
                          </span>
                          <span className="font-mono tabular-nums text-xs text-[#64645F] shrink-0">
                            {formatMoney(conv.listingPrice, convCurrency)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#3A3A36] truncate mb-0.5">
                          {conv.listingTitle}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              unread > 0
                                ? 'text-[#141413] font-medium'
                                : 'text-[#64645F]'
                            }`}
                          >
                            {conv.lastMessage || 'Nouvelle discussion'}
                          </p>
                          {unread > 0 && (
                            <span className="font-mono tabular-nums text-xs font-semibold text-[#0F5132] shrink-0">
                              ({unread})
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="lg:col-span-8 flex flex-col max-h-[720px]">
            {activeConversation ? (
              <>
                <div className="px-5 py-3.5 border-b border-[#E4E4E0] flex items-center justify-between gap-4 bg-[#F7F7F5]/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectConversation(null)}
                      aria-label="Retour aux discussions"
                      className="lg:hidden w-9 h-9 rounded-lg border border-[#E4E4E0] flex items-center justify-center bg-white text-[#141413] shrink-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E4E4E0] shrink-0">
                      <SafeImage
                        src={activeConversation.listingImageUrl}
                        alt={activeConversation.listingTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#141413] truncate">
                        {isBuyer
                          ? activeConversation.sellerName
                          : activeConversation.buyerName}
                      </p>
                      <p className="text-xs text-[#64645F] truncate">
                        {activeConversation.listingTitle} ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(
                            activeConversation.listingPrice,
                            activeCurrency
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  {activeListing && (
                    <button
                      type="button"
                      onClick={() => onOpenListing(activeListing)}
                      className="px-3.5 py-2 border border-[#E4E4E0] bg-white rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Voir l&apos;annonce
                    </button>
                  )}
                </div>

                {/* Global Translation Bar (any world language) */}
                <div className="px-5 py-2.5 bg-[#F7F7F5] border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#141413]">
                      <Languages className="w-3.5 h-3.5 text-[#0F5132]" />
                      {t.translateTargetLabel} :
                    </span>
                    <select
                      aria-label="Langue cible de traduction"
                      value={targetLanguage}
                      onChange={(e) => {
                        setTargetLanguage(e.target.value);
                        setCustomLanguageInput('');
                      }}
                      className="px-2.5 py-1.5 rounded-md border border-[#E4E4E0] bg-white text-xs text-[#141413]"
                    >
                      {WORLD_LANGUAGES.map((lang) => (
                        <option
                          key={lang.code}
                          value={`${lang.label} (${lang.nativeName})`}
                        >
                          {lang.label} — {lang.nativeName}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      maxLength={60}
                      value={customLanguageInput}
                      onChange={(e) => setCustomLanguageInput(e.target.value)}
                      placeholder={t.translateCustomPlaceholder}
                      className="px-2.5 py-1.5 rounded-md border border-[#E4E4E0] bg-white text-xs text-[#141413] w-48"
                    />
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-xs text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoTranslateIncoming}
                      onChange={(e) => setAutoTranslateIncoming(e.target.checked)}
                      className="accent-[#0F5132] cursor-pointer"
                    />
                    <span>{t.autoTranslateToggle}</span>
                  </label>
                </div>

                {/* Locations & Private WhatsApp Contact Card */}
                <div className="px-5 py-3 bg-[#0F5132]/[0.03] border-b border-[#E4E4E0] text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-[#141413] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0F5132]" />
                      <span>{t.contactsHeader}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingCoords((v) => !v)}
                      className="text-[11px] font-medium text-[#0F5132] hover:underline cursor-pointer"
                    >
                      {editingCoords ? 'Fermer' : t.shareCoordinatesCta}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#575752]">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E4E4E0]">
                      <p className="font-semibold text-[#141413] mb-0.5">
                        Vendeur ({activeConversation.sellerName})
                      </p>
                      <p className="truncate">
                        {t.locationLabel} :{' '}
                        {activeConversation.sellerLocation ||
                          activeListing?.city ||
                          'Non renseignée'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <MessageCircle className="w-3 h-3 text-[#0F5132] shrink-0" />
                        {activeConversation.sellerWhatsapp ? (
                          sellerWaHref ? (
                            <a
                              href={sellerWaHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono tabular-nums text-[#0F5132] font-medium hover:underline"
                            >
                              {activeConversation.sellerWhatsapp}
                            </a>
                          ) : (
                            <span className="font-mono tabular-nums text-[#141413]">
                              {activeConversation.sellerWhatsapp}
                            </span>
                          )
                        ) : (
                          <span>WhatsApp non partagé</span>
                        )}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#E4E4E0]">
                      <p className="font-semibold text-[#141413] mb-0.5">
                        Acheteur ({activeConversation.buyerName})
                      </p>
                      <p className="truncate">
                        {t.locationLabel} :{' '}
                        {activeConversation.buyerLocation || 'Non renseignée'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <MessageCircle className="w-3 h-3 text-[#0F5132] shrink-0" />
                        {activeConversation.buyerWhatsapp ? (
                          buyerWaHref ? (
                            <a
                              href={buyerWaHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono tabular-nums text-[#0F5132] font-medium hover:underline"
                            >
                              {activeConversation.buyerWhatsapp}
                            </a>
                          ) : (
                            <span className="font-mono tabular-nums text-[#141413]">
                              {activeConversation.buyerWhatsapp}
                            </span>
                          )
                        ) : (
                          <span>WhatsApp non partagé</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {editingCoords && (
                    <form
                      onSubmit={handleSaveConversationCoords}
                      className="mt-3 p-3 rounded-lg bg-white border border-[#E4E4E0] grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                    >
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-medium text-[#141413] mb-1">
                          Votre localisation
                        </label>
                        <input
                          type="text"
                          maxLength={BLUEPRINT_LIMITS.LOCATION_SUMMARY_MAX}
                          value={myLocation}
                          onChange={(e) => setMyLocation(e.target.value)}
                          placeholder="Quartier, Ville, Pays"
                          className="w-full px-2.5 py-1.5 rounded-md border border-[#E4E4E0] text-xs"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-medium text-[#141413] mb-1">
                          Votre numéro WhatsApp
                        </label>
                        <input
                          type="tel"
                          maxLength={BLUEPRINT_LIMITS.WHATSAPP_MAX}
                          value={myWhatsapp}
                          onChange={(e) => setMyWhatsapp(e.target.value)}
                          placeholder="+237 / +33..."
                          className="w-full px-2.5 py-1.5 rounded-md border border-[#E4E4E0] text-xs font-mono tabular-nums"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="submit"
                          disabled={savingCoords}
                          className="w-full py-1.5 px-3 bg-[#0F5132] text-white text-xs font-medium rounded-md hover:bg-[#0B3D26] cursor-pointer"
                        >
                          {savingCoords ? 'Envoi...' : 'Partager'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {activeConversation.offerStatus === 'pending' &&
                  activeConversation.offerPrice > 0 && (
                    <div className="px-5 py-3 bg-[#F7F7F5] border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-[#141413]">
                        <span className="font-semibold">
                          Offre en attente :{' '}
                          <span className="font-mono tabular-nums">
                            {formatMoney(
                              activeConversation.offerPrice,
                              activeCurrency
                            )}
                          </span>
                        </span>
                        <span className="text-[#64645F] ml-2">
                          (Prix initial :{' '}
                          {formatMoney(
                            activeConversation.listingPrice,
                            activeCurrency
                          )}
                          )
                        </span>
                      </div>
                      {!isBuyer ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={sending}
                            onClick={() => void handleOfferDecision('declined')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E4E4E0] bg-white rounded-lg text-xs font-medium text-[#141413] hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Refuser
                          </button>
                          <button
                            type="button"
                            disabled={sending}
                            onClick={() => void handleOfferDecision('accepted')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F5132] text-white rounded-lg text-xs font-medium hover:bg-[#0B3D26] cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accepter l&apos;offre
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64645F]">
                          En attente de réponse du vendeur
                        </span>
                      )}
                    </div>
                  )}

                {activeConversation.offerStatus === 'accepted' &&
                  isBuyer &&
                  activeListing &&
                  activeListing.status !== 'sold' && (
                    <div className="px-5 py-3 bg-[#0F5132]/10 border-b border-[#0F5132]/20 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-medium text-[#0F5132]">
                        Votre offre de{' '}
                        <span className="font-mono tabular-nums font-semibold">
                          {formatMoney(
                            activeConversation.offerPrice,
                            activeCurrency
                          )}
                        </span>{' '}
                        a été acceptée.
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenListing(activeListing)}
                        className="px-3.5 py-1.5 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer whitespace-nowrap"
                      >
                        Finaliser l&apos;achat
                      </button>
                    </div>
                  )}

                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user.uid;
                    const isSystem = msg.type === 'system';
                    const isOffer =
                      msg.type === 'offer' ||
                      msg.type === 'offer_accepted' ||
                      msg.type === 'offer_declined';
                    const cacheKey = `${msg.id}::${effectiveTargetLanguage}`;
                    const translated = translations[cacheKey];
                    const isTranslatingThis = translatingMsgIds.has(cacheKey);

                    if (isSystem) {
                      return (
                        <div
                          key={msg.id}
                          className="mx-auto max-w-md text-center px-3.5 py-2 rounded-lg bg-[#F7F7F5] border border-[#E4E4E0] text-xs text-[#575752]"
                        >
                          {msg.text}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[82%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                            isOffer
                              ? 'bg-[#F7F7F5] border border-[#0F5132]/30 text-[#141413]'
                              : isMine
                              ? 'bg-[#0F5132] text-white'
                              : 'bg-[#F7F7F5] text-[#141413] border border-[#E4E4E0]'
                          }`}
                        >
                          {isOffer && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F5132] mb-1">
                              <Tag className="w-3.5 h-3.5" />
                              <span>
                                {msg.type === 'offer'
                                  ? 'Proposition de prix'
                                  : msg.type === 'offer_accepted'
                                  ? 'Offre acceptée'
                                  : 'Offre déclinée'}
                              </span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>

                          {translated && (
                            <div
                              className={`mt-2 pt-2 border-t text-xs whitespace-pre-wrap break-words ${
                                isMine
                                  ? 'border-white/25 text-white/95'
                                  : 'border-[#E4E4E0] text-[#141413]'
                              }`}
                            >
                              <p className="text-[10px] opacity-75 mb-0.5">
                                {t.translatedFromLabel}{' '}
                                {translated.detectedLanguage} →{' '}
                                {translated.targetLanguage}
                              </p>
                              <p>{translated.translatedText}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="text-[11px] font-mono tabular-nums text-[#64645F]">
                            {msg.senderName} · {formatMessageTime(msg.createdAt)}
                          </span>
                          <button
                            type="button"
                            disabled={isTranslatingThis}
                            onClick={() =>
                              void translateSingleMessage(
                                msg,
                                effectiveTargetLanguage
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F5132] hover:underline cursor-pointer"
                          >
                            <Languages className="w-3 h-3" />
                            <span>
                              {isTranslatingThis
                                ? t.translatingLabel
                                : t.translateButton}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                {error && (
                  <div className="px-5 py-2 bg-red-50 border-t border-red-200 text-xs text-red-800">
                    {error}
                  </div>
                )}

                {offerMode && isBuyer && (
                  <form
                    onSubmit={handleSendOffer}
                    className="px-5 py-3 bg-[#F7F7F5] border-t border-[#E4E4E0] flex items-center gap-2"
                  >
                    <input
                      type="number"
                      min={1}
                      max={activeConversation.listingPrice}
                      required
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder={`Montant en ${activeCurrency} (max ${formatMoney(
                        activeConversation.listingPrice,
                        activeCurrency
                      )})`}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E4E4E0] bg-white text-sm font-mono tabular-nums"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="px-4 py-2 bg-[#0F5132] text-white text-xs font-medium rounded-lg hover:bg-[#0B3D26] cursor-pointer whitespace-nowrap"
                    >
                      Envoyer l&apos;offre
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferMode(false)}
                      className="px-3 py-2 text-xs text-[#64645F] hover:text-[#141413] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </form>
                )}

                <form
                  onSubmit={handleSendText}
                  className="p-4 border-t border-[#E4E4E0] bg-white flex flex-wrap sm:flex-nowrap items-center gap-2"
                >
                  {isBuyer && (
                    <button
                      type="button"
                      onClick={() => setOfferMode((v) => !v)}
                      title="Proposer un prix"
                      className="px-3 py-2.5 border border-[#E4E4E0] rounded-lg text-xs font-medium text-[#141413] hover:bg-[#F7F7F5] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Faire une offre
                    </button>
                  )}
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.MESSAGE_TEXT_MAX}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Écrire un message sécurisé..."
                    className="flex-1 min-w-[180px] px-3.5 py-2.5 rounded-lg border border-[#E4E4E0] text-sm text-[#141413] bg-[#F7F7F5]/50 focus:bg-white focus:outline-none focus:border-[#0F5132]"
                  />
                  <button
                    type="button"
                    disabled={translatingDraft || !draft.trim()}
                    onClick={() => void handleTranslateDraft()}
                    title={`${t.translateDraftButton} (${effectiveTargetLanguage})`}
                    className="inline-flex items-center gap-1 px-3 py-2.5 border border-[#E4E4E0] bg-[#F7F7F5] text-xs font-medium text-[#141413] rounded-lg hover:bg-[#EFECE6] disabled:opacity-50 shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <Languages className="w-3.5 h-3.5 text-[#0F5132]" />
                    <span className="hidden md:inline">
                      {translatingDraft
                        ? t.translatingLabel
                        : t.translateDraftButton}
                    </span>
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label="Envoyer le message"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Envoyer</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#64645F]">
                Sélectionnez une discussion pour afficher les messages.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
