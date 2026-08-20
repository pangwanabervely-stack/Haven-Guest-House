import React, { useState, useEffect } from 'react';
import { getRoomImageUrl, getMenuItemImageUrl, PROPERTY_IMAGES } from '../../lib/images';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  roomNumber?: string;
  roomType?: string;
  menuItemName?: string;
  menuItemCategory?: string;
}

const DEFAULT_FALLBACK = PROPERTY_IMAGES.hero;

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  roomNumber,
  roomType,
  menuItemName,
  menuItemCategory,
  alt = 'The Haven Guest House',
  className = '',
  ...props
}) => {
  const computeInitialSrc = (): string => {
    // If it's a room
    if (roomNumber || roomType) {
      return getRoomImageUrl({ room_number: roomNumber, room_type: roomType, image_url: typeof src === 'string' ? src : undefined });
    }
    // If it's a menu item
    if (menuItemName || menuItemCategory) {
      return getMenuItemImageUrl({ name: menuItemName, category: menuItemCategory, image_url: typeof src === 'string' ? src : undefined });
    }
    // If src is a valid remote URL
    if (src && typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
      return src;
    }
    // If src is a local path like /images/rooms/room-101.jpg
    if (src && typeof src === 'string' && src.includes('room-')) {
      const match = src.match(/room-(\d+)/);
      if (match && match[1]) {
        return getRoomImageUrl({ room_number: match[1] });
      }
    }
    // If src is a local path like /images/menu/...
    if (src && typeof src === 'string' && src.includes('/menu/')) {
      return getMenuItemImageUrl({ image_url: src });
    }
    return (src as string) || fallbackSrc;
  };

  const [imgSrc, setImgSrc] = useState<string>(computeInitialSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setHasError(false);
    setImgSrc(computeInitialSrc());
  }, [src, fallbackSrc, roomNumber, roomType, menuItemName, menuItemCategory]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      if (roomNumber || roomType) {
        setImgSrc(getRoomImageUrl({ room_number: roomNumber, room_type: roomType }));
      } else if (menuItemName || menuItemCategory) {
        setImgSrc(getMenuItemImageUrl({ name: menuItemName, category: menuItemCategory }));
      } else {
        setImgSrc(fallbackSrc);
      }
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      referrerPolicy="no-referrer"
      className={className}
      {...props}
    />
  );
};
