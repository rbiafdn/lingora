# Lingora — yeni diller için içerik üretim kuralları

Bu dosya İngilizce dışındaki diller (es, de, fr, it, pt, ru, ar, ja, ko, hi) için içerik yazanlar içindir.
Önce `docs/content-staging.md` dosyasını oku: kompakt biçim, kalite kuralları ve kategori alanları aynen geçerli.
Bu dosya sadece **farkları** anlatır. Çelişki varsa bu dosya geçerlidir.

Sen ID üretmezsin. Sadece geçerli bir JSON dizisi yazarsın:
`public/data/<dil>/_staging/<sana verilen dosya adı>.json`

- Büyük işleri **birden fazla dosyaya böl**, dosya başına en fazla ~150 kayıt:
  `words-b1-nouns-1.json`, `words-b1-nouns-2.json` …
- Her dosyayı yazdıktan sonra JSON'un geçerli olduğunu kontrol et:
  `node -e "JSON.parse(require('fs').readFileSync('<dosya>','utf8'))"`.
- Başka hiçbir dosyayı değiştirme. `public/data/en/` dosyalarını örnek olarak okuyabilirsin.

Kullanıcı Türkçe konuşan biri ve bu dili öğreniyor. Tüm açıklamalar, notlar ve çeviriler **doğal Türkçe** olmalı.

## Seviyeler (CEFR)

Her dil için o dilin standart seviye listelerini esas al:

| Dil | Kaynak |
|---|---|
| es | Instituto Cervantes (PCIC) |
| de | Goethe-Institut / Profile Deutsch |
| fr | Référentiels CECR / DELF |
| it | Profilo della lingua italiana / CILS |
| pt | Camões / CAPLE |
| ru | TORFL (ТРКИ) |
| ar | ACTFL / MSA ders kitapları |
| ja | JLPT: N5≈A1, N4≈A2, N3≈B1, N2≈B2, N1≈C1, N1 üstü≈C2 |
| ko | TOPIK: 1≈A1, 2≈A2, 3≈B1, 4≈B2, 5≈C1, 6≈C2 |
| hi | CEFR'e göre genel sıklık (temel günlük → akademik) |

## Yeni alanlar

| Alan | Ne zaman | Örnek |
|---|---|---|
| `rom` | **Zorunlu** — Latin alfabesi olmayan dillerde (ru, ar, ja, ko, hi) her kayıtta | `"rom":"privét"` |
| `ipa` | Latin alfabeli dillerde kelimeler için, emin olduğunda (`uk`/`us` yerine) | `"ipa":"/ˈkasa/"` |
| `kana` | Japonca: kanji içeren kelime/ifadenin kana okunuşu | `"w":"日本","kana":"にほん","rom":"nihon"` |
| `ex_rom` | Latin olmayan dillerde örnek cümlenin okunuşu (önerilir) | `"ex_rom":"Ya lyublyu chay."` |

`rom` kuralları:
- ru: Türkçe konuşanın okuyabileceği basit Latin yazımı; vurgulu heceye ´ koy (`privét`, `spasíbo`).
- ar: basit transliterasyon, uzun ünlüler ā ī ū (`kitāb`, `shukran`).
- ja: Hepburn (`konnichiwa`, `taberu`, `gakkō`).
- ko: Revised Romanization (`annyeonghaseyo`, `saram`).
- hi: basit transliterasyon, uzun ünlüler ā ī ū (`namaste`, `pānī`, `ghar`).

## Dile özel yazım

- **Artikel / cinsiyet**: isimlere artikelle yaz.
  - es: `la casa`, `el libro` · fr: `la maison`, `le livre`, ünlüyle başlıyorsa `l'arbre` + `note`: "Eril (le)."
  - it: `il libro`, `la casa`, `lo studente`, `l'amico` + `note` ile cinsiyet
  - pt: `a casa`, `o livro` · de: `der Tisch`, `die Lampe`, `das Buch`; `note`: "Çoğul: die Tische"
- **de**: isimler büyük harfle. Düzensiz fiillerde `note`: "Düzensiz: gehen – ging – gegangen".
- **ru**: kelimeyi Kiril ile yaz (vurgu işareti `w`'ya değil `rom`'a). Fiillerde `note` içinde görünüş çifti
  ("Tamamlanmış: сделать").
- **ar**: Modern Standart Arapça (fuṣḥā). Kelimeyi **harekeli** yaz (`كِتَاب`). `daily` ve `slang`'de lehçe
  kullanılırsa `note`'ta belirt ("Mısır lehçesi").
- **ja**: kelimeyi Japonların normalde yazdığı gibi yaz (kanji/kana), okunuşu `kana` + `rom`.
- **ko**: Hangul; `rom` zorunlu.
- **hi**: Devanagari; `rom` zorunlu.

## `pos` değerleri

`noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, interjection, particle, numeral`
(ja/ko edatları için `particle`; ar/hi/ru/ja/ko'da sonek/edat da `particle` olabilir).

## Kategori uyarlamaları

| Kategori (dosya adı öneki) | Hangi diller | Ne yazılır |
|---|---|---|
| `words` | hepsi | Kelimeler. Sana seviye + kelime türü dilimi verilir; sadece o dilimi yaz. |
| `phrasal-verbs` | es, fr, it, pt, de | es/fr/it/pt: deyimsel fiil kalıpları ve dönüşlü kalıplar (`darse cuenta`, `echar de menos`, `se rendre compte`, `andare via`, `dar-se conta`). de: ayrılabilen fiiller (`aufstehen`, `anrufen`), `sep: true`, `note`'ta ayrılmış hâli: "Ich stehe um 7 Uhr auf." |
| `verb-pairs` | ru | Görünüş çiftleri: `{"t":"делать / сделать","rom":"délat' / sdélat'","l":"A1","tr":["yapmak"],"note":"Süren / tamamlanmış.","ex":"…","ex_rom":"…","ex_tr":"…"}` |
| `idioms` | hepsi | O dilin kendi deyimleri. `exp` zorunlu, `teq` sadece gerçek Türkçe karşılık varsa. |
| `expressions` | hepsi | Kalıplaşmış ifadeler, bağlaçlar, nezaket kalıpları. |
| `collocations` | hepsi | O dilde birlikte kullanılan kelimeler (`tomar una decisión`, `eine Entscheidung treffen`, `決定を下す`). |
| `proverbs` | hepsi | O dilin atasözleri. |
| `abbreviations` | hepsi | O dilin yaygın kısaltmaları (`EE. UU.`, `z. B.`, `т. е.`). ja: kısaltılmış kelimeler (`スマホ`, `コンビニ`); ko: 줄임말 (`알바`, `ㅋㅋ`). |
| `daily` | hepsi | Günlük konuşmada sık duyulanlar. |
| `slang` | hepsi | Argo; `reg` zorunlu. |
| `grammar` | hepsi | Aşağıya bak. |
| `alphabet` | ru, ar, ja, ko, hi | Aşağıya bak. |

## Dilbilgisi (`grammar`)

Şema `docs/content-staging.md` ile aynı. Farklar:
- `t`: konunun o dildeki adı (`Presente de indicativo`, `Der Dativ`, `て形`). Latin değilse `rom` ekle (`"rom":"te-kei"`).
- `tr`: Türkçe adı.
- Formül parçalarında `tr` Türkçe etiket, `en` alanına **o dildeki** terimi yaz (`{"tr":"Özne","en":"Sujeto","role":"s"}`,
  ja: `{"tr":"Özne","en":"主語","role":"s"}`). Alan adı tarihsel olarak `en`; içeriği hedef dildir.
- Örnek cümleler o dilde, `[s:..] [v:..]` işaretli; Latin değilse örneğe `reading` ekle:
  `{"text":"[s:私は] [o:りんごを] [v:食べます]。","reading":"Watashi wa ringo o tabemasu.","tr":"Ben elma yerim."}`.
- Konular o dilin öğrenme sırasına göre (A1 → C2). Türk öğrenciye zor gelen konuları atlama
  (es: ser/estar, subjuntivo; de: Kasus, Artikel; fr: passé composé/imparfait; ru: hâller, fiil görünüşü;
  ar: kök sistemi, ikil, iḍāfa; ja: は/が, て形, keigo; ko: 이/가 - 은/는, konuşma seviyeleri; hi: postpozisyonlar, ergatif ने).

## Alfabe (`alphabet`)

Her harf/işaret bir kayıt. Harf sırasıyla yaz (dosyadaki sıra korunur).

```json
{"t":"Б б","rom":"b","name":"be","l":"A1","tr":["b"],"note":"Türkçedeki b gibi okunur.","ex":"банк","ex_rom":"bank","ex_tr":"banka"}
```

- `t`: harf (büyük + küçük varsa ikisi); `rom`: sesin Latin karşılığı; `name`: harfin adı (varsa).
- `tr`: Türkçe ses karşılığı, kısa ("b", "ş", "yumuşatma işareti").
- `note`: Türk okura nasıl okunduğu, tek cümle. Türkçede olmayan seslerde en yakın sesi ve farkı anlat.
- ex: o harfle başlayan/geçen basit bir kelime.
- Seviye: temel harfler `A1`; ek işaretler ve birleşik yapılar `A2`.

Dile göre kapsam:
- **ru**: 33 harf (А–Я), ъ ve ь dahil.
- **ar**: 28 harf; `note`'ta bitişik biçimleri (başta/ortada/sonda) yaz. Sonra `A2`: hemze (ء), tâ merbûta (ة),
  elif maksûra (ى), harekeler (fetha, kesra, damme, sükûn, şedde, tenvin) — her biri ayrı kayıt.
- **ja**: Hiragana (`A1`): 46 temel + dakuten/handakuten (が, ぱ …) + yōon (きゃ …). Katakana (`A2`): aynı set +
  uzatma işareti ー. `t`: `あ`, `rom`: `a`, `name` gerekmez. ~210 kayıt.
- **ko**: 14 temel ünsüz, 5 çift ünsüz, 10 temel ünlü, 11 birleşik ünlü (`A1`/`A2`), `t`: `ㄱ`, `name`: `giyeok`.
  Son olarak `A2`: hece bloğu ve batchim (받침) kuralları için birkaç açıklayıcı kayıt (`t`: "받침").
- **hi**: ünlüler ve ünlü işaretleri (मात्रा), ünsüzler (क–ह), sonra `A2`: nukta harfleri, अनुस्वार, विसर्ग,
  sık birleşik harfler (क्ष, त्र, ज्ञ, श्र). `t`: `क`, `rom`: `ka`.
