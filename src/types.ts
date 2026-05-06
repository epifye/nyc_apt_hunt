export type TourStatus = 'not_contacted' | 'pending_availability' | 'upcoming' | 'toured';
export type AppView = 'map' | 'list' | 'calendar';

export interface Comment {
  id: string;
  aptId: string;
  authorName: string;
  text: string;
  rating: number;
  createdAt: string;
}
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
  listingUrl?: string;
  apAvailability?: string;
  createdAt: string;
}
