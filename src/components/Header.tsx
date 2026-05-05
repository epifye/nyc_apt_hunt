import { useRef } from 'react';
import { Map, List, Plus, Download, Upload } from 'lucide-react';
import { Apartment } from '../types';

interface Props {
  view: 'map' | 'list';
  onViewChange: (v: 'map' | 'list') => void;
  onAddApartment: () => void;
  apartmentCount: number;
  apartments: Apartment[];
  onImport: (apts: Apartment[]) => void;
}

export default function Header({ view, onViewChange, onAddApartment, apartmentCount, apartments, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = JSON.stringify(apartments, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyc-apartments-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          onImport(data as Apartment[]);
        } else {
          alert('Invalid file — expected a JSON array of apartments.');
        }
      } catch {
        alert('Could not parse file. Make sure it\'s a valid JSON export.');
      }
    };
    reader.readAsText(file);
    // reset so the same file can be re-imported
    e.target.value = '';
  };

  return (
    <header
      className="flex items-center gap-3 px-5 py-3 shrink-0 z-10 relative"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 0 var(--border)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-bold"
          style={{ background: 'var(--accent)', fontFamily: 'Syne, sans-serif', fontSize: '11px', letterSpacing: '0.04em' }}
        >
          NYC
        </div>
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
            Apt Hunter
          </span>
          {apartmentCount > 0 && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}
            >
              {apartmentCount} saved
            </span>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Import / Export */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleExport}
          disabled={apartments.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
          onMouseEnter={e => { if (apartments.length > 0) e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          title="Export apartments to JSON"
        >
          <Download size={13} />
          Export
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
          style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          title="Import apartments from JSON"
        >
          <Upload size={13} />
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* View toggle */}
      <div
        className="flex p-1 gap-0.5 rounded-full"
        style={{ background: 'var(--surface-2)' }}
      >
        {(['map', 'list'] as const).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all"
            style={
              view === v
                ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(26,21,18,0.10)' }
                : { color: 'var(--text-2)' }
            }
          >
            {v === 'map' ? <Map size={13} /> : <List size={13} />}
            {v === 'map' ? 'Map' : 'List'}
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={onAddApartment}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-[13px] font-semibold transition-colors"
        style={{ background: 'var(--accent)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
      >
        <Plus size={14} strokeWidth={2.5} />
        Add Apt
      </button>
    </header>
  );
}
