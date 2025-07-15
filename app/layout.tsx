import { ChakraProvider } from '@chakra-ui/react'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './lib/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'App Generator',
  description: 'Generate mobile applications for Android and iOS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ChakraProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ChakraProvider>
      </body>
    </html>
  )
} 