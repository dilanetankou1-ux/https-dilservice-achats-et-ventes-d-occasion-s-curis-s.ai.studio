export interface WorldLanguage {
  code: string;
  label: string;
  nativeName: string;
  region: string;
  rtl?: boolean;
}

export const WORLD_LANGUAGES: WorldLanguage[] = [
  { code: 'fr', label: 'Français', nativeName: 'Français', region: 'Europe & Afrique' },
  { code: 'en', label: 'Anglais', nativeName: 'English', region: 'International' },
  { code: 'es', label: 'Espagnol', nativeName: 'Español', region: 'Europe & Amériques' },
  { code: 'pt', label: 'Portugais', nativeName: 'Português', region: 'Europe, Afrique & Amériques' },
  { code: 'ar', label: 'Arabe', nativeName: 'العربية', region: 'Afrique du Nord & Moyen-Orient', rtl: true },
  { code: 'de', label: 'Allemand', nativeName: 'Deutsch', region: 'Europe' },
  { code: 'it', label: 'Italien', nativeName: 'Italiano', region: 'Europe' },
  { code: 'nl', label: 'Néerlandais', nativeName: 'Nederlands', region: 'Europe' },
  { code: 'sw', label: 'Swahili', nativeName: 'Kiswahili', region: 'Afrique de l’Est' },
  { code: 'yo', label: 'Yoruba', nativeName: 'Yorùbá', region: 'Afrique de l’Ouest' },
  { code: 'ha', label: 'Haoussa', nativeName: 'Hausa', region: 'Afrique de l’Ouest' },
  { code: 'wo', label: 'Wolof', nativeName: 'Wolof', region: 'Afrique de l’Ouest' },
  { code: 'am', label: 'Amharique', nativeName: 'አማርኛ', region: 'Afrique de l’Est' },
  { code: 'zu', label: 'Zoulou', nativeName: 'isiZulu', region: 'Afrique Australe' },
  { code: 'zh', label: 'Chinois (Mandarin)', nativeName: '中文', region: 'Asie' },
  { code: 'ja', label: 'Japonais', nativeName: '日本語', region: 'Asie' },
  { code: 'ko', label: 'Coréen', nativeName: '한국어', region: 'Asie' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', region: 'Asie' },
  { code: 'tr', label: 'Turc', nativeName: 'Türkçe', region: 'Eurasie' },
  { code: 'ru', label: 'Russe', nativeName: 'Русский', region: 'Europe & Asie' },
  { code: 'pl', label: 'Polonais', nativeName: 'Polski', region: 'Europe' },
  { code: 'vi', label: 'Vietnamien', nativeName: 'Tiếng Việt', region: 'Asie' },
  { code: 'id', label: 'Indonésien', nativeName: 'Bahasa Indonesia', region: 'Asie & Océanie' },
  { code: 'uk', label: 'Ukrainien', nativeName: 'Українська', region: 'Europe' },
];

export type UiTranslations = {
  navExplore: string;
  navConverter: string;
  navMessages: string;
  navActivity: string;
  navAccount: string;
  navSignIn: string;
  navCreateListing: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroTrustLeft: string;
  heroTrustRight: string;
  searchPlaceholder: string;
  displayIn: string;
  availableOnly: string;
  allListings: string;
  sortRecent: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  allContinents: string;
  allCategories: string;
  messagesTitle: string;
  messagesSubtitle: string;
  messagesSecurityBadge: string;
  translateTargetLabel: string;
  translateCustomPlaceholder: string;
  translateButton: string;
  translatingLabel: string;
  translatedFromLabel: string;
  translateDraftButton: string;
  autoTranslateToggle: string;
  contactsHeader: string;
  whatsappLabel: string;
  locationLabel: string;
  shareCoordinatesCta: string;
  accountTitle: string;
  accountSubtitle: string;
  activityTitle: string;
  activitySubtitle: string;
};

const FR_STRINGS: UiTranslations = {
  navExplore: 'Explorer',
  navConverter: 'Convertisseur',
  navMessages: 'Messagerie',
  navActivity: 'Activité',
  navAccount: 'Compte',
  navSignIn: 'Connexion',
  navCreateListing: 'Déposer une annonce',
  heroEyebrow: 'Afrique · Europe · Amériques · International',
  heroTitle: 'Vendez et achetez entre particuliers, partout et en toute confiance.',
  heroSubtitle:
    'Dilservice connecte particuliers en Afrique, en Europe et dans le monde entier avec localisation précise, WhatsApp sécurisé, traduction multilingue et paiement par carte bancaire, MTN MoMo ou Orange Money.',
  heroPrimaryCta: 'Parcourir les annonces',
  heroSecondaryCta: 'Convertir des devises',
  heroTrustLeft: 'Messagerie sécurisée & traduction mondiale',
  heroTrustRight: 'Cartes bancaires, MTN MoMo & Orange Money',
  searchPlaceholder: 'Rechercher un article, Douala, Paris, Dakar...',
  displayIn: 'Afficher en',
  availableOnly: 'Disponibles uniquement',
  allListings: 'Toutes',
  sortRecent: 'Plus récents',
  sortPriceAsc: 'Prix croissant',
  sortPriceDesc: 'Prix décroissant',
  allContinents: 'Tous les continents',
  allCategories: 'Tout',
  messagesTitle: 'Messagerie sécurisée',
  messagesSubtitle:
    'Échanges privés entre particuliers, traduction instantanée vers toutes les langues, localisations et contacts WhatsApp.',
  messagesSecurityBadge: 'Identités vérifiées · Traduction multilingue',
  translateTargetLabel: 'Traduire vers',
  translateCustomPlaceholder: 'Autre langue (ex. Lingála, Tamoul...)',
  translateButton: 'Traduire',
  translatingLabel: 'Traduction...',
  translatedFromLabel: 'Traduit depuis',
  translateDraftButton: 'Traduire mon message',
  autoTranslateToggle: 'Traduire auto',
  contactsHeader: 'Localisations & Contacts WhatsApp',
  whatsappLabel: 'WhatsApp',
  locationLabel: 'Localisation',
  shareCoordinatesCta: 'Partager / modifier mes coordonnées',
  accountTitle: 'Mon compte & Paiements',
  accountSubtitle:
    'Gérez votre localisation, votre numéro WhatsApp, votre langue, votre devise préférée et vos moyens de paiement.',
  activityTitle: 'Activité sur Dilservice',
  activitySubtitle:
    'Retrouvez vos annonces en vente, vos favoris et le suivi complet de vos transactions.',
};

const TRANSLATIONS: Record<string, UiTranslations> = {
  fr: FR_STRINGS,
  en: {
    navExplore: 'Explore',
    navConverter: 'Converter',
    navMessages: 'Messages',
    navActivity: 'Activity',
    navAccount: 'Account',
    navSignIn: 'Sign in',
    navCreateListing: 'Post listing',
    heroEyebrow: 'Africa · Europe · Americas · Global',
    heroTitle: 'Buy and sell second-hand items peer-to-peer, anywhere with confidence.',
    heroSubtitle:
      'Dilservice connects individuals across Africa, Europe, and worldwide with verified locations, WhatsApp handoff, instant message translation, and payments by Bank Card, MTN MoMo, or Orange Money.',
    heroPrimaryCta: 'Browse listings',
    heroSecondaryCta: 'Convert currencies',
    heroTrustLeft: 'Secure messaging & global translation',
    heroTrustRight: 'Bank Cards, MTN MoMo & Orange Money',
    searchPlaceholder: 'Search an item, Douala, Paris, London...',
    displayIn: 'Display in',
    availableOnly: 'Available only',
    allListings: 'All',
    sortRecent: 'Most recent',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    allContinents: 'All continents',
    allCategories: 'All',
    messagesTitle: 'Secure Messaging',
    messagesSubtitle:
      'Private peer-to-peer negotiations, instant translation to any language, locations, and WhatsApp coordination.',
    messagesSecurityBadge: 'Verified identities · Multilingual translation',
    translateTargetLabel: 'Translate to',
    translateCustomPlaceholder: 'Any language (e.g. Swahili, Japanese...)',
    translateButton: 'Translate',
    translatingLabel: 'Translating...',
    translatedFromLabel: 'Translated from',
    translateDraftButton: 'Translate my draft',
    autoTranslateToggle: 'Auto-translate',
    contactsHeader: 'Locations & WhatsApp Contacts',
    whatsappLabel: 'WhatsApp',
    locationLabel: 'Location',
    shareCoordinatesCta: 'Share / edit my contact info',
    accountTitle: 'Account & Payments',
    accountSubtitle:
      'Manage your location, WhatsApp number, preferred language, currency, and payment methods.',
    activityTitle: 'Activity on Dilservice',
    activitySubtitle:
      'Manage your active listings, saved favorites, and order handoff tracking.',
  },
  es: {
    navExplore: 'Explorar',
    navConverter: 'Conversor',
    navMessages: 'Mensajes',
    navActivity: 'Actividad',
    navAccount: 'Cuenta',
    navSignIn: 'Entrar',
    navCreateListing: 'Publicar anuncio',
    heroEyebrow: 'África · Europa · Américas · Internacional',
    heroTitle: 'Compra y vende artículos de segunda mano entre particulares con confianza.',
    heroSubtitle:
      'Dilservice conecta particulares en África, Europa y el mundo con ubicación precisa, contacto WhatsApp, traducción multilingüe y pago con tarjeta bancaria, MTN MoMo u Orange Money.',
    heroPrimaryCta: 'Ver anuncios',
    heroSecondaryCta: 'Convertir divisas',
    heroTrustLeft: 'Mensajería segura y traducción global',
    heroTrustRight: 'Tarjetas bancarias, MTN MoMo y Orange Money',
    searchPlaceholder: 'Buscar artículo, Madrid, Douala, París...',
    displayIn: 'Mostrar en',
    availableOnly: 'Solo disponibles',
    allListings: 'Todas',
    sortRecent: 'Más recientes',
    sortPriceAsc: 'Precio ascendente',
    sortPriceDesc: 'Precio descendente',
    allContinents: 'Todos los continentes',
    allCategories: 'Todo',
    messagesTitle: 'Mensajería segura',
    messagesSubtitle:
      'Negociación privada entre particulares, traducción instantánea a cualquier idioma, ubicaciones y WhatsApp.',
    messagesSecurityBadge: 'Identidades verificadas · Traducción multilingüe',
    translateTargetLabel: 'Traducir a',
    translateCustomPlaceholder: 'Cualquier idioma...',
    translateButton: 'Traducir',
    translatingLabel: 'Traduciendo...',
    translatedFromLabel: 'Traducido de',
    translateDraftButton: 'Traducir borrador',
    autoTranslateToggle: 'Auto-traducir',
    contactsHeader: 'Ubicaciones y Contactos WhatsApp',
    whatsappLabel: 'WhatsApp',
    locationLabel: 'Ubicación',
    shareCoordinatesCta: 'Compartir / editar mis datos',
    accountTitle: 'Cuenta y Pagos',
    accountSubtitle:
      'Gestiona tu ubicación, número de WhatsApp, idioma, moneda y métodos de pago.',
    activityTitle: 'Actividad en Dilservice',
    activitySubtitle:
      'Consulta tus anuncios publicados, favoritos y el seguimiento de tus pedidos.',
  },
  pt: {
    navExplore: 'Explorar',
    navConverter: 'Conversor',
    navMessages: 'Mensagens',
    navActivity: 'Atividade',
    navAccount: 'Conta',
    navSignIn: 'Entrar',
    navCreateListing: 'Publicar anúncio',
    heroEyebrow: 'África · Europa · Américas · Internacional',
    heroTitle: 'Compre e venda produtos usados entre particulares com total confiança.',
    heroSubtitle:
      'Dilservice conecta particulares em África, Europa e no mundo com localização, WhatsApp seguro, tradução de mensagens e pagamento por cartão bancário, MTN MoMo ou Orange Money.',
    heroPrimaryCta: 'Explorar anúncios',
    heroSecondaryCta: 'Converter moedas',
    heroTrustLeft: 'Mensagens seguras e tradução global',
    heroTrustRight: 'Cartões bancários, MTN MoMo e Orange Money',
    searchPlaceholder: 'Pesquisar artigo, Lisboa, Luanda, Paris...',
    displayIn: 'Exibir em',
    availableOnly: 'Apenas disponíveis',
    allListings: 'Todos',
    sortRecent: 'Mais recentes',
    sortPriceAsc: 'Menor preço',
    sortPriceDesc: 'Maior preço',
    allContinents: 'Todos os continentes',
    allCategories: 'Tudo',
    messagesTitle: 'Mensagens seguras',
    messagesSubtitle:
      'Conversas privadas, tradução instantânea para qualquer idioma, localizações e WhatsApp.',
    messagesSecurityBadge: 'Identidades verificadas · Tradução global',
    translateTargetLabel: 'Traduzir para',
    translateCustomPlaceholder: 'Qualquer idioma...',
    translateButton: 'Traduzir',
    translatingLabel: 'Traduzindo...',
    translatedFromLabel: 'Traduzido de',
    translateDraftButton: 'Traduzir rascunho',
    autoTranslateToggle: 'Auto-traduzir',
    contactsHeader: 'Localizações e Contatos WhatsApp',
    whatsappLabel: 'WhatsApp',
    locationLabel: 'Localização',
    shareCoordinatesCta: 'Partilhar / editar os meus dados',
    accountTitle: 'Conta e Pagamentos',
    accountSubtitle:
      'Gerencie a sua localização, número WhatsApp, idioma, moeda e métodos de pagamento.',
    activityTitle: 'Atividade no Dilservice',
    activitySubtitle:
      'Consulte os seus anúncios, favoritos e acompanhamento de encomendas.',
  },
  ar: {
    navExplore: 'استكشاف',
    navConverter: 'محول العملات',
    navMessages: 'الرسائل',
    navActivity: 'النشاط',
    navAccount: 'الحساب',
    navSignIn: 'تسجيل الدخول',
    navCreateListing: 'نشر إعلان',
    heroEyebrow: 'أفريقيا · أوروبا · الأمريكتان · دولي',
    heroTitle: 'بع واشترِ المنتجات المستعملة بين الأفراد في أي مكان بكل ثقة.',
    heroSubtitle:
      'يربط Dilservice الأفراد في أفريقيا وأوروبا والعالم مع تحديد الموقع وواتساب والترجمة الفورية والدفع بالبطاقة البنكية أو MTN MoMo أو Orange Money.',
    heroPrimaryCta: 'تصفح الإعلانات',
    heroSecondaryCta: 'تحويل العملات',
    heroTrustLeft: 'مراسلة آمنة وترجمة عالمية',
    heroTrustRight: 'بطاقات بنكية و MTN MoMo و Orange Money',
    searchPlaceholder: 'ابحث عن منتج أو مدينة...',
    displayIn: 'عرض بـ',
    availableOnly: 'المتوفرة فقط',
    allListings: 'الكل',
    sortRecent: 'الأحدث',
    sortPriceAsc: 'الأقل سعراً',
    sortPriceDesc: 'الأعلى سعراً',
    allContinents: 'كل القارات',
    allCategories: 'الكل',
    messagesTitle: 'المراسلة الآمنة',
    messagesSubtitle:
      'محادثات خاصة، ترجمة فورية إلى أي لغة، ومشاركة الموقع وواتساب.',
    messagesSecurityBadge: 'هويات موثقة · ترجمة متعددة اللغات',
    translateTargetLabel: 'ترجمة إلى',
    translateCustomPlaceholder: 'أي لغة أخرى...',
    translateButton: 'ترجمة',
    translatingLabel: 'جارٍ الترجمة...',
    translatedFromLabel: 'مترجم من',
    translateDraftButton: 'ترجمة رسالتي',
    autoTranslateToggle: 'ترجمة تلقائية',
    contactsHeader: 'المواقع وجهات اتصال واتساب',
    whatsappLabel: 'واتساب',
    locationLabel: 'الموقع',
    shareCoordinatesCta: 'مشاركة / تعديل بياناتي',
    accountTitle: 'الحساب والمدفوعات',
    accountSubtitle:
      'أدر موقعك ورقم واتساب واللغة والعملة ووسائل الدفع الخاصة بك.',
    activityTitle: 'النشاط على Dilservice',
    activitySubtitle: 'تابع إعلاناتك والمفضلة وحالة طلباتك.',
  },
  de: {
    ...FR_STRINGS,
    navExplore: 'Entdecken',
    navConverter: 'Währungsrechner',
    navMessages: 'Nachrichten',
    navActivity: 'Aktivität',
    navAccount: 'Konto',
    navSignIn: 'Anmelden',
    navCreateListing: 'Anzeige aufgeben',
    heroTitle: 'Gebrauchtwaren sicher von Privat zu Privat kaufen und verkaufen.',
    heroPrimaryCta: 'Anzeigen ansehen',
    heroSecondaryCta: 'Währungen umrechnen',
    searchPlaceholder: 'Artikel, Stadt oder Land suchen...',
    displayIn: 'Anzeigen in',
    availableOnly: 'Nur verfügbare',
    allListings: 'Alle',
    allContinents: 'Alle Kontinente',
    allCategories: 'Alle',
    messagesTitle: 'Sichere Nachrichten',
    translateTargetLabel: 'Übersetzen nach',
    translateButton: 'Übersetzen',
    translatingLabel: 'Übersetze...',
    translateDraftButton: 'Entwurf übersetzen',
    autoTranslateToggle: 'Auto-Übersetzung',
    contactsHeader: 'Standorte & WhatsApp-Kontakte',
  },
  zh: {
    ...FR_STRINGS,
    navExplore: '浏览',
    navConverter: '汇率换算',
    navMessages: '消息',
    navActivity: '动态',
    navAccount: '账户',
    navSignIn: '登录',
    navCreateListing: '发布商品',
    heroTitle: '随时随地安心进行全球个人二手商品交易。',
    heroPrimaryCta: '浏览商品',
    heroSecondaryCta: '货币换算',
    searchPlaceholder: '搜索商品、城市或国家...',
    displayIn: '显示货币',
    availableOnly: '仅看可购',
    allListings: '全部',
    allContinents: '全部大洲',
    allCategories: '全部',
    messagesTitle: '安全私信',
    translateTargetLabel: '翻译成',
    translateButton: '翻译',
    translatingLabel: '翻译中...',
    translateDraftButton: '翻译草稿',
    autoTranslateToggle: '自动翻译',
    contactsHeader: '位置与 WhatsApp 联系方式',
  },
  sw: {
    ...FR_STRINGS,
    navExplore: 'Gundua',
    navConverter: 'Kigeuzi',
    navMessages: 'Ujumbe',
    navActivity: 'Shughuli',
    navAccount: 'Akaunti',
    navSignIn: 'Ingia',
    navCreateListing: 'Tangaza bidhaa',
    heroTitle: 'Uza na nunua bidhaa za mitumba kati ya watu binafsi kwa usalama.',
    heroPrimaryCta: 'Tazama matangazo',
    heroSecondaryCta: 'Badilisha sarafu',
    searchPlaceholder: 'Tafuta bidhaa, Nairobi, Douala, Paris...',
    displayIn: 'Onyesha kwa',
    availableOnly: 'Zinazopatikana tu',
    allListings: 'Zote',
    allContinents: 'Mabara yote',
    allCategories: 'Zote',
    messagesTitle: 'Ujumbe Salama',
    translateTargetLabel: 'Tafsiri kwenda',
    translateButton: 'Tafsiri',
    translatingLabel: 'Inatafsiri...',
    translateDraftButton: 'Tafsiri ujumbe wangu',
    autoTranslateToggle: 'Tafsiri otomatiki',
    contactsHeader: 'Maeneo na Namba za WhatsApp',
  },
};

export function getUiStrings(langCode: string): UiTranslations {
  return TRANSLATIONS[langCode] || TRANSLATIONS.en || FR_STRINGS;
}

export function getLanguageMeta(langCode: string): WorldLanguage {
  return (
    WORLD_LANGUAGES.find((l) => l.code === langCode) || {
      code: langCode,
      label: langCode,
      nativeName: langCode,
      region: 'International',
    }
  );
}

export async function translateTextWithApi(params: {
  text: string;
  targetLanguage: string;
  context?: string;
}): Promise<{ detectedLanguage: string; translatedText: string }> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as {
    detectedLanguage?: string;
    translatedText?: string;
    error?: string;
  };
  if (!res.ok || !data.translatedText) {
    throw new Error(data.error || 'La traduction a échoué.');
  }
  return {
    detectedLanguage: data.detectedLanguage || 'Auto',
    translatedText: data.translatedText,
  };
}
