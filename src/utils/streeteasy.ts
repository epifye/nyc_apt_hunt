import { ApartmentType } from '../types';

export interface StreetEasyExtracted {
  address: string;
  aptNumber?: string;
  listingImageUrl?: string;
  listingImageUrls?: string[];
  monthlyCost?: number;
  type?: ApartmentType;
  neighborhood?: string;
  notes?: string;
  laundry?: boolean;
  availableDate?: string;
  listingUrl?: string;
}

export function parseStreetEasyHtml(html: string): StreetEasyExtracted {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Address — prefer the full building address from "About the building" section
  // which includes city + ZIP (e.g. "29 Orchard Street, New York, NY 10002")
  const buildingAddressEl = doc.querySelector('[data-testid="about-building-section"] h6 + p');
  const unitAddressEl = doc.querySelector('[data-testid="address"]');
  if (!buildingAddressEl?.textContent?.trim() && !unitAddressEl?.textContent?.trim()) {
    throw new Error('Could not find listing details in this HTML. Make sure you copied the full page source of a StreetEasy listing.');
  }
  const address = buildingAddressEl?.textContent?.trim()
    ?? `${unitAddressEl!.textContent!.trim()}, New York, NY`;

  // Apt number — extract from unit address element (e.g. "Apt 7R", "#2F", "Unit 3B")
  let aptNumber: string | undefined;
  const unitText = unitAddressEl?.textContent?.trim() ?? '';
  const aptMatch = unitText.match(/(?:#|Apt\.?\s+|Unit\s+)([A-Z0-9]+)/i);
  if (aptMatch) aptNumber = aptMatch[1].toUpperCase();

  // Price — h4 inside data-testid="priceInfo"
  let monthlyCost: number | undefined;
  const priceEl = doc.querySelector('[data-testid="priceInfo"] h4');
  if (priceEl?.textContent) {
    const n = parseInt(priceEl.textContent.replace(/[^0-9]/g, ''));
    if (!isNaN(n)) monthlyCost = n;
  }

  // Unit type — "Studio", "1 bed", "2 beds" etc in property detail items
  let type: ApartmentType | undefined;
  const detailItems = doc.querySelectorAll('[data-testid="propertyDetails"] p');
  for (const item of detailItems) {
    const t = item.textContent?.toLowerCase() ?? '';
    if (t.includes('studio'))     { type = 'studio'; break; }
    if (t.match(/\b1\s*bed/))     { type = '1br';    break; }
    if (t.match(/\b2\s*bed/))     { type = '2br';    break; }
    if (t.match(/\b[3-9]\s*bed/)) { type = '3br+';   break; }
  }

  // Neighborhood — last <a> in data-testid="buildingSummaryList"
  let neighborhood: string | undefined;
  const summaryLinks = doc.querySelectorAll('[data-testid="buildingSummaryList"] a');
  if (summaryLinks.length > 0) {
    neighborhood = summaryLinks[summaryLinks.length - 1].textContent?.trim();
  }

  // Laundry — check building summary list items
  let laundry = false;
  const summaryItems = doc.querySelectorAll('[data-testid="buildingSummaryList"] li');
  for (const li of summaryItems) {
    if (li.textContent?.toLowerCase().includes('laundry')) { laundry = true; break; }
  }

  // Available / move-in date — second <p> in data-testid="rentalListingSpec-available"
  let availableDate: string | undefined;
  const availableEl = doc.querySelector('[data-testid="rentalListingSpec-available"] p:last-child');
  if (availableEl?.textContent) {
    const parts = availableEl.textContent.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
      const [, m, d, y] = parts;
      availableDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Carousel images — all alt="photo N" images, excluding the map thumbnail
  // Prefer the 1500w srcset URL when available
  const carouselImgs = Array.from(
    doc.querySelectorAll('[data-testid="media-carousel-component"] img[alt^="photo"]')
  );
  const listingImageUrls: string[] = carouselImgs.map(img => {
    const srcset = img.getAttribute('srcset') ?? '';
    const large = srcset.split(',').map(s => s.trim()).find(s => s.includes('1500w'));
    return large ? large.replace(/\s+\d+w$/, '').trim() : (img.getAttribute('src') ?? '');
  }).filter(Boolean);

  const listingImageUrl = listingImageUrls[0] ?? undefined;

  // Listing URL — canonical link tag
  const listingUrl = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? undefined;

  // Notes — og:description after the "Address, City:" prefix
  let notes: string | undefined;
  const descMeta = doc.querySelector('meta[property="og:description"]') ||
                   doc.querySelector('meta[name="description"]');
  const desc = descMeta?.getAttribute('content') ?? '';
  const colonIdx = desc.indexOf(':');
  if (colonIdx !== -1) notes = desc.slice(colonIdx + 1).trim();

  return { address, aptNumber, listingImageUrl, listingImageUrls: listingImageUrls.length ? listingImageUrls : undefined, monthlyCost, type, neighborhood, laundry, availableDate, notes, listingUrl };
}
