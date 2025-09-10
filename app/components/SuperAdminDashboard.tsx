'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  useToast,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Select,
  Alert,
  AlertIcon,
  Spinner,
  Center
} from '@chakra-ui/react'
import { 
  AddIcon, 
  SettingsIcon, 
  ChevronDownIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon
} from '@chakra-ui/icons'
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth-context'
import RegisterForm from './RegisterForm'
import { useRouter } from 'next/navigation'

interface App {
  id: string
  name: string
  description: string
  adminId: string
  adminEmail?: string
  createdAt: any
}

interface User {
  uid: string
  email: string
  role: 'admin' | 'superadmin'
}

export default function SuperAdminDashboard() {
  const [apps, setApps] = useState<App[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningAdmin, setAssigningAdmin] = useState<string | null>(null)
  const [selectedAdminId, setSelectedAdminId] = useState('')
  
  const { userRole } = useAuth()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Načti aplikace
      const appsSnapshot = await getDocs(collection(db, 'apps'))
      const appsData: App[] = []
      
      for (const appDoc of appsSnapshot.docs) {
        const appData = appDoc.data()
        appsData.push({
          id: appDoc.id,
          name: appData.name || 'Bez názvu',
          description: appData.description || '',
          adminId: appData.adminId || '',
          createdAt: appData.createdAt
        })
      }

      // Načti uživatele
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData: User[] = []
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        usersData.push({
          uid: userDoc.id,
          email: userData.email,
          role: userData.role
        })
      }

      // Přiřaď emaily adminů k aplikacím
      const appsWithAdminEmails = appsData.map(app => ({
        ...app,
        adminEmail: usersData.find(user => user.uid === app.adminId)?.email || 'Nepřiřazeno'
      }))

      setApps(appsWithAdminEmails)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Chyba při načítání dat',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const assignAdminToApp = async (appId: string) => {
    if (!selectedAdminId) return

    try {
      await updateDoc(doc(db, 'apps', appId), {
        adminId: selectedAdminId
      })

      toast({
        title: 'Admin přiřazen',
        status: 'success',
        duration: 3000,
      })

      setAssigningAdmin(null)
      setSelectedAdminId('')
      loadData() // Reload data
    } catch (error) {
      console.error('Error assigning admin:', error)
      toast({
        title: 'Chyba při přiřazování admina',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const deleteApp = async (appId: string) => {
    if (!confirm('Opravdu chcete smazat tuto aplikaci?')) return

    try {
      await deleteDoc(doc(db, 'apps', appId))
      toast({
        title: 'Aplikace smazána',
        status: 'success',
        duration: 3000,
      })
      loadData() // Reload data
    } catch (error) {
      console.error('Error deleting app:', error)
      toast({
        title: 'Chyba při mazání aplikace',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleEditApp = (appId: string) => {
    router.push(`/apps/${appId}/edit`)
  }

  const createNewApp = async () => {
    try {
      // Vytvoř novou aplikaci s výchozími hodnotami
      const newApp = {
        name: 'Nová aplikace',
        description: 'Popis nové aplikace',
        adminId: '',
        createdAt: new Date(),
        menu: [
          {
            id: Date.now().toString(),
            title: 'Úvodní stránka',
            type: 'content',
            content: 'Vítejte v nové aplikaci!'
          }
        ],
        settings: {
          theme: 'light',
          primaryColor: '#3182ce'
        }
      }

      // Přidej do Firestore
      const docRef = await addDoc(collection(db, 'apps'), newApp)
      
      toast({
        title: 'Nová aplikace vytvořena',
        status: 'success',
        duration: 3000,
      })

      // Přesměruj na editor nové aplikace
      router.push(`/apps/${docRef.id}/edit`)
    } catch (error) {
      console.error('Error creating app:', error)
      toast({
        title: 'Chyba při vytváření aplikace',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const adminUsers = users.filter(user => user.role === 'admin')

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" wrap="wrap" spacing={4}>
          <Box>
            <Heading size="lg">Superadmin Dashboard</Heading>
            <Text color="gray.600">Správa všech aplikací a uživatelů</Text>
          </Box>
          <HStack spacing={3} flexWrap="wrap">
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={onOpen}
              size="md"
            >
              Přidat uživatele
            </Button>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="green"
              onClick={createNewApp}
              size="md"
            >
              Přidat aplikaci
            </Button>
          </HStack>
        </HStack>

        {/* Statistiky */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card>
            <CardBody>
              <Text fontSize="lg" fontWeight="bold">{apps.length}</Text>
              <Text color="gray.600">Celkem aplikací</Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text fontSize="lg" fontWeight="bold">{adminUsers.length}</Text>
              <Text color="gray.600">Admin uživatelů</Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text fontSize="lg" fontWeight="bold">
                {apps.filter(app => app.adminId).length}
              </Text>
              <Text color="gray.600">Přiřazených aplikací</Text>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Seznam aplikací */}
        <Box>
          <Heading size="md" mb={4}>Aplikace</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {apps.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="sm">{app.name}</Heading>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<SettingsIcon />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem icon={<ViewIcon />} onClick={() => handleEditApp(app.id)}>
                          Zobrazit
                        </MenuItem>
                        <MenuItem icon={<EditIcon />} onClick={() => handleEditApp(app.id)}>
                          Upravit
                        </MenuItem>
                        <MenuItem 
                          icon={<DeleteIcon />} 
                          color="red.500"
                          onClick={() => deleteApp(app.id)}
                        >
                          Smazat
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="sm" color="gray.600">
                      {app.description || 'Bez popisu'}
                    </Text>
                    
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Přiřazený admin:
                      </Text>
                      <Text fontSize="sm">
                        {app.adminEmail || 'Nepřiřazeno'}
                      </Text>
                    </Box>

                    {assigningAdmin === app.id ? (
                      <VStack spacing={2}>
                        <Select
                          size="sm"
                          value={selectedAdminId}
                          onChange={(e) => setSelectedAdminId(e.target.value)}
                          placeholder="Vyberte admina"
                        >
                          {adminUsers.map((user) => (
                            <option key={user.uid} value={user.uid}>
                              {user.email}
                            </option>
                          ))}
                        </Select>
                        <HStack>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={() => assignAdminToApp(app.id)}
                            isDisabled={!selectedAdminId}
                          >
                            Přiřadit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAssigningAdmin(null)
                              setSelectedAdminId('')
                            }}
                          >
                            Zrušit
                          </Button>
                        </HStack>
                      </VStack>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAssigningAdmin(app.id)}
                      >
                        Přiřadit admina
                      </Button>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Seznam uživatelů */}
        <Box>
          <Heading size="md" mb={4}>Uživatelé</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {users.map((user) => (
              <Card key={user.uid}>
                <CardBody>
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="bold">{user.email}</Text>
                    <Badge 
                      colorScheme={user.role === 'superadmin' ? 'red' : 'blue'}
                      alignSelf="start"
                    >
                      {user.role}
                    </Badge>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      </VStack>

      {/* Modal pro registraci nového uživatele */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Přidat nového uživatele</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <RegisterForm />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
} 