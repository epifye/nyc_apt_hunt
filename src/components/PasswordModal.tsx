import { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  checkPassword: (pw: string) => Promise<boolean>;
}

export default function PasswordModal({ onSuccess, onClose, checkPassword }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    const ok = await checkPassword(password);
    setLoading(false);
    if (ok) {
      onSuccess();
      onClose();
    } else {
      setError('Wrong password.');
      setPassword('');
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[3000] p-4"
      style={{ background: 'rgba(26,21,18,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-enter w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', boxShadow: '0 24px 64px rgba(26,21,18,0.22)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Lock size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
              Owner access
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none transition-all"
            style={{ background: 'var(--bg)', border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`, color: 'var(--text-1)' }}
            onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)'; }}
          />
          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: '-8px 0 0' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
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
