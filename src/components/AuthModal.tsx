import { useState } from 'react';
import { Lock, X, Loader2 } from 'lucide-react';
import { checkOwnerPassword, setOwnerSession } from '../lib/auth';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    setError('');
    const ok = await checkOwnerPassword(pw.trim());
    setLoading(false);
    if (ok) {
      setOwnerSession(true);
      onSuccess();
    } else {
      setError('Wrong password.');
      setPw('');
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[3000] p-4"
      style={{ background: 'rgba(26,21,18,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          boxShadow: '0 24px 64px rgba(26,21,18,0.22)',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Lock size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-[14px] font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-1)' }}>
              Owner access
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full"
            style={{ color: 'var(--text-3)' }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <input
            autoFocus
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(''); }}
            placeholder="Password"
            className="w-full rounded-lg px-3 py-2 text-[14px] outline-none"
            style={{
              background: 'var(--bg)',
              border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
              color: 'var(--text-1)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)')}
          />
          {error && <p className="text-[12px]" style={{ color: 'var(--red)' }}>{error}</p>}
          <button
            type="submit"
            disabled={!pw.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
