/*

model Session {
  token  String @unique @id
  userId String

  expiresAt DateTime

  // Agent
  browser  String?
  os       String?
  device   String?
  platform String?
  ip       String?

  OTPNeeded Boolean @default(false)

  OTPCanUsePhone Boolean @default(false)
  OTPVerificationPhoneCode String?
  OTPVerificationPhoneCodeExpires DateTime?

  OTPCanUseEmail Boolean @default(false)
  OTPVerificationEmailCode String?
  OTPVerificationEmailCodeExpires DateTime?

  user User @relation(fields: [userId], references: [userId])
}

*/

import User from './User'

export default interface Session {
    sessionId?: string
    token: string
    userId: string
    expiresAt: Date
    os?: string
    device?: string
    platform?: string
    ip?: string
    region?: string
    city?: string
    country?: string
    isp?: string
    OTPNeeded?: boolean
    OTPCanUsePhone?: boolean
    OTPVerificationPhoneCode?: string
    OTPVerificationPhoneCodeExpires?: Date
    OTPCanUseEmail?: boolean
    OTPVerificationEmailCode?: string
    OTPVerificationEmailCodeExpires?: Date
    user?: User
}
