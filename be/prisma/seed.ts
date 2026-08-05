import { PrismaClient } from "@prisma/client"
import { faker } from "@faker-js/faker/locale/id_ID"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Memulai proses seeding database dengan Mock Data...")

  // 1. Bersihkan data lama (Kecuali User agar Admin tetap aman)
  console.log("Membersihkan data lama...")
  await prisma.transaction.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()

  // 2. Buat Kategori
  console.log("Membuat kategori mock...")
  const categoryNames = ["Elektronik", "Alat Tulis Kantor", "Perabotan", "Pakaian", "Makanan Ringan"]
  const categories = []

  for (const name of categoryNames) {
    const cat = await prisma.category.create({
      data: {
        name,
        description: `Deskripsi untuk kategori ${name}`,
      },
    })
    categories.push(cat)
  }

  // 3. Buat Produk
  console.log("Membuat 30 produk mock...")
  const products = []

  for (let i = 0; i < 30; i++) {
    // Pilih kategori acak
    const randomCategory = categories[Math.floor(Math.random() * categories.length)]
    
    // Tentukan harga acak untuk mock transaksi (bukan disimpan di produk)
    const price = parseInt(faker.commerce.price({ min: 5000, max: 2000000, dec: 0 }))
    const quantity = faker.number.int({ min: 10, max: 200 })
    const threshold = faker.number.int({ min: 5, max: 20 })

    const prod = await prisma.product.create({
      data: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        categoryId: randomCategory.id,
        threshold,
        unit: faker.helpers.arrayElement(["pcs", "lusin", "kotak", "kg", "paket"]),
      },
    })
    products.push({ prod, price, quantity })
  }

  // 4. Buat Histori Pergerakan Stok (IN / OUT)
  console.log("Mencatat riwayat transaksi stok...")
  for (const { prod, price, quantity } of products) {
    // Buat riwayat IN (Barang Masuk / Restock Awal)
    const inQty = quantity + 20
    await prisma.transaction.create({
      data: {
        productId: prod.id,
        type: "IN",
        quantity: inQty,
        amount: inQty * price, // Total modal belanja
        notes: "Stok awal (Seeding)",
        transactionDate: faker.date.past({ years: 1 }),
      }
    })

    // Buat riwayat OUT acak
    const outQuantity = faker.number.int({ min: 1, max: 15 })
    await prisma.transaction.create({
      data: {
        productId: prod.id,
        type: "OUT",
        quantity: outQuantity,
        amount: outQuantity * price * 1.2, // Markup harga 20% untuk penjualan
        notes: `Penjualan reguler INV-${faker.string.numeric(5)}`,
        transactionDate: faker.date.recent({ days: 30 }),
      }
    })
  }

  console.log("✅ Seeding selesai! Database kini berisi ratusan data siap pakai.")
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
