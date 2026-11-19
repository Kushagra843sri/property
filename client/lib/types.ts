/** An area from GET /properties/areas. Top areas come first in the API's order. */
export interface AreaOption {
  name: string;
  count: number;
  top: boolean;
}

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PropertyImage {
  url: string;
  alt?: string | null;
  order?: number | null;
}

export interface Property {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  purpose: 'buy' | 'rent';
  price: number | null; // null: no price entered, so none is shown
  priceUnit: 'total' | 'per-month';
  bhk?: number;
  bathrooms?: number;
  carpetArea?: number;
  builtUpArea?: number;
  areaUnit?: 'sqft' | 'sqyd' | 'sqm' | 'acre';
  furnishing?: string;
  floor?: number;
  totalFloors?: number;
  facing?: string;
  ageOfProperty?: number;
  possession?: string;
  address: { line?: string; locality?: string; city: string; state?: string; pincode?: string };
  geo?: { lat?: number; lng?: number };
  amenities: string[];
  images: PropertyImage[];
  status: 'available' | 'sold' | 'rented' | 'hidden';
  featured: boolean;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  phoneVerified: boolean;
  status: 'active' | 'withdrawn';
  consentGiven: boolean;
}

export interface AdminProperty extends Omit<Property, 'images'> {
  viewCount?: number;
  images: { url: string; publicId: string; alt?: string | null; order?: number | null }[];
}
