# Lingora içerik şeması (v1)

Tüm içerik `public/data/<dil>/` altında JSON dizileri olarak durur. Kullanıcı durumu (biliyor / favori)
içerik dosyalarında **asla** yer almaz; ilerleme içerik `id`'si üzerinden ayrı tutulur.

Tip tanımları: `src/core/types.ts`. Doğrulama: `npm run validate` (testlerle birlikte de çalışır).

## Ortak kayıt (her kategori)

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `id` | ✓ | Kalıcı, benzersiz kimlik. Bkz. "ID kuralları". |
| `languageId` | ✓ | `"en"` |
| `category` | ✓ | manifest'teki kategori id'si; dosyanın ait olduğu kategoriyle aynı olmalı |
| `level` | ✓ | `A1` `A2` `B1` `B2` `C1` `C2` |
| `sourceText` | ✓ | Öğrenilen dildeki ifade (`know`, `break the ice`, `Simple Present`) |
| `translations` | ✓ | `{ "tr": ["ana anlam", "ikinci anlam"] }` — listede gösterilen kısa anlamlar, en fazla 2–3 |
| `partOfSpeech` | | `noun` `verb` `adjective` `adverb` `pronoun` `preposition` `conjunction` `determiner` `interjection` (sadece kelimeler ve phrasal verb'ler) |
| `tags` | | Kategori dışı ilişkiler: `["discourse-marker"]`, `["business"]`, `["texting"]` |
| `details` | | Kategoriye göre aşağıdaki alanlar |
| `examples` | | `[{ "text": "I know the answer.", "tr": "Cevabı biliyorum." }]` — en az 1 önerilir |
| `grammar` | | Sadece `grammar` kategorisinde |

### `details` alanları (hepsi isteğe bağlı, Türkçe yazılır)

| Alan | Kullanıldığı yer |
|---|---|
| `pronunciation: { uk, us }` | Kelimeler (IPA, `/.../`) |
| `otherMeanings: string[]` | Kelimeler |
| `synonyms: string[]` | Kelimeler |
| `related: string[]` | İlgili ifadeler, collocation'lar |
| `similar: string[]` | Benzer phrasal verb'ler |
| `separable: boolean` | Phrasal verb'ler (ayrılabilir / ayrılamaz) |
| `usage` | Kullanım açıklaması |
| `explanation` | Deyim açıklaması |
| `context` | Kullanım bağlamı |
| `register` | `formal` `neutral` `informal` `slang` `offensive` `vulgar` |
| `turkishEquivalent` | Türkçedeki yakın karşılık (deyim, atasözü) |
| `literal` | Kelime kelime çeviri (atasözü) |
| `meaning` | Gerçek anlam (atasözü) |
| `expansion` | Açılım (kısaltma, `gonna → going to`) |

## ID kuralları

Biçim: `<dil>-<kategori-kısa>-<slug>[--<anlam>]`

| Kategori | Kısa ad | Örnek |
|---|---|---|
| words | `word` | `en-word-know` |
| idioms | `idiom` | `en-idiom-break-the-ice` |
| phrasal-verbs | `pv` | `en-pv-give-up` |
| expressions | `expr` | `en-expr-by-the-way` |
| collocations | `coll` | `en-coll-make-a-decision` |
| proverbs | `prov` | `en-prov-better-late` |
| abbreviations | `abbr` | `en-abbr-asap` |
| daily | `daily` | `en-daily-whats-up` |
| slang | `slang` | `en-slang-gonna` |
| grammar | `gr` | `en-gr-simple-present` |

- Slug: küçük harf, `a-z0-9`, kelimeler `-` ile ayrılır, noktalama atılır (`What's up?` → `whats-up`).
- **Seviye ID'ye yazılmaz.** Bir kelimenin seviyesi sonradan düzeltilebilir; ID değişirse kullanıcının işareti kaybolur.
- Aynı yazılışın farklı anlamları ayrı kayıt olur ve `--` ile anlam eki alır:
  `en-word-book` (kitap) ve `en-word-book--reserve` (rezervasyon yapmak). İlk yayımlanan anlam eksiz kalır.
- Bir ID yayımlandıktan sonra **değiştirilmez ve başka bir içeriğe verilmez.** Sıra, çeviri, detay, seviye
  değişebilir; ID değişmez. Silinen içeriğin ID'si tekrar kullanılmaz.
- Kullanıcı kaydında artık bulunmayan bir ID olursa uygulama onu yok sayar (hata vermez, yedekte saklanır).

## Tekrarlar

Aynı ifade iki kategoride ayrı kayıt olarak tutulmaz. Bir ifade birden fazla türe uyuyorsa ana kategoride
tek kayıt olur, diğer ilişki `tags` ile verilir (`by the way` → `expressions`, `tags: ["discourse-marker"]`).
Kısaltma ile açık hâli (`BTW` / `by the way`) farklı öğrenme birimleri sayılır ve ayrı kalabilir.

## Grammar (`grammar` alanı)

```json
{
  "summary": "Temel açıklama",
  "uses": ["Ne zaman kullanılır? maddeleri"],
  "sections": [
    {
      "kind": "affirmative",
      "title": "Olumlu cümle",
      "formula": [
        { "tr": "Özne", "en": "Subject", "role": "s" },
        { "tr": "am/is/are", "en": "am/is/are", "role": "a" },
        { "tr": "Fiil-ing", "en": "Verb-ing", "role": "v" },
        { "tr": "Nesne", "en": "Object", "role": "o" }
      ],
      "examples": [{ "text": "[s:I] [a:am] [v:reading] [o:a book].", "tr": "Bir kitap okuyorum." }],
      "notes": ["..."]
    }
  ],
  "rules": ["Önemli kurallar"],
  "exceptions": ["İstisnalar"],
  "mistakes": [{ "wrong": "He don't like it.", "right": "He doesn't like it.", "note": "..." }]
}
```

- `kind`: `affirmative` (Olumlu), `negative` (Olumsuz), `question` (Soru), `negative-question` (Olumsuz soru),
  `wh` (WH soruları), `short-answers` (Kısa cevaplar), `other` (konuya özel: Active → Passive vb.).
  Konunun izin verdiği standart bölümler bu sırayla verilir.
- `formula` parçaları hem Türkçe (`tr`) hem İngilizce (`en`) etiket taşır; ekranda iki satırlı formül olarak gösterilir.
- `role`: `s` özne, `a` yardımcı fiil / be / modal, `v` fiil, `o` nesne / tümleç, `q` soru kelimesi, `x` diğer.
- Örnek cümlede parçalar `[rol:metin]` ile işaretlenir; işaretsiz metin düz gösterilir.
