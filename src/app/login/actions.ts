'use server'

import { cookies } from 'next/headers'

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string
  const actualPassword = process.env.APP_PASSWORD

  if (!actualPassword || password === actualPassword) {
    const cookieStore = await cookies()
    cookieStore.set('lead_scouter_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return { success: true }
  }

  return { success: false, error: 'Invalid password' }
}
