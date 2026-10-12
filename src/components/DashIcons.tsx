// Line icons for the dashboard (24×24, stroke = currentColor).

const P: Record<string, string> = {
  // open book
  words: 'M3 5.5c2.6-1.1 5.6-1 9 1 3.4-2 6.4-2.1 9-1V19c-2.6-1.1-5.6-1-9 1-3.4-2-6.4-2.1-9-1V5.5ZM12 6.5V20',
  // speech bubble with quote marks
  idioms:
    'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5v-8ZM9.5 8.5c-1 .4-1.5 1.2-1.5 2.4M12.5 8.5c-1 .4-1.5 1.2-1.5 2.4',
  // chain link
  'phrasal-verbs':
    'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  // message
  expressions: 'M4 5h16v11H9l-5 4V5ZM8 9h8M8 12h5',
  // stacked layers
  collocations: 'M12 3 3 7.5 12 12l9-4.5L12 3ZM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  // leaf
  proverbs: 'M5 19C5 10.5 10 5 20 4c-.8 10-6 15-15 15ZM5 19l8.5-8.5',
  // coffee cup
  daily: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9ZM16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M11 3.5v2M14 3.5v2',
  // theatre mask
  slang:
    'M4.5 5.5c3.5-1.6 11.5-1.6 15 0v5.5c0 5-3.4 8.5-7.5 8.5s-7.5-3.5-7.5-8.5V5.5ZM8 10.5c.8-.6 1.8-.6 2.6 0M13.4 10.5c.8-.6 1.8-.6 2.6 0M9 14.5c1.8 1.3 4.2 1.3 6 0',
  // open book (grammar)
  grammar: 'M3 5.5c2.6-1.1 5.6-1 9 1 3.4-2 6.4-2.1 9-1V19c-2.6-1.1-5.6-1-9 1-3.4-2-6.4-2.1-9-1V5.5ZM12 6.5V20',
  favorites: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
}

export function DashIcon({ name, className }: { name: string; className?: string }) {
  if (name === 'abbreviations')
    return (
      <span className={`icon-text ${className ?? ''}`} aria-hidden="true">
        Ab
      </span>
    )
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d={P[name] ?? P.words}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
