# 🍉 Meyve Birleştirme — Kurulum

Oyun **Supabase olmadan da çalışır** (çevrimdışı: skorlar sadece cihazda, düello sadece aynı tarayıcıda test edilir). Online skor tablosu ve gerçek düello için aşağıdaki adımları yap.

## 1. Supabase projesi aç
1. https://supabase.com → giriş yap → **New project**.
2. İsim ver, bir bölge seç, bir veritabanı şifresi belirle → **Create**.
3. Proje hazır olunca **Project Settings → API** sayfasına git.
4. Şunları kopyala:
   - **Project URL** (örn. `https://abcd.supabase.co`)
   - **anon public** key (uzun `eyJ...` ile başlayan)

## 2. Şemayı kur
1. Soldaki menüden **SQL Editor → New query**.
2. Bu klasördeki [`schema.sql`](schema.sql) dosyasının **tamamını** yapıştır.
3. **Run** (Ctrl+Enter). "Success" görmelisin.

## 3. Anahtarları gir
`config.js` dosyasını aç ve doldur:

```js
const SUPABASE_URL = "https://abcd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

## 4. Yayınla
GitHub Pages'e (beso1719.github.io/meyve-birlestirme) push'la. Hepsi statik dosya, build gerekmez.

> ⚠️ anon key tarayıcıda görünür — bu normaldir, RLS politikaları yazma izinlerini sınırlar. Sadece **anon** key kullan, **service_role** key'i ASLA koyma.

## Modlar
- **Kampanya** — 12 level, her biri farklı mekanik (dar kavanoz, zaman, bomba, buz, yükselen lav…).
- **Sonsuz Mod** — klasik Suika.
- **Düello** — kod oluştur, rakibine yolla; ikiniz aynı meyve sırasıyla 120 sn oynar, skor karşılaştırılır.
- **Skor Tablosu** — günlük / haftalık / tüm zamanlar.
