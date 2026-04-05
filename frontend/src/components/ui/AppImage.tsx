'use client';

import Image from 'next/image';

export default function AppImage({
  src,
  alt,
  className,
  fill = false,
  sizes = '(max-width: 768px) 100vw, 33vw',
  width = 800,
  height = 600,
  style,
  priority = false,
}) {
  if (!src) {
    return null;
  }

  if (src.startsWith('http')) {
    return <img src={src} alt={alt} className={className} style={style} loading={priority ? 'eager' : 'lazy'} />;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        style={style}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      style={style}
      priority={priority}
    />
  );
}
