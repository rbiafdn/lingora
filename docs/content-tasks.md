# İçerik görev dilimleri

Her çalışana bir **dil** ve bir **dilim kodu** verilir. Önce `docs/content-staging.md` ve
`docs/content-staging-languages.md` dosyalarını oku (ikincisi önceliklidir), sonra aşağıdaki dilimini yap.

Dosyaları `public/data/<dil>/_staging/` altına `<dosya öneki>-1.json`, `-2.json` … adlarıyla yaz
(dosya başına en fazla 150 kayıt; dilbilgisinde en fazla 10 konu). Her dosyadan sonra JSON'u node ile doğrula.
Başka hiçbir dosyayı değiştirme; git, build, merge çalıştırma. Bitince TEK SATIR rapor ver.
Yardımcı betik/geçici dosya yazarsan bunları sadece sana ait bir alt klasörde tut (ör. `scratchpad/<dil>-<dilim kodu>/`);
paralel çalışanlar aynı scratchpad'i kullanıyor, ortak dosya adları (build.js vb.) birbirinin üzerine yazar.

Başka çalışanlar aynı anda diğer dilimleri yazıyor: **sadece kendi dilimini yaz**, özellikle alt seviyelerin
temel kelimelerini tekrar yazma. Seviyeler o dilin kaynaklarına göre (bkz. content-staging-languages.md).

| Kod | Dosya öneki | Kategori | Seviye | Kapsam | Hedef |
|---|---|---|---|---|---|
| w-a1-n | words-a1-nouns | words | A1 | sadece isimler, en temel ve en sık | 300 |
| w-a1-o | words-a1-other | words | A1 | isim olmayanlar: fiil, sıfat (renkler dahil), zarf, zamir, edat/particle, bağlaç, sayı, soru kelimeleri, ünlem | 300 |
| w-a2-n | words-a2-nouns | words | A2 | sadece isimler (A1 temel isimleri yazma) | 400 |
| w-a2-o | words-a2-other | words | A2 | isim olmayanlar | 400 |
| w-b1-n | words-b1-nouns | words | B1 | sadece isimler | 350 |
| w-b1-v | words-b1-verbs | words | B1 | sadece fiiller | 300 |
| w-b1-o | words-b1-other | words | B1 | sıfat, zarf ve diğer (isim ve fiil yok) | 350 |
| w-b2-n | words-b2-nouns | words | B2 | sadece isimler | 350 |
| w-b2-v | words-b2-verbs | words | B2 | sadece fiiller | 300 |
| w-b2-o | words-b2-other | words | B2 | sıfat, zarf ve diğer | 350 |
| w-c1-n | words-c1-nouns | words | C1 | sadece isimler, gerçekten kullanılan | 300 |
| w-c1-o | words-c1-other | words | C1 | isim olmayanlar | 300 |
| w-c2 | words-c2 | words | C2 | tüm türler; eğitimli anadil konuşucusunun kullandığı, nadir/arkaik değil | 400 |
| g-a | grammar-a | grammar | A1–B1 | o dilin A1, A2, B1 dilbilgisi konuları, öğrenme sırasıyla (~14 + 13 + 13) | 40 konu |
| g-b | grammar-b | grammar | B2–C2 | o dilin B2, C1, C2 konuları, öğrenme sırasıyla (~14 + 12 + 9) | 35 konu |
| idi | idioms | idioms | A2–C2 | o dilin kendi deyimleri; `exp` zorunlu | 350 |
| vrb | phrasal-verbs | phrasal-verbs | A1–C2 | content-staging-languages.md "phrasal-verbs" satırı | 380 |
| vp | verb-pairs | verb-pairs | A1–C1 | sadece ru: görünüş çiftleri | 300 |
| exd | expressions / daily | expressions + daily | A1–C1 / A1–B2 | iki kategori; aynı ifadeyi ikisine yazma | 250 + 220 |
| col | collocations | collocations | A1–C1 | o dilde birlikte kullanılan kelimeler; Türk öğrencinin yanlış kuracağı kalıplara öncelik, `note` ile açıkla | 500 |
| pas | proverbs / abbreviations / slang | üç kategori | proverbs B1–C2, abbreviations A1–C1, slang B1–C2 | `exp`, `full`, `reg` zorunlu alanlarına dikkat | 100 + 150 + 140 (ar/ja/ko/hi kısaltma: 80) |
| abc | alphabet | alphabet | A1–A2 | content-staging-languages.md "Alfabe" bölümü | dile göre |

Latin alfabesi olmayan dillerde (ru, ar, ja, ko, hi) **her kayıtta `rom`**, örneklerde `ex_rom` olsun; ja'da kanji varsa `kana`.
