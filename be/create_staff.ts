import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "staff@inventory.local"
  const password = "password123"
  
  const hashedPassword = await hash(password, 12)
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "STAFF"
    },
    create: {
      name: "Staff User",
      email,
      password: hashedPassword,
      role: "STAFF"
    }
  })
  
  console.log(`User created/updated! Email: ${email}, Password: ${password}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
