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
  Spinner,
  Center,
  Alert,
  AlertIcon
} from '@chakra-ui/react'
import { 
  SettingsIcon, 
  EditIcon,
  ViewIcon,
  BellIcon
} from '@chakra-ui/icons'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth-context'

interface App {
  id: string
  name: string
  description: string
  adminId: string
  createdAt: any
  menu?: any[]
}

export default function AdminDashboard() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  
  const { userRole } = useAuth()
  const toast = useToast()

  useEffect(() => {
    loadMyApps()
  }, [userRole]) // přidáno userRole jako závislost

  const loadMyApps = async () => {
    console.log('userRole:', userRole) // debug výpis
    if (!userRole) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Načti aplikace přiřazené tomuto adminovi
      const appsQuery = query(
        collection(db, 'apps'),
        where('adminId', '==', userRole.uid)
      )
      const appsSnapshot = await getDocs(appsQuery)
      const appsData: App[] = []
      
      for (const appDoc of appsSnapshot.docs) {
        const appData = appDoc.data()
        appsData.push({
          id: appDoc.id,
          name: appData.name || 'Bez názvu',
          description: appData.description || '',
          adminId: appData.adminId || '',
          createdAt: appData.createdAt,
          menu: appData.menu || []
        })
      }

      setApps(appsData)
    } catch (error) {
      console.error('Error loading apps:', error)
      toast({
        title: 'Chyba při načítání aplikací',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditApp = (appId: string) => {
    // TODO: Přesměrovat na editor aplikace
    toast({
      title: 'Editor aplikace',
      description: `Otevírám editor pro aplikaci ${appId}`,
      status: 'info',
      duration: 3000,
    })
  }

  const handleSendNotification = (appId: string) => {
    // TODO: Otevřít modal pro posílání notifikací
    toast({
      title: 'Notifikace',
      description: `Posílání notifikací pro aplikaci ${appId}`,
      status: 'info',
      duration: 3000,
    })
  }

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
        <Box>
          <Heading size="lg">Admin Dashboard</Heading>
          <Text color="gray.600">
            Správa vašich přiřazených aplikací
          </Text>
        </Box>

        {/* Statistiky */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card>
            <CardBody>
              <Text fontSize="lg" fontWeight="bold">{apps.length}</Text>
              <Text color="gray.600">Vaše aplikace</Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text fontSize="lg" fontWeight="bold">
                {apps.reduce((total, app) => total + (app.menu?.length || 0), 0)}
              </Text>
              <Text color="gray.600">Celkem stránek</Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text fontSize="lg" fontWeight="bold">
                {apps.filter(app => app.menu && app.menu.length > 0).length}
              </Text>
              <Text color="gray.600">Aktivní aplikace</Text>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Seznam aplikací */}
        {apps.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            Zatím nemáte přiřazené žádné aplikace. Kontaktujte superadmina.
          </Alert>
        ) : (
          <Box>
            <Heading size="md" mb={4}>Vaše aplikace</Heading>
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
                          <MenuItem 
                            icon={<ViewIcon />}
                            onClick={() => handleEditApp(app.id)}
                          >
                            Zobrazit/Upravit
                          </MenuItem>
                          <MenuItem 
                            icon={<EditIcon />}
                            onClick={() => handleEditApp(app.id)}
                          >
                            Upravit obsah
                          </MenuItem>
                          <MenuItem 
                            icon={<BellIcon />}
                            onClick={() => handleSendNotification(app.id)}
                          >
                            Poslat notifikaci
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
                          Počet stránek:
                        </Text>
                        <Badge colorScheme="blue">
                          {app.menu?.length || 0} stránek
                        </Badge>
                      </Box>

                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleEditApp(app.id)}
                          flex={1}
                        >
                          Upravit aplikaci
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendNotification(app.id)}
                        >
                          <BellIcon />
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Informace o právech */}
        <Card>
          <CardHeader>
            <Heading size="sm">Vaše práva</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={2}>
              <Text fontSize="sm">
                • Můžete upravovat obsah svých přiřazených aplikací
              </Text>
              <Text fontSize="sm">
                • Můžete měnit pořadí stránek a nastavit homepage
              </Text>
              <Text fontSize="sm">
                • Můžete posílat notifikace uživatelům vašich aplikací
              </Text>
              <Text fontSize="sm">
                • Změny obsahu se projeví v reálném čase v nasazených aplikacích
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  )
} 