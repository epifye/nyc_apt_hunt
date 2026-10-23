import { useState, useEffect, useRef } from 'react';
import { Trash2, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useReviews } from '../hooks/useReviews';
import { checkOwnerPassword } from '../lib/auth';

const REVIEWER_NAME_KEY = 'apt_reviewer_name';
const NAME_EVENT = 'apt_reviewer_name_changed';

const EMOJIS = [
  // Smileys
  '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','😊','😇','🙂','🙃','😉','😌',
  '😍','🥰','😘','😋','😛','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏',
  '😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠',
  '😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫',
  '🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😵',
  '🫠','🤢','🤮','🤧','😷','🤒','🤕','💀','☠️','👻','👽','🤖','💩','😈','👿',
  // Hands & gestures
  '👋','🤚','✋','🖐️','🖖','👌','✌️','🤞','🤟','🤘','🤙','👍','👎','✊','👊',
  '🤛','🤜','👏','🙌','🫶','🙏','💪','🫡','👈','👉','👆','👇','☝️','✍️',
  // Hearts & love
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓',
  '💗','💖','💘','💝','😻','💏','💑',
  // Celebrations
  '🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','🎯','🎪','🎭','🎨','🎬',
  // Nature
  '🌺','🌸','🌼','🌻','🌹','🌷','🍀','🌴','🌊','🔥','💧','⚡','🌈','❄️',
  '🌙','☀️','⭐','🌟','💫','✨','🌍','🌎','🌏','🍃','🌿','🌱','🌵',
  // Food
  '🍕','🍔','🍟','🌮','🌯','🍜','🍣','🍱','🍩','🍰','🎂','🍪','🍫',
  '🍺','🍷','🥂','☕','🧋','🥤','🍹',
  // Animals
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸',
  '🐙','🦋','🐝','🦄','🦖','🐬','🦈','🦅','🦆','🐧','🦚',
  // Objects & sports
  '💎','💰','💵','🔑','🗝️','🚀','✈️','🚗','🏠','🏡','💻','📱','🎮','🔮',
  '💡','🔋','🎵','🎶','🎸','🥁','🎹','🎤','📸','🔭','🧪','⚽','🏀','🏈',
  '⚾','🥎','🎾','🏐','🏉','🎱','🏓','🎲',
  // Symbols
  '💯','✅','❌','⭕','❓','❗','💥','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪',
  '♥️','♦️','♣️','♠️','🔔','🚨','⚠️','🛑','💬','💭','🗯️','🌀',
];

const AVATAR_PALETTE = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#DDA0DD','#F7DC6F','#FFA07A','#87CEEB'];

