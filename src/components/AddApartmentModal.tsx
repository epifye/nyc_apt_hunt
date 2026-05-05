import { useState } from 'react';
import { X, MapPin, Loader2, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { Apartment, ApartmentType, TourStatus } from '../types';
import { geocodeAddress } from '../utils/geocoding';
import { parseStreetEasyHtml } from '../utils/streeteasy';

interface Props {
  onClose: () => void;
  onSave: (data: Omit<Apartment, 'id' | 'createdAt'>) => void;
  editingApartment?: Apartment | null;
}

const TOUR_OPTIONS: { value: TourStatus; label: string; desc: string }[] = [
  { value: 'not_contacted', label: 'Not heard back', desc: 'Waiting on broker' },
  { value: 'upcoming',      label: 'Tour scheduled', desc: 'Date confirmed' },
  { value: 'toured',        label: 'Toured',          desc: 'Already visited' },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
      {children}
    </label>
  );
}

function TextInput({ className = '', style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg px-3 py-2 text-[14px] outline-none transition-all ${className}`}
      style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-1)', ...style }}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    />
  );
}

export default function AddApartmentModal({ onClose, onSave, editingApartment }: Props) {
  const apt = editingApartment;
  const isEditing = !!apt;

  const [address,      setAddress]      = useState(apt?.address ?? '');
  const [neighborhood, setNeighborhood] = useState(apt?.neighborhood ?? '');
  const [lat,          setLat]          = useState<number | null>(apt?.lat ?? null);
  const [lng,          setLng]          = useState<number | null>(apt?.lng ?? null);
  const [type,         setType]         = useState<ApartmentType>(apt?.type ?? 'studio');
  const [laundry,      setLaundry]      = useState(apt?.laundry ?? false);
  const [monthlyCost,  setMonthlyCost]  = useState(apt?.monthlyCost ? String(apt.monthlyCost) : '');
  const [sunlight,     setSunlight]     = useState(apt?.sunlight ?? 5);
  const [kitchen,      setKitchen]      = useState(apt?.kitchenUsable ?? 5);
  const [tourStatus,   setTourStatus]   = useState<TourStatus>(apt?.tourStatus ?? 'not_contacted');
  const [tourDate,     setTourDate]     = useState(apt?.tourDate ?? '');
  const [notes,          setNotes]          = useState(apt?.notes ?? '');
  const [listingUrl,     setListingUrl]     = useState(apt?.listingUrl ?? '');
  const [availableDate,  setAvailableDate]  = useState(apt?.availableDate ?? '');

  const [geocoding,    setGeocoding]    = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [geocoded,     setGeocoded]     = useState(isEditing);

  const [seHtml,    setSeHtml]    = useState('');
  const [seError,   setSeError]   = useState('');
  const [seFilled,  setSeFilled]  = useState(false);

  // ── StreetEasy autofill ───────────────────────────────────────────────────

  const handleStreetEasyFill = async () => {
    if (!seHtml.trim()) return;
    setSeError('');
    setSeFilled(false);
    try {
      const data = parseStreetEasyHtml(seHtml);

      setAddress(data.address);
      if (data.monthlyCost)   setMonthlyCost(String(data.monthlyCost));
      if (data.type)          setType(data.type);
      if (data.laundry)       setLaundry(data.laundry);
      if (data.notes)         setNotes(data.notes);
      if (data.availableDate) setAvailableDate(data.availableDate);
      if (data.neighborhood)  setNeighborhood(data.neighborhood);
      if (data.listingUrl)    setListingUrl(data.listingUrl);

      const desc = (data.notes ?? '').toLowerCase();
      if (['south facing','south-facing','sunlight','sunlit','sun-filled','sun filled','sun drenched','sun-drenched','sunny'].some(k => desc.includes(k)))
        setSunlight(8);
      if (['new kitchen','stainless','renovated kitchen','updated kitchen','modern kitchen',"chef's kitchen",'chefs kitchen','gut renovated'].some(k => desc.includes(k)))
        setKitchen(8);

      setSeFilled(true);
      setGeocoded(false);

      // Auto-geocode
      setGeocoding(true);
      try {
        const geo = await geocodeAddress(data.address);
        setLat(geo.lat);
        setLng(geo.lng);
        if (!data.neighborhood) setNeighborhood(geo.neighborhood);
        setGeocoded(true);
      } catch {
        // user can click Find manually
      } finally {
        setGeocoding(false);
      }
    } catch (err) {
      setSeError(err instanceof Error ? err.message : 'Could not parse HTML.');
    }
  };

  // ── Manual geocode ────────────────────────────────────────────────────────

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setGeocodeError('');
    try {
      const result = await geocodeAddress(address);
      setLat(result.lat);
      setLng(result.lng);
      if (!neighborhood) setNeighborhood(result.neighborhood);
      setGeocoded(true);
    } catch (err) {
      setGeocodeError(err instanceof Error ? err.message : 'Could not find address.');
    } finally {
      setGeocoding(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) { setGeocodeError('Please click "Find" to locate the address.'); return; }
    onSave({
      address: address.trim(), neighborhood, lat, lng, type, laundry,
      monthlyCost: parseFloat(monthlyCost) || 0,
      sunlight, kitchenUsable: kitchen, tourStatus,
      tourDate: tourStatus === 'upcoming' ? tourDate : undefined,
      availableDate: availableDate || undefined,
      notes,
      listingUrl: listingUrl.trim() || undefined,
    });
    onClose();
  };


  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
      style={{ background: 'rgba(26,21,18,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="modal-enter w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          boxShadow: '0 24px 64px rgba(26,21,18,0.18)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[16px] font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-1)' }}>
            {isEditing ? 'Edit Apartment' : 'Add Apartment'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">

            {/* ── StreetEasy autofill ── */}
            {!isEditing && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'var(--accent-light)', border: '1.5px solid #c7d9f8' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
                      Autofill from StreetEasy
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--accent)' }}>
                    View Source → Select All → Paste
                  </span>
                </div>
                <textarea
                  value={seHtml}
                  onChange={e => { setSeHtml(e.target.value); setSeError(''); setSeFilled(false); }}
                  placeholder="Paste the full page source here (Cmd+A then Cmd+C on the view-source page)…"
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-[12px] outline-none transition-all resize-none font-mono"
                  style={{
                    background: 'var(--surface)',
                    border: `1.5px solid ${seFilled ? 'var(--green)' : 'var(--border)'}`,
                    color: 'var(--text-2)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = seFilled ? 'var(--green)' : 'var(--border)')}
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px]" style={{ color: 'var(--accent)' }}>
                    {seError && <span style={{ color: 'var(--red)' }}>{seError}</span>}
                    {seFilled && (
                      <span className="flex items-center gap-1" style={{ color: 'var(--green)' }}>
                        <CheckCircle2 size={12} /> Form filled — review and adjust below
                      </span>
                    )}
                    {!seFilled && !seError && 'Or fill in manually below ↓'}
                  </div>
                  <button
                    type="button"
                    onClick={handleStreetEasyFill}
                    disabled={!seHtml.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white transition-opacity disabled:opacity-40 shrink-0"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Sparkles size={13} />
                    Fill
                  </button>
                </div>
              </div>
            )}

            {/* ── Divider if autofill shown ── */}
            {!isEditing && <div style={{ borderTop: '1px solid var(--border)' }} />}

            {/* ── Address ── */}
            <div>
              <Label>Address</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={e => { setAddress(e.target.value); setGeocoded(false); setGeocodeError(''); }}
                  placeholder="200 Allen Street #7R, New York, NY"
                  required
                  className="flex-1 rounded-lg px-3 py-2 text-[14px] outline-none transition-all"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-1)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocoding || !address.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-white transition-opacity disabled:opacity-40 shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  {geocoding ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                  {geocoding ? 'Finding…' : 'Find'}
                </button>
              </div>
              {geocodeError && <p className="text-[12px] mt-1.5" style={{ color: 'var(--red)' }}>{geocodeError}</p>}
              {geocoded && !geocodeError && (
                <p className="text-[12px] mt-1.5 font-medium flex items-center gap-1" style={{ color: 'var(--green)' }}>
                  <CheckCircle2 size={12} /> Mapped to: {neighborhood}
                </p>
              )}
            </div>

            {/* Neighborhood override */}
            {geocoded && (
              <div>
                <Label>Neighborhood <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(edit if needed)</span></Label>
                <TextInput value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
              </div>
            )}

            {/* Type + Laundry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit type</Label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as ApartmentType)}
                  className="w-full rounded-lg px-3 py-2 text-[14px] outline-none transition-all appearance-none"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-1)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <option value="studio">Studio</option>
                  <option value="1br">1 Bedroom</option>
                  <option value="2br">2 Bedrooms</option>
                  <option value="3br+">3+ Bedrooms</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={laundry}
                    onChange={e => setLaundry(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>Laundry in building</span>
                </label>
              </div>
            </div>

            {/* Monthly rent */}
            <div>
              <Label>Monthly Rent</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-medium" style={{ color: 'var(--text-3)' }}>$</span>
                <TextInput
                  type="number"
                  value={monthlyCost}
                  onChange={e => setMonthlyCost(e.target.value)}
                  placeholder="3,500"
                  min="0"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Available date */}
            <div>
              <Label>Available Date <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(move-in)</span></Label>
              <TextInput
                type="date"
                value={availableDate}
                onChange={e => setAvailableDate(e.target.value)}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Sunlight */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <Label>☀️ Sunlight</Label>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--amber)' }}>{sunlight}/10</span>
              </div>
              <input type="range" min="0" max="10" value={sunlight}
                onChange={e => setSunlight(parseInt(e.target.value))} className="slider-amber" />
            </div>

            {/* Kitchen */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <Label>🍳 Kitchen Usability</Label>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: '#EA580C' }}>{kitchen}/10</span>
              </div>
              <input type="range" min="0" max="10" value={kitchen}
                onChange={e => setKitchen(parseInt(e.target.value))} className="slider-orange" />
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Tour status */}
            <div>
              <Label>Tour Status</Label>
              <div className="grid grid-cols-3 gap-2">
                {TOUR_OPTIONS.map(({ value, label, desc }) => (
                  <button key={value} type="button" onClick={() => setTourStatus(value)}
                    className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={
                      tourStatus === value
                        ? { background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }
                        : { background: 'var(--surface-2)', border: '1.5px solid transparent', color: 'var(--text-2)' }
                    }
                  >
                    <span className="text-[13px] font-semibold">{label}</span>
                    <span className="text-[11px]" style={{ color: tourStatus === value ? 'var(--accent)' : 'var(--text-3)' }}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {tourStatus === 'upcoming' && (
              <div>
                <Label>Tour Date & Time <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(Eastern Time)</span></Label>
                <TextInput type="datetime-local" value={tourDate} onChange={e => setTourDate(e.target.value)} />
              </div>
            )}

            {/* Listing URL */}
            <div>
              <Label>Listing URL <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></Label>
              <div className="relative">
                <ExternalLink size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
                <input
                  type="url"
                  value={listingUrl}
                  onChange={e => setListingUrl(e.target.value)}
                  placeholder="https://streeteasy.com/…"
                  className="w-full rounded-lg pl-8 pr-3 py-2 text-[14px] outline-none transition-all"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-1)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything worth noting…"
                className="w-full rounded-lg px-3 py-2 text-[14px] outline-none transition-all resize-none"
                style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-1)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center gap-3 px-5 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium rounded-full transition-colors"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-[13px] font-semibold text-white rounded-full transition-colors"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {isEditing ? 'Save Changes' : 'Add Apartment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
