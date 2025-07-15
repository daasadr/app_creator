'use client'

import React from 'react'
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  useToast,
  Spinner,
  Center,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Badge
} from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { FiLogOut } from 'react-icons/fi'
import { useAuth } from '../lib/auth-context'
import LoginForm from './LoginForm'
import SuperAdminDashboard from './SuperAdminDashboard'
import AdminDashboard from './AdminDashboard'

export default function Layout() {
  const { user, userRole, loading, logout } = useAuth()
  const toast = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: 'Odhlášení úspěšné',
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: 'Chyba při odhlášení',
        status: 'error',
        duration: 3000,
      })
    }
  }

  if (loading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Načítání...</Text>
        </VStack>
      </Center>
    )
  }

  if (!user) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Flex direction="column" minH="100vh">
          {/* Header */}
          <Box bg="white" borderBottom="1px" borderColor="gray.200" px={6} py={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontSize="xl" fontWeight="bold" color="blue.600">
                  Flutter App Generator
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Admin rozhraní
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* Login Form */}
          <Box flex="1" py={8}>
            <LoginForm />
          </Box>
        </Flex>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Flex direction="column" minH="100vh">
        {/* Header */}
        <Box bg="white" borderBottom="1px" borderColor="gray.200" px={6} py={4}>
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                Flutter App Generator
              </Text>
              <Text fontSize="sm" color="gray.600">
                {userRole?.role === 'superadmin' ? 'Superadmin Dashboard' : 'Admin Dashboard'}
              </Text>
            </Box>

            <HStack spacing={4}>
              <VStack align="end" spacing={0}>
                <Text fontSize="sm" fontWeight="medium">
                  {userRole?.email}
                </Text>
                <Badge 
                  colorScheme={userRole?.role === 'superadmin' ? 'red' : 'blue'}
                  fontSize="xs"
                >
                  {userRole?.role}
                </Badge>
              </VStack>
              
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<ChevronDownIcon />}
                  variant="ghost"
                  size="sm"
                >
                  <Avatar size="sm" name={userRole?.email} />
                </MenuButton>
                <MenuList>
                  <MenuItem>
                    <Text fontSize="sm">Profil</Text>
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem 
                    icon={<FiLogOut />}
                    onClick={handleLogout}
                  >
                    Odhlásit se
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </Box>

        {/* Main Content */}
        <Box flex="1">
          {userRole?.role === 'superadmin' ? (
            <SuperAdminDashboard />
          ) : (
            <AdminDashboard />
          )}
        </Box>
      </Flex>
    </Box>
  )
} 