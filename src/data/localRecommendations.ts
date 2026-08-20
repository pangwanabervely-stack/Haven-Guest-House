export interface LocalRecommendation {
  id: string;
  name: string;
  category: 'Wildlife & Safari' | 'Heritage & Culture' | 'Nature & Scenery' | 'Artisan & Shopping' | 'Dining & Drinks' | 'Leisure & Sports';
  distance: string;
  driveTime: string;
  rating: number;
  reviewCount: number;
  description: string;
  hostTip: string;
  imageUrl: string;
  tags: string[];
  bestTime: string;
  admission: string;
  transportAvailable: boolean;
  address: string;
}

export const LOCAL_RECOMMENDATIONS: LocalRecommendation[] = [
  {
    id: 'antelope-park',
    name: 'Antelope Park Eco-Safari Sanctuary',
    category: 'Wildlife & Safari',
    distance: '14 km',
    driveTime: '18 mins',
    rating: 4.9,
    reviewCount: 428,
    description: 'A world-renowned 3,000-acre wildlife conservancy on the outskirts of Gweru. Renowned for its lion rehabilitation program, elephant interactions, horseback safari rides, night game drives, and serene dam cruises.',
    hostTip: 'Book the late afternoon safari drive (16:00) with our reception for golden-hour wildlife viewing and breathtaking sunset photography over the water.',
    imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1000&q=80',
    tags: ['Lion Rehabilitation', 'Elephant Walk', 'Game Drive', 'Horseback Trail'],
    bestTime: 'Early Morning (07:00) or Sunset (16:00)',
    admission: 'Day Visitor passes from $15 USD',
    transportAvailable: true,
    address: 'Vungu Road, Gweru'
  },
  {
    id: 'ngamu-dam-resort',
    name: 'Ngamu Dam Resort & Waterside Leisure',
    category: 'Nature & Scenery',
    distance: '16 km',
    driveTime: '20 mins',
    rating: 4.8,
    reviewCount: 215,
    description: 'A picturesque recreational dam and lakeside resort offering tranquil boat cruises, waterside picnic gazebos, swimming facilities, and traditional open-fire braai pavilions along the serene shoreline.',
    hostTip: 'Request a customized packed lunch hamper from The Haven kitchen and spend a relaxing afternoon relaxing under the thatch pavilions overlooking the water.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    tags: ['Boat Cruises', 'Lakeside Gazebos', 'Braai Facilities', 'Scenic Panorama'],
    bestTime: '10:00 - 17:30 Daily',
    admission: 'Day Visitor access from $5 USD',
    transportAvailable: true,
    address: 'Ngamu Dam Road, Lower Gweru Basin'
  },
  {
    id: 'white-waters-dam',
    name: 'White Waters Recreational Dam & Park',
    category: 'Nature & Scenery',
    distance: '18 km',
    driveTime: '22 mins',
    rating: 4.6,
    reviewCount: 114,
    description: 'Tranquil water reservoir surrounded by indigenous miombo woodland. Ideal for quiet bass fishing, tranquil bird-watching strolls, and peaceful waterside picnicking under weeping boer-bean trees.',
    hostTip: 'Pack binoculars—over 60 species of waterbirds and kingfishers gather around the northern shoreline reeds.',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    tags: ['Bird Watching', 'Fishing', 'Peaceful Walk', 'Picnic Spot'],
    bestTime: '08:00 - 17:00 Daily',
    admission: 'Free Public Access / Nominal Dam Pass',
    transportAvailable: true,
    address: 'Old Mvuma Road, Gweru'
  },
  {
    id: 'midlands-golf-club',
    name: 'Gweru Golf Club & Country Greens',
    category: 'Leisure & Sports',
    distance: '7 km',
    driveTime: '11 mins',
    rating: 4.5,
    reviewCount: 88,
    description: 'An expansive 18-hole championship layout established in 1912 with mature indigenous acacia trees, manicured greens, full equipment hire, and a relaxed heritage clubhouse bar.',
    hostTip: 'The Haven guests receive discounted day membership privileges; simply mention your room key card at the pro shop.',
    imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1000&q=80',
    tags: ['18-Hole Golf', 'Clubhouse Dining', 'Equipment Hire', 'Lush Greens'],
    bestTime: '07:30 - 18:00',
    admission: 'Green fees from $20 USD (Guest privileges available)',
    transportAvailable: true,
    address: 'Gymkhana Road, Gweru'
  },
  {
    id: 'authentic-braai-dining',
    name: 'Midlands Traditional Boma & Flame Braai',
    category: 'Dining & Drinks',
    distance: '5 km',
    driveTime: '8 mins',
    rating: 4.8,
    reviewCount: 275,
    description: 'Celebrated open-fire Zimbabwean braai and flame-grilled meats paired with steaming sadza rezviyo (millet sadza), relish, chakalaka, and chilled local craft beverages in an open-air thatch boma.',
    hostTip: 'Try the farm-reared beef steaks seasoned with Zimbabwean peri-peri spice alongside traditional cooked covo greens.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
    tags: ['Flame Braai', 'Traditional Sadza', 'Open-air Thatch', 'Local Flavors'],
    bestTime: '12:00 - 15:00 Lunch or 18:00 - 21:30 Dinner',
    admission: 'Meals $8 - $20 USD',
    transportAvailable: true,
    address: 'Main Street & Southdowns Way, Gweru'
  }
];
