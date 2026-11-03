import { useState, type ImgHTMLAttributes } from 'react';

export default function SafeImage({ src, alt, className, style, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSource, setFailedSource] = useState<string>();
  if (!src || src === failedSource) {
    return <span role="img" aria-label={alt || '画像なし'} className={className}
      style={{ ...style, display: 'grid', placeItems: 'center', minHeight: 80, background: '#f3f4f6', color: '#6b7280' }}>画像なし</span>;
  }
  return <img {...props} src={src} alt={alt || ''} className={className} style={style}
    onError={() => setFailedSource(src)} />;
}
