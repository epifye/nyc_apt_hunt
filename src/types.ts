export type TourStatus = 'not_contacted' | 'pending_availability' | 'upcoming' | 'toured';

export interface BlockedSlot {
  id: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM (24h)
  endTime: string;    // HH:MM (24h)
  label?: string;
  createdAt: string;
}
export type AppView = 'map' | 'list' | 'calendar';
export type ApartmentType = 'studio' | '1br' | '2br' | '3br+';

export interface Apartment {
  id: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  type: ApartmentType;
  laundry: boolean;
  monthlyCost: number;
  sunlight: number;
  kitchenUsable: number;
  notes: string;
  tourStatus: TourStatus;
  tourDate?: string;
  availableDate?: string;
  aptNumber?: string;
  listingImageUrl?: string;
  listingImageUrls?: string[];
  listingUrl?: string;
  tentativeTourDate?: string;
  createdAt: string;
}
