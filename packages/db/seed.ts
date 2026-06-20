import { PrismaClient } from './generated/client'

const prisma = new PrismaClient()

async function main() {
  const hostel = await prisma.hostel.create({
    data: {
      name: 'Parul University Hostel',
      university: 'Parul University',
      address: 'Parul University Campus, Vadodara, Gujarat',
      shops: {
        create: [
          { name: 'Campus Canteen', location: 'Main Building Ground Floor' },
          { name: 'Amul Parlour', location: 'Near Main Gate' },
          { name: 'Stationery Shop', location: 'Academic Block' },
        ]
      }
    }
  })
  console.log('Seeded hostel:', hostel.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