function avatarColor(name: string): string {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2) || '?';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  apartmentId: string;
  isOwner: boolean;
  listMode?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export default function ReviewSection({ apartmentId, isOwner, listMode = false, onEditingChange }: Props) {
  const [expanded, setExpanded]     = useState(false);
  const { reviews, loading, addReview, deleteReview } = useReviews(apartmentId);

  const [name, setName]             = useState(() => localStorage.getItem(REVIEWER_NAME_KEY) ?? '');
  const [nameInput, setNameInput]   = useState('');
  const [editName, setEditName]     = useState(!localStorage.getItem(REVIEWER_NAME_KEY));
  const [selectedEmojis, setSel]    = useState<string[]>([]);
  const [showPicker, setPicker]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDel, setPendDel]     = useState<string | null>(null);
  const [delPw, setDelPw]            = useState('');
  const [delErr, setDelErr]          = useState('');
  const [delLoading, setDelLoading]  = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync name across all ReviewSection instances on the same page
  useEffect(() => {
    const handler = (e: Event) => {
      const n = (e as CustomEvent<string>).detail;
      setName(n);
      setEditName(false);
    };
    window.addEventListener(NAME_EVENT, handler);
    return () => window.removeEventListener(NAME_EVENT, handler);
  }, []);

  // Notify parent when editing state changes (for card expansion)
  useEffect(() => {
    onEditingChange?.(showPicker);
  }, [showPicker, onEditingChange]);

  const myReview  = name ? reviews.find(r => r.reviewerName === name) : undefined;
  const canSubmit = !!(name && !editName && selectedEmojis.length > 0 && !myReview && !submitting);

  const saveName = () => {
    const n = nameInput.trim();
    if (!n) return;
    setName(n);
    localStorage.setItem(REVIEWER_NAME_KEY, n);
    window.dispatchEvent(new CustomEvent<string>(NAME_EVENT, { detail: n }));
    setEditName(false);
    setNameInput('');
  };

  const addEmoji = (e: string) => {
    setSel(prev => {
      if (prev.length >= 3) return prev;
      const next = [...prev, e];
      if (next.length === 3) setPicker(false);
      return next;
    });
  };

  const removeEmoji = (idx: number) => {
    setSel(prev => prev.filter((_, i) => i !== idx));
    setPicker(true);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addReview(name, selectedEmojis.join(''));
      setSel([]);
      setPicker(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelClick = (id: string) => {
    setPendDel(id);
    setDelPw('');
    setDelErr('');
  };

  const handleDelConfirm = async () => {
    if (!pendingDel || !delPw) return;
    setDelLoading(true);
    setDelErr('');
    try {
      const ok = await checkOwnerPassword(delPw);
      if (!ok) { setDelErr('Wrong password'); setDelLoading(false); return; }
      await deleteReview(pendingDel);
      setPendDel(null);
      setDelPw('');
    } catch {
      setDelErr('Delete failed');
    } finally {
      setDelLoading(false);
    }
  };

  // ── Collapsed pill (list mode default) ────────────────────────────────────

  if (listMode && !expanded) {
    const hasReviews = !loading && reviews.length > 0;
    const preview = reviews.slice(0, 5).map(r => r.emojis).join('  ');
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          borderTop: '1px solid var(--border)',
          background: hasReviews ? 'var(--surface-2)' : 'var(--accent-light)',
          cursor: 'pointer',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        {/* Left: label + emojis */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: hasReviews ? 4 : 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: hasReviews ? 'var(--text-2)' : 'var(--accent)',
            }}>
              {loading ? 'Reviews' : hasReviews ? `${reviews.length} Review${reviews.length !== 1 ? 's' : ''}` : 'Reviews'}
            </span>
            {loading && <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-3)' }} />}
          </div>
          {hasReviews && (
            <div style={{ fontSize: 18, lineHeight: 1, letterSpacing: '0.05em' }}>{preview}</div>
          )}
        </div>

        {/* Right: CTA */}
        <div style={{
          flexShrink: 0,
          padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: hasReviews ? 'var(--surface)' : 'var(--accent)',
          color: hasReviews ? 'var(--accent)' : '#fff',
          border: hasReviews ? '1px solid var(--border)' : 'none',
          display: 'flex', alignItems: 'center', gap: 4,
          whiteSpace: 'nowrap',
        }}>
          {hasReviews ? 'Add yours' : 'Be first! ✨'}
          <ChevronDown size={10} />
        </div>
      </div>
    );
  }

  // ── Full view ──────────────────────────────────────────────────────────────

  return (
    <div style={listMode
      ? { borderTop: '1px solid var(--border)' }
      : { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }
    }>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 14px 7px', flexShrink: 0,
        borderTop: listMode ? 'none' : '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Reviews
        </span>
        {!loading && reviews.length > 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-3)' }}>
            {reviews.length}
          </span>
        )}
        {listMode && (
          <button
            onClick={() => setExpanded(false)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}
          >
            <ChevronUp size={13} />
          </button>
        )}
      </div>

      {/* Name */}
      <div style={{ padding: '0 14px 8px', flexShrink: 0 }}>
        {editName ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              placeholder="Your name"
              style={{
                flex: 1, padding: '5px 10px', borderRadius: 8, fontSize: 12,
                border: '1.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-1)', outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={saveName} disabled={!nameInput.trim()}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: nameInput.trim() ? 'var(--accent)' : 'var(--surface-2)',
                color: nameInput.trim() ? '#fff' : 'var(--text-3)',
                border: 'none', cursor: nameInput.trim() ? 'pointer' : 'default', transition: 'all 0.15s',
              }}
            >
              Set
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: avatarColor(name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em',
            }}>
              {initials(name)}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>{name}</span>
            <button
              onClick={() => { setEditName(true); setNameInput(name); }}
              style={{ fontSize: 10, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              change
            </button>
          </div>
        )}
      </div>

      {/* Emoji form */}
      {!editName && name && !myReview && (
        <div style={{ padding: '0 14px 8px', flexShrink: 0 }}>
          {/* 3 slot boxes + send */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                onClick={() => selectedEmojis[i] ? removeEmoji(i) : setPicker(true)}
                title={selectedEmojis[i] ? 'Tap to remove' : 'Tap to pick emoji'}
                style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  border: `2px ${selectedEmojis[i] ? 'solid' : 'dashed'} ${selectedEmojis[i] ? 'var(--accent)' : 'var(--border)'}`,
                  background: selectedEmojis[i] ? 'var(--accent-light)' : 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {selectedEmojis[i]
                  ? <span style={{ fontSize: 26, lineHeight: 1 }}>{selectedEmojis[i]}</span>
                  : <span style={{ fontSize: 20, color: 'var(--border)', lineHeight: 1, userSelect: 'none' }}>+</span>
                }
              </div>
            ))}
            <button
              onClick={handleSubmit} disabled={!canSubmit}
              style={{
                width: 46, height: 46, flexShrink: 0, borderRadius: 12, marginLeft: 'auto',
                background: canSubmit ? 'var(--accent)' : 'var(--surface-2)',
                color: canSubmit ? '#fff' : 'var(--text-3)',
                border: 'none', cursor: canSubmit ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          {/* Horizontal emoji scroll strip */}
          {showPicker && (
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '8px 4px' }}>
              <div style={{
                display: 'flex', flexDirection: 'row',
                overflowX: 'auto', overflowY: 'hidden',
                paddingBottom: 2,
              } as React.CSSProperties}>
                {EMOJIS.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => addEmoji(e)}
                    disabled={selectedEmojis.length >= 3}
                    style={{
                      fontSize: 26, lineHeight: 1, padding: '4px 5px',
                      border: 'none', borderRadius: 8, flexShrink: 0,
                      cursor: selectedEmojis.length >= 3 ? 'default' : 'pointer',
                      background: 'transparent',
                      opacity: selectedEmojis.length >= 3 ? 0.3 : 1,
                      transition: 'opacity 0.1s',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Already reviewed notice */}
      {myReview && name && !editName && (
        <div style={{ padding: '0 14px 8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
            Your review: <span style={{ fontSize: 20, fontStyle: 'normal' }}>{myReview.emojis}</span>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div
        ref={listRef}
        style={listMode
          ? { maxHeight: 180, overflowY: 'auto', padding: '0 14px 10px' }
          : { flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 14px 10px' }
        }
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
            <Loader2 size={14} style={{ color: 'var(--text-3)' }} className="animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0', margin: 0, fontStyle: 'italic' }}>
            No reviews yet — be first! 🎉
          </p>
        ) : (
          reviews.map(r => (
            <div key={r.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: avatarColor(r.reviewerName),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
                }}>
                  {initials(r.reviewerName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reviewerName}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-3)', flexShrink: 0 }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 20, lineHeight: 1.3, marginTop: 2 }}>{r.emojis}</div>
                </div>
                <button
                  onClick={() => handleDelClick(r.id)}
                  style={{ flexShrink: 0, padding: '3px 4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', borderRadius: 6, display: 'flex', marginTop: 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.background = 'var(--red-light)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {pendingDel === r.id && (
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingTop: 6 }}>
                    <input
                      autoFocus type="password" value={delPw}
                      onChange={e => { setDelPw(e.target.value); setDelErr(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleDelConfirm()}
                      placeholder="Owner password"
                      style={{
                        flex: 1, padding: '4px 8px', fontSize: 11, borderRadius: 7,
                        border: `1.5px solid ${delErr ? 'var(--red)' : 'var(--border)'}`,
                        background: 'var(--bg)', color: 'var(--text-1)', outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleDelConfirm} disabled={!delPw || delLoading}
                      style={{
                        padding: '4px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: 'var(--red)', color: '#fff', border: 'none',
                        cursor: delPw ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', gap: 3,
                        opacity: !delPw || delLoading ? 0.5 : 1,
                      }}
                    >
                      {delLoading && <Loader2 size={10} className="animate-spin" />}
                      Delete
                    </button>
                    <button
                      onClick={() => { setPendDel(null); setDelErr(''); }}
                      style={{ padding: '4px 6px', borderRadius: 7, fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                  {delErr && <p style={{ fontSize: 10, color: 'var(--red)', margin: '4px 0 0', padding: 0 }}>{delErr}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
