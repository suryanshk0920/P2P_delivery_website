import type { User, Request, Hostel, Shop } from '@hosrunner/db'

export type RequestWithRequester = Request & {
  requester: Pick<User, 'id' | 'name' | 'avatarUrl' | 'roomNumber' | 'hostelBlock'>
}

export type RequestWithRunner = Request & {
  runner: Pick<User, 'id' | 'name' | 'avatarUrl' | 'roomNumber'> | null
}

export type HostelWithShops = Hostel & {
  shops: Shop[]
}

export interface SessionUser {
  id: string
  email: string
  name: string
  isVerified: boolean
  hostelId: string | null
}
