import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const hostels = await prisma.hostel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        university: true,
      }
    })
    return Response.json({ hostels })
  } catch (error) {
    return Response.json({ error: 'Failed to fetch hostels' }, { status: 500 })
  }
}
