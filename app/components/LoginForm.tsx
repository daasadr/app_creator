'use client'

import React, { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import { useAuth } from '../lib/auth-context'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
      toast({
        title: 'Přihlášení úspěšné',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error: any) {
      console.error('Login error:', error)
      
      let errorMessage = 'Přihlášení se nezdařilo'
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Uživatel s tímto emailem neexistuje'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Nesprávné heslo'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Neplatný email'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Příliš mnoho pokusů o přihlášení. Zkuste to později'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <VStack spacing={6}>
        <Heading size="lg">Přihlášení</Heading>
        
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Heslo</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Zadejte heslo"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="100%"
              isLoading={loading}
              loadingText="Přihlašování..."
            >
              Přihlásit se
            </Button>
          </VStack>
        </form>

        <Text fontSize="sm" color="gray.600">
          Pro přístup k admin rozhraní se přihlaste svými přihlašovacími údaji
        </Text>
      </VStack>
    </Box>
  )
} 