import type { Register } from './types'

export const POS_LABELS: Record<string, string> = {
  noun: 'Noun · isim',
  verb: 'Verb · fiil',
  adjective: 'Adjective · sıfat',
  adverb: 'Adverb · zarf',
  pronoun: 'Pronoun · zamir',
  preposition: 'Preposition · edat',
  conjunction: 'Conjunction · bağlaç',
  determiner: 'Determiner · belirleyici',
  interjection: 'Interjection · ünlem',
}

export const REGISTERS: { id: Register; label: string }[] = [
  { id: 'formal', label: 'Formal' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'informal', label: 'Informal' },
  { id: 'slang', label: 'Argo' },
  { id: 'offensive', label: 'Offensive' },
  { id: 'vulgar', label: 'Vulgar' },
]

export const REGISTER_HINT: Record<Register, string> = {
  formal: 'Resmî yazışma, iş ve akademik ortamlar için uygun.',
  neutral: 'Her ortamda rahatlıkla kullanılabilir.',
  informal: 'Arkadaşlar arasında ve günlük konuşmada; resmî yazıda kaçının.',
  slang: 'Sokak dili; yalnızca samimi ortamlarda. İş ve okulda kullanmayın.',
  offensive: 'Kırıcı olabilir; anlamanız yeterli, kullanmaktan kaçının.',
  vulgar: 'Kaba ifade; kullanmayın, yalnızca tanıyın.',
}

export const STATUS_LABELS = {
  all: 'Tümü',
  unknown: 'Bilmediklerim',
  known: 'Bildiklerim',
  favorites: 'Favoriler',
} as const
