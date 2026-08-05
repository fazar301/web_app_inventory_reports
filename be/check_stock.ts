import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const transactions = await db.transaction.groupBy({
    by: ['productId', 'type'],
    _sum: { quantity: true },
  });
  const products = await db.product.findMany({ select: { id: true, name: true } });
  const pMap = Object.fromEntries(products.map(p => [p.id, p.name]));
  
  const stockMap = {};
  for (const t of transactions) {
    if (!stockMap[t.productId]) stockMap[t.productId] = 0;
    if (t.type === 'IN') stockMap[t.productId] += t._sum.quantity;
    if (t.type === 'OUT') stockMap[t.productId] -= t._sum.quantity;
  }
  for (const [id, stock] of Object.entries(stockMap)) {
    if (stock < 0) {
      console.log(`Product: ${pMap[id]} has overall negative stock: ${stock}`);
    }
  }
  console.log('Done checking stocks.');
}
main();
