export type TourStatus = 'not_contacted' | 'upcoming' | 'toured';
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
  listingUrl?: string;
  createdAt: string;
}
