import { Heart } from 'lucide-react';
import { convertCurrency, formatMoney } from '../lib/currency';
import {
  CATEGORY_LABELS,
  CONTINENT_LABELS,
  LISTING_STATUS_LABELS,
  type CurrencyCode,
  type Listing,
} from '../types/marketplace';
import { SafeImage } from './SafeImage';

interface ListingCardProps {
  listing: Listing;
  isFavorited: boolean;
  displayCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onToggleFavorite: (listing: Listing) => void;
  onSelect: (listing: Listing) => void;
}

export function ListingCard({
  listing,
  isFavorited,
  displayCurrency,
  rates,
  onToggleFavorite,
  onSelect,
}: ListingCardProps) {
  const isAvailable = listing.status === 'available';
  const itemCurrency: CurrencyCode = listing.currency || 'EUR';
  const itemRegion = listing.region || 'europe';
  const showConverted = itemCurrency !== displayCurrency;
  const convertedPrice = showConverted
    ? convertCurrency(listing.price, itemCurrency, displayCurrency, rates)
    : listing.price;

  return (
    <article className="group bg-white border border-[#E4E4E0] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-12px_rgba(20,20,19,0.14)] flex flex-col">
      <div className="relative aspect-[4/3] bg-[#EFECE6] overflow-hidden">
        <button
          type="button"
          onClick={() => onSelect(listing)}
          className="block w-full h-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F5132]"
        >
          <SafeImage
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(listing);
          }}
          aria-label={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`absolute top-3 right-3 w-10 h-10 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
            isFavorited
              ? 'bg-[#0F5132] border-[#0F5132] text-white'
              : 'bg-white/95 border-[#E4E4E0] text-[#141413] hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {!isAvailable && (
          <div className="absolute bottom-0 inset-x-0 bg-[#141413]/80 px-3 py-1.5 text-xs font-medium text-white">
            {LISTING_STATUS_LABELS[listing.status]}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect(listing)}
        className="p-4 flex-1 flex flex-col justify-between text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F5132]"
      >
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#64645F] mb-1.5 truncate">
            <span>{CATEGORY_LABELS[listing.category]}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">
              {listing.city}
              {listing.country ? `, ${listing.country}` : ''}
              {listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{CONTINENT_LABELS[itemRegion]}</span>
          </div>

          <h3 className="text-[15px] font-semibold text-[#141413] leading-snug line-clamp-2 mb-1.5">
            {listing.title}
          </h3>

          {listing.itemSpecs ? (
            <p className="text-xs text-[#64645F] line-clamp-1 mb-3">
              {listing.itemSpecs}
            </p>
          ) : (
            <p className="text-xs text-[#64645F] line-clamp-1 mb-3">
              {listing.description}
            </p>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-[#F0EFEA]">
          <div className="min-w-0">
            <span className="font-mono tabular-nums text-[15px] font-medium text-[#141413] block">
              {formatMoney(listing.price, itemCurrency)}
            </span>
            {showConverted && (
              <span className="font-mono tabular-nums text-[11px] text-[#64645F] block">
                ≈ {formatMoney(convertedPrice, displayCurrency)}
              </span>
            )}
          </div>
          <span className="text-xs text-[#64645F] truncate max-w-[120px] shrink-0">
            {listing.sellerName}
          </span>
        </div>
      </button>
    </article>
  );
}
