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
  IconButton,
  Select,
  HStack
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import { useAuth } from '../lib/auth-context'

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { register } = useAuth()
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validace
    if (password !== confirmPassword) {
      setError('Hesla se neshodují')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků')
      setLoading(false)
      return
    }

    try {
      await register(email, password, role)
      toast({
        title: 'Registrace úspěšná',
        description: `Uživatel ${email} byl vytvořen s rolí ${role}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      
      // Reset formuláře
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('admin')
    } catch (error: any) {
      console.error('Register error:', error)
      
      let errorMessage = 'Registrace se nezdařila'
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Uživatel s tímto emailem již existuje'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Neplatný email'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Heslo je příliš slabé'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <VStack spacing={6}>
        <Heading size="lg">Registrace nového uživatele</Heading>
        
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
                placeholder="novy@admin.cz"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Role</FormLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'superadmin')}>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Heslo</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimálně 6 znaků"
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

            <FormControl isRequired>
              <FormLabel>Potvrďte heslo</FormLabel>
              <InputGroup>
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Zopakujte heslo"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showConfirmPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                    icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    variant="ghost"
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              type="submit"
              colorScheme="green"
              width="100%"
              isLoading={loading}
              loadingText="Registrace..."
            >
              Vytvořit uživatele
            </Button>
          </VStack>
        </form>

        <Text fontSize="sm" color="gray.600">
          Vytvořte nového admina nebo superadmina pro správu aplikací
        </Text>
      </VStack>
    </Box>
  )
} 