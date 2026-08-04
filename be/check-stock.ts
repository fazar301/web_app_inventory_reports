import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const products = await db.product.findMany();
  
  const transactions = await db.transaction.groupBy({
    by: ['productId', 'type'],
    _sum: { quantity: true },
  });

  const stockMap: Record<string, number> = {};
  for (const p of products) {
    stockMap[p.id] = 0;
  }

  for (const t of transactions) {
    const qty = t._sum.quantity || 0;
    if (t.type === "IN") stockMap[t.productId] += qty;
    if (t.type === "OUT") stockMap[t.productId] -= qty;
  }

  const negativeStocks = Object.entries(stockMap).filter(([_, qty]) => qty < 0);
  
  console.log("Products with negative stock:", negativeStocks);
  
  const allTx = await db.transaction.findMany();
  console.log("\nAll transactions:", allTx);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
