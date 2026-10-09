# Lingora — içerik üretim kuralları (ara biçim)

Bu dosya yeni içerik yazan herkes içindir. Sen ID üretmezsin; ID'leri, tekrar temizliğini ve dosyalara bölmeyi
birleştirme betiği (`scripts/merge-staging.mjs`) yapar. Sen sadece aşağıdaki kompakt biçimde **geçerli bir JSON dizisi**
yazarsın: `public/data/en/_staging/<sana verilen dosya adı>.json`

Kullanıcı Türkçe konuşan bir İngilizce öğrencisi. Uygulama bir "bilgi envanteri": kullanıcı her ifade için
"biliyor muyum?" diye işaret koyar. Kalite sayıdan önemlidir; ama hedef sayıya yaklaş.

## Genel kalite kuralları

- Sadece gerçekten kullanılan, öğrenmeye değer içerik. Nadir bilimsel terim, özel isim, arkaik kelime yok.
- Türkçe **doğal** olmalı, makine çevirisi gibi değil. `piece of cake` → "çok kolay, çocuk oyuncağı" (✗ "kek parçası").
- Türkçe karakterleri doğru kullan: ı ş ğ ü ö ç İ.
- `tr`: listede görünen kısa anlamlar, en yaygını önce, en fazla 3, her biri kısa (1–4 kelime).
- Örnek cümle kısa, doğal, seviyeye uygun; Türkçesi doğal.
- Açıklamalar KISA: tek cümle, en fazla ~120 karakter. Paragraf yok.
- Zorlama Türkçe atasözü/deyim eşleştirmesi yapma. Tam karşılık yoksa `teq` alanını boş bırak, anlamı `tr`'ye yaz.
- CEFR seviyesi: English Vocabulary Profile / Oxford 3000–5000 seviyelerini esas al.
- Aynı dosya içinde tekrar yok. Sana verilen "zaten var" listesini kontrol et ve onları tekrar yazma.
- Mevcut içerikleri görmek için `public/data/en/` altındaki JSON dosyalarını okuyabilirsin (sadece oku, değiştirme).

## Kelimeler (`words`)

```json
{"w":"achieve","pos":"verb","l":"B1","tr":["başarmak","elde etmek"],"uk":"/əˈtʃiːv/","us":"/əˈtʃiːv/","ex":"She achieved her goal.","ex_tr":"Hedefine ulaştı."}
```

- Zorunlu: `w`, `pos`, `l`, `tr`. Neredeyse her kelimede `ex` + `ex_tr` olsun.
- `pos`: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, interjection.
- `uk`/`us`: IPA, eğik çizgili. Emin değilsen yazma (yanlış IPA'dan iyidir).
- İsteğe bağlı `om`: ["önemli ikinci anlam"] — sadece gerçekten önemliyse, en fazla 2.
- İsteğe bağlı `note`: tek cümlelik önemli kullanım notu (düzensiz fiil "Düzensiz: go – went – gone", sayılamaz isim vb.).
- Aynı yazılışın farklı türü/anlamı ayrı öğrenme birimiyse ayrı kayıt yaz ve `sense` ver: `{"w":"book","pos":"verb","sense":"reserve",...}`.

## Diğer sözcüksel kategoriler

```json
{"t":"give up","l":"A2","tr":["vazgeçmek","bırakmak"],"ex":"Don't give up!","ex_tr":"Vazgeçme!"}
```

Ortak: `t` (ifade), `l`, `tr`, `ex`, `ex_tr`. Kategoriye göre ek alanlar:

| Kategori | Ek alanlar |
|---|---|
| phrasal-verbs | `sep`: true/false (ayrılabilir mi), isteğe bağlı `note` |
| idioms | `exp`: kısa açıklama (zorunlu), `teq`: doğal Türkçe deyim karşılığı (varsa) |
| expressions | `note`: kısa kullanım, `reg`: formal/neutral/informal, `tags`: ["discourse-marker"] gibi |
| collocations | `note`: kısa kullanım (neden make/do vs.) |
| proverbs | `exp`: gerçek anlam (kısa), `teq`: doğal Türkçe karşılık SADECE gerçekten aynı anlamdaysa |
| abbreviations | `full`: açılım (zorunlu), `ctx`: bağlam ("İş", "İnternet", "Akademik", "Teknoloji", "Günlük"), `reg` |
| daily | `ctx`: ne zaman söylenir (kısa), `reg` |
| slang | `reg`: informal / slang / offensive / vulgar (zorunlu), `kind`: "reduced" (gonna, wanna gibi söyleyiş kısaltması) veya "slang", `full` (reduced ise açılımı), `note`: nerede kullanılır/kullanılmaz |

## Dilbilgisi (`grammar`)

Mevcut şema: `docs/content-schema.md` → Grammar bölümü ve `public/data/en/grammar.json` örnekleri.
Dilbilgisi kayıtlarını tam şemayla yaz (kompakt değil), ama `id`/`languageId`/`category` yazma:

```json
{"t":"Past Continuous","l":"A2","tr":["Geçmişte Süren Zaman"],"grammar":{ "summary": "...", "uses": [...], "sections": [...], "rules": [...], "exceptions": [...], "mistakes": [...] }}
```

- `sections`: konuya uygun yapılar. Zaman (tense) konularında affirmative, negative, question, wh mutlaka;
  uygunsa negative-question, short-answers. Zaman olmayan konularda (articles, relative clauses, inversion…)
  2–5 adet `kind: "other"` bölüm, her biri bir yapıyı gösterir.
- **Ana ekrandaki kartta ilk 3–4 formüllü bölüm gösterilir** — en önemli yapıları başa koy.
- Her bölümde `formula` (tr + en etiketli parçalar, role s/a/v/o/q/x) ve 1–2 örnek (`[s:..] [a:..] [v:..]` işaretli).
- Metin kısa: summary tek cümle, uses 2–4 madde, rules 2–4, exceptions 0–2, mistakes 2–3. Öncelik yapı ve örnek.
