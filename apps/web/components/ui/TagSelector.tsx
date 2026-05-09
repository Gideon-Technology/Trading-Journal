'use client';

import { useState } from 'react';
import { useJournalStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
}

const TAG_COLORS = [
  'bg-accent/10 text-accent border-accent/30',
  'bg-win/10 text-win border-win/30',
  'bg-loss/10 text-loss border-loss/30',
  'bg-breakeven/10 text-breakeven border-breakeven/30',
  'bg-purple-500/10 text-purple-400 border-purple-500/30',
];

function tagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagSelector({ selected, onChange }: Props) {
  const allTags = useJournalStore(s => s.tags);
  const addTag = useJournalStore(s => s.addTag);
  const [input, setInput] = useState('');

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  };

  const create = () => {
    const tag = input.trim();
    if (!tag) return;
    addTag(tag);
    if (!selected.includes(tag)) onChange([...selected, tag]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {allTags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              'px-2 py-0.5 rounded text-xs border transition-all',
              selected.includes(tag) ? tagColor(tag) : 'bg-bg-elevated text-muted border-bg-border opacity-60 hover:opacity-100'
            )}
          >
            {tag}
          </button>
        ))}
        {allTags.length === 0 && <span className="text-muted text-xs">No tags yet — create one below.</span>}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-1.5 text-sm rounded-md bg-bg-elevated border border-bg-border text-text placeholder-muted"
          placeholder="New tag name..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}
        />
        <button
          type="button"
          onClick={create}
          disabled={!input.trim()}
          className="px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-40 hover:bg-accent/80 transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
