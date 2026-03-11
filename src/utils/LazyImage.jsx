import React, { useState, useEffect } from 'react';
import { getCloudinaryUrl } from '@/utils/image';
import { cn } from '@/lib/utils';

/**
 * A lazy-loading image component with a shimmer placeholder effect.
 * It uses the native `loading="lazy"` attribute and shows a skeleton/shimmer
 * effect while the image is loading.
 *
 * @param {object} props - The component props.
 * @param {string} props.src - The base image URL (public ID from Cloudinary).
 * @param {string} props.alt - The alt text for the image.
 * @param {number} props.width - The target width for the image for Cloudinary optimization.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {object} [props.style] - Inline styles for the container.
 * @returns {JSX.Element}
 */
const LazyImage = ({ src, alt, width, className, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const optimizedSrc = src ? getCloudinaryUrl(src, width) : '';

  useEffect(() => {
    // When src changes, reset loaded state
    setIsLoaded(false);
  }, [src]);

  return (
    <div className={cn("relative bg-stone-200 overflow-hidden", className)}>
      {!isLoaded && <div className="absolute inset-0 shimmer" />}
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0")}
        onLoad={() => setIsLoaded(true)}
        {...props} />
    </div>
  );
};

export default LazyImage;