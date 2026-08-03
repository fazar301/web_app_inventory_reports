# Inventory & Reports — Monorepo

Aplikasi manajemen inventori dan laporan stok menggunakan arsitektur berlapis **FP & SOLID**.

## 📁 Struktur Folder

```
inventory dan reports/
├── be/          # Backend: Hono + Bun + Prisma + MongoDB Atlas
├── fe/          # Frontend: Next.js 16 + Tailwind CSS (temanmu)
└── shared/      # Kontrak tipe bersama (contracts.ts)
```

---

## ⚙️ Backend Setup (`be/`)

### Prasyarat
- [Bun](https://bun.sh) ≥ 1.3
- MongoDB Atlas connection string

### Langkah Setup

```bash
cd be

# 1. Copy & isi environment variables
cp .env.example .env
# Edit .env: isi DATABASE_URL dan JWT_SECRET

# 2. Install dependencies
bun install

# 3. Push schema ke MongoDB Atlas
bun run db:push

# 4. Jalankan development server
bun run dev
# API berjalan di http://localhost:3001
```

### API Endpoints

| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/api/auth/register` | POST | ❌ | Registrasi user |
| `/api/auth/login` | POST | ❌ | Login → token JWT |
| `/api/auth/me` | GET | ✅ | Profil user aktif |
| `/api/products` | GET | ✅ | List produk (filter, sort, paginate) |
| `/api/products/:id` | GET | ✅ | Detail produk |
| `/api/products` | POST | ✅ | Buat produk |
| `/api/products/:id` | PUT | ✅ | Update produk |
| `/api/products/:id` | DELETE | ✅ | Hapus produk |
| `/api/categories` | GET/POST | ✅ | Kelola kategori |
| `/api/categories/:id` | GET/PUT/DELETE | ✅ | Detail kategori |
| `/api/stock-movements` | GET | ✅ | Daftar pergerakan stok |
| `/api/stock-movements` | POST | ✅ | Catat IN/OUT stok |
| `/api/stock-movements/product/:id` | GET | ✅ | Pergerakan per produk |
| `/api/reports/summary` | GET | ✅ | Ringkasan inventori |
| `/api/reports/stock-movements` | GET | ✅ | Laporan per produk |
| `/api/reports/low-stock` | GET | ✅ | Produk stok rendah |
| `/api/reports/top-products` | GET | ✅ | Produk terlaris |
| `/api/reports/movements-detail` | GET | ✅ | Detail movement (paginasi) |

### Auth Header
```
Authorization: Bearer <token>
```

---

## 🎨 Frontend Setup (`fe/`)

```bash
cd fe
bun install
bun run dev
# Berjalan di http://localhost:3000
```

### Environment FE
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🔗 Shared Types (`shared/`)

File `shared/contracts.ts` berisi semua tipe data yang dipakai FE dan BE.

Untuk dipakai di FE:
```ts
import type { ProductDTO, CreateProductRequest } from "../../shared/contracts"
```

---

## 🏗️ Arsitektur Backend (FP & SOLID)

```
src/
  domain/      # Pure functions (validasi, kalkulasi) — tanpa I/O
  repository/  # Interface + Prisma implementation (DIP + ISP)
  service/     # Business logic factory (orkestrasi murni + efek samping)
  routes/      # HTTP adapter Hono (SRP: parse ↔ format saja)
  middleware/  # JWT auth, error handler terpusat
  lib/db.ts    # Prisma singleton
  app.ts       # Entry point
```
