import { useState } from 'react';
import { Package } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function SafeImage({ src, alt, className = '' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-[#ECEAE4] flex flex-col items-center justify-center text-[#6E6E68] p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-7 h-7 mb-1.5 opacity-60" strokeWidth={1.5} />
        <span className="text-xs text-center line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
