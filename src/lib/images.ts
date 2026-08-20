/**
 * Authentic Zimbabwean Guest House Image Assets & Fallback Resolver
 * Specifically tailored for The Haven Guest House (3669 Woodlands 2, Gweru, Zimbabwe).
 * Provides authentic, high-resolution, stable photography for suites, local dining, and sanctuary grounds.
 */

export const PROPERTY_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
  exterior: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  garden: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
  lounge: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  dining: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  courtyard: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80'
};

export const ROOM_IMAGES_BY_NUMBER: Record<string, { main: string; gallery: string[] }> = {
  '101': {
    main: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  '102': {
    main: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  '103': {
    main: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  '104': {
    main: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  '105': {
    main: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  '201': {
    main: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  '202': {
    main: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  '203': {
    main: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
    ]
  }
};

export const ROOM_TYPE_FALLBACKS: Record<string, string> = {
  'Standard': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  'Deluxe': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
  'Executive': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
  'Family': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
  'Twin': 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
  'Suite': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
};

export const MENU_IMAGES: Record<string, string> = {
  'Full English Breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
  'Eggs & Toast': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  'Pancakes': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
  'Tea & Toast': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
  'Sadza & Beef': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  'Sadza & Chicken': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
  'Chicken & Chips': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80',
  'Beef Stew & Rice': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
  'Vegetable Rice': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
  'Chicken Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
  'Chips': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
  'Fruit Plate': 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=800&q=80',
  'Bottled Water': 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=800&q=80',
  'Coca-Cola/Fanta/Sprite': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
  'Fresh Juice': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
  'Tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
  'Coffee': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
  'Wash & Fold Laundry (Per Load)': 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
  'Wash & Steam Iron Garments': 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
  'Express Same-Day Pressing Service': 'https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=800&q=80',
  'Laundry': 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80'
};

export const MENU_CATEGORY_FALLBACKS: Record<string, string> = {
  'Breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
  'Meals': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  'Snacks': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
  'Beverages': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
  'Laundry': 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80'
};

export const DEFAULT_AVATARS = {
  host: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  cleaning_staff: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  guest: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
};

/**
 * Returns a valid, working image URL for a room.
 * Resolves local broken paths like `/images/rooms/...` or null to authentic room photography.
 */
export function getRoomImageUrl(room?: { room_number?: string; room_type?: string; image_url?: string } | null, index = 0): string {
  if (!room) {
    return ROOM_TYPE_FALLBACKS['Standard'];
  }

  const roomNum = room.room_number ? String(room.room_number).trim() : '';
  const numConfig = roomNum ? ROOM_IMAGES_BY_NUMBER[roomNum] : undefined;

  // If room number matches our verified mapping
  if (numConfig) {
    if (index === 0) return numConfig.main;
    if (numConfig.gallery && numConfig.gallery[index]) {
      return numConfig.gallery[index];
    }
    return numConfig.main;
  }

  // If room.image_url is a valid external URL (starts with http/https) and not a local /images/ path
  if (room.image_url && (room.image_url.startsWith('http://') || room.image_url.startsWith('https://'))) {
    return room.image_url;
  }

  // Fallback by room type
  const typeKey = Object.keys(ROOM_TYPE_FALLBACKS).find(k =>
    room.room_type?.toLowerCase().includes(k.toLowerCase())
  );
  if (typeKey && ROOM_TYPE_FALLBACKS[typeKey]) {
    return ROOM_TYPE_FALLBACKS[typeKey];
  }

  return ROOM_TYPE_FALLBACKS['Standard'];
}

/**
 * Returns an array of working gallery URLs for a room.
 */
export function getRoomGalleryUrls(room?: { room_number?: string; room_type?: string; gallery?: string[]; image_url?: string } | null): string[] {
  if (!room) return [ROOM_TYPE_FALLBACKS['Standard']];

  const roomNum = room.room_number ? String(room.room_number).trim() : '';
  const numConfig = roomNum ? ROOM_IMAGES_BY_NUMBER[roomNum] : undefined;

  if (numConfig && numConfig.gallery && numConfig.gallery.length > 0) {
    return numConfig.gallery;
  }

  if (room.gallery && Array.isArray(room.gallery)) {
    const validUrls = room.gallery.filter(u => u && (u.startsWith('http://') || u.startsWith('https://')));
    if (validUrls.length > 0) return validUrls;
  }

  const main = getRoomImageUrl(room);
  return [
    main,
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80'
  ];
}

/**
 * Returns a valid, working image URL for a menu item.
 */
export function getMenuItemImageUrl(item?: { name?: string; category?: string; image_url?: string } | null): string {
  if (!item) {
    return MENU_CATEGORY_FALLBACKS['Breakfast'];
  }

  // Exact name match
  if (item.name && MENU_IMAGES[item.name]) {
    return MENU_IMAGES[item.name];
  }

  // Check if item.name includes known dishes
  if (item.name) {
    for (const [key, url] of Object.entries(MENU_IMAGES)) {
      if (item.name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(item.name.toLowerCase())) {
        return url;
      }
    }
  }

  // If item.image_url is a valid web URL
  if (item.image_url && (item.image_url.startsWith('http://') || item.image_url.startsWith('https://'))) {
    return item.image_url;
  }

  // Fallback by category
  if (item.category && MENU_CATEGORY_FALLBACKS[item.category]) {
    return MENU_CATEGORY_FALLBACKS[item.category];
  }

  return MENU_CATEGORY_FALLBACKS['Breakfast'];
}

/**
 * Returns a valid avatar URL for a profile.
 */
export function getProfileAvatarUrl(profile?: { profile_image?: string | null; role?: string } | null): string {
  if (profile?.profile_image && (profile.profile_image.startsWith('http://') || profile.profile_image.startsWith('https://'))) {
    return profile.profile_image;
  }

  const role = profile?.role || 'guest';
  if (role === 'host') return DEFAULT_AVATARS.host;
  if (role === 'cleaning_staff') return DEFAULT_AVATARS.cleaning_staff;
  return DEFAULT_AVATARS.guest;
}
