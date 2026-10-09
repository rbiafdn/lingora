// Simple line icons for dashboard tiles (24×24, stroke = currentColor).

const P: Record<string, string> = {
  words: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7h8M8 11h6',
  idioms: 'M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6',
  'phrasal-verbs': 'M4 12h9M10 8l4 4-4 4M17 5v14M20 5v14',
  expressions: 'M4 5h16v11H9l-5 4V5ZM8 9h8M8 12h5',
  collocations: 'M9 7a4 4 0 1 0 0 8h1M15 9h-1M15 17a4 4 0 1 0 0-8h-1M9 15h1M9 11h6',
  proverbs: 'M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6V4ZM6 4a2 2 0 0 0-2 2v2h2M9 9h6M9 13h6M9 17h3',
  abbreviations: 'M3 18 7.5 6 12 18M4.7 14h5.6M15 8h5M15 12h4M15 16h5',
  daily: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8ZM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2M14 3v2',
  slang: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  grammar: 'M4 6h16M4 12h10M4 18h7M17 13l3 3-3 3M14 16h6',
  favorites: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
}

export function DashIcon({ name, className }: { name: string; className?: string }) {
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
