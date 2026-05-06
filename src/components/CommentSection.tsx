import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Comment } from '../types';

export const NAME_KEY = 'nyc_hunt_commenter_name';

export function Stars({ value, onChange, size = 15 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const [hov, setHov] = useState(0);
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHov(n)}
          onMouseLeave={() => onChange && setHov(0)}
          style={{
            fontSize: size, cursor: onChange ? 'pointer' : 'default',
            color: n <= (hov || value) ? '#F59E0B' : 'var(--border)',
            lineHeight: 1, userSelect: 'none', transition: 'color 0.08s',
          }}
        >★</span>
      ))}
    </span>
  );
}

function formatCommentDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function avg(comments: Comment[]) {
  if (!comments.length) return 0;
  return comments.reduce((s, c) => s + c.rating, 0) / comments.length;
}

interface Props {
  aptId: string;
  comments: Comment[];
  onAddComment: (aptId: string, name: string, text: string, rating: number) => Promise<void>;
  isOwner?: boolean;
  onDeleteComment?: (id: string) => Promise<void>;
}

export default function CommentSection({ aptId, comments, onAddComment, isOwner, onDeleteComment }: Props) {
  const [name, setName]         = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [text, setText]         = useState('');
  const [rating, setRating]     = useState(0);
  const [submitting, setSub]    = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim() || !rating) return;
    setSub(true);
    localStorage.setItem(NAME_KEY, name.trim());
    await onAddComment(aptId, name, text, rating);
    setText('');
    setRating(0);
    setShowForm(false);
    setSub(false);
  };

  const average = avg(comments);

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>
            Hunting Calls
          </span>
          {comments.length > 0 && (
            <>
              <Stars value={Math.round(average)} />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {average.toFixed(1)} · {comments.length} {comments.length === 1 ? 'hunting call' : 'hunting calls'}
              </span>
            </>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            + Add hunting call
          </button>
        )}
      </div>

      {/* Existing hunting calls */}
      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showForm ? 12 : 0 }}>
          {comments.map(c => (
            <div key={c.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{c.authorName}</span>
                <Stars value={c.rating} />
                <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}>{formatCommentDate(c.createdAt)}</span>
                {isOwner && onDeleteComment && (
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', padding: 0, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
                    title="Delete hunting call"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>No hunting calls yet. Be the first!</p>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px', borderRadius: 8, fontSize: 13,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-1)', outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Stars value={rating} onChange={setRating} />
            {rating === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>tap to rate</span>}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What do you think about this place?"
            required
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px', borderRadius: 8, fontSize: 13,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-1)', outline: 'none', resize: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              type="button" onClick={() => setShowForm(false)}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, border: 'none',
                background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !text.trim() || !rating}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', color: '#fff',
                background: 'var(--accent)', opacity: (submitting || !name.trim() || !text.trim() || !rating) ? 0.5 : 1,
              }}
            >
              <Send size={11} /> Submit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
