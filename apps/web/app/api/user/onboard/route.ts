import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToCloudinary } from '@/lib/cloudinary'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const hostelId = formData.get('hostelId') as string
    const roomNumber = formData.get('roomNumber') as string
    const hostelBlock = formData.get('hostelBlock') as string
    const phone = formData.get('phone') as string
    const studentIdFile = formData.get('studentId') as File

    if (!hostelId || !roomNumber || !hostelBlock || !phone || !studentIdFile) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upload ID to Cloudinary
    const buffer = Buffer.from(await studentIdFile.arrayBuffer())
    const uploadResult = await uploadToCloudinary(buffer, `student-ids/${session.user.id}`) as any

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        hostelId,
        roomNumber,
        hostelBlock,
        phone,
        studentIdUrl: uploadResult.secure_url,
        isVerified: true, // Auto-verify in development
      }
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Onboarding error:', error)
    return Response.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}
