# Lingora

Canlı: https://rbiafdn.github.io/lingora/

Track what you know. Learn what you don't.

## Çalıştırma

```
npm install
npm run dev      # http://localhost:5190
npm test         # içerik doğrulama, ilerleme, yedek, filtre testleri
npm run validate # sadece içerik dosyalarını şemaya göre denetler
npm run build
```

## Yapı

- `public/data/languages.json` — diller (`active: false` olanlar "Yakında" görünür)
- `public/data/<dil>/manifest.json` — o dilin kategorileri (etiket, tür, dosya)
- `public/data/<dil>/<kategori>/<seviye>.json` — içerik kayıtları (ör. `words/b1.json`). Şema ve ID kuralları: [docs/content-schema.md](docs/content-schema.md)
- `src/core/progress.ts` — kullanıcı ilerlemesi servisi (bildiklerim / favoriler). İçerikten ayrı, kullanıcı + dil + içerik ID'si bazında tutulur.
- `src/core/storage.ts` — depolama katmanı: IndexedDB (`lingora` veritabanı), engelliyse localStorage. İleride bulut eşitleme bu katman değiştirilerek eklenir. Eski v1 localStorage verisi ilk açılışta otomatik aktarılır.
- `src/core/prefs.ts` — cihaz tercihleri (son dil, seviye, kategori filtreleri)
- `src/core/backup.ts` — yedek dosyası biçimi, doğrulama
- `src/core/filter.ts` — filtre, arama, sıralama, ilerleme hesabı

## Yeni dil eklemek

1. `public/data/languages.json` içinde dili `active: true` yap.
2. `public/data/<dil>/manifest.json` ve kategori dosyalarını ekle.

Kod değişikliği gerekmez.

## Yeni kategori eklemek

İlgili dilin `manifest.json` dosyasına bir kategori (`kind: "lexical"` veya `"grammar"`, `files: [...]`) ve JSON dosyalarını ekle, sonra `npm run validate`.

## Dilbilgisi örneklerinde renkli parçalar

Örnek cümlelerde `[s:He] [a:does not] [v:play] [o:football].` yazımı kullanılır:
`s` özne, `a` yardımcı fiil, `v` fiil, `o` nesne/tümleç, `q` soru kelimesi.

## Toplu içerik eklemek

Yeni içerik kompakt ara biçimde `public/data/<dil>/_staging/` altına yazılır ([docs/content-staging.md](docs/content-staging.md)), sonra:

```
node scripts/merge-staging.mjs en
npm run validate
```

Betik ID üretir, mevcut ID'leri korur, tekrarları atlar (`scripts/last-merge-skipped.txt`) ve dosyaları kategori/seviye bazında böler.

## Yayınlama (GitHub Pages)

Site `gh-pages` dalından yayınlanır. `npm run build` çıktısı (`dist/`, taban yol `/lingora/`) bu dala gönderilir:

```
npm run build
# dist/ içeriğini (+ boş .nojekyll) gh-pages dalına commit edip push et
```

Uygulama hash yönlendirme kullandığı için ek sunucu ayarı gerekmez.
