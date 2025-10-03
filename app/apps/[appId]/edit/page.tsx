'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { Box, Heading, Spinner, useToast, Tabs, TabList, TabPanels, Tab, TabPanel, Select, FormControl, FormLabel, Input, VStack, Button, Alert, AlertIcon, Collapse, AlertTitle, AlertDescription, Text, Switch, Divider, Badge } from '@chakra-ui/react'
import AppMenuEditor from '../../../components/AppMenuEditor'
import PageEditModal from '../../../components/PageEditModal'
import type { AppPage } from '../../../types'

export default function AppEditPage() {
  const params = useParams()
  const appId = params?.appId as string
  const toast = useToast()

  const [appData, setAppData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState<AppPage[]>([])
  const [pageEdit, setPageEdit] = useState<AppPage | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pickerActive, setPickerActive] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null)
  const [saveRetryCount, setSaveRetryCount] = useState(0)
  const [packageNameHelpOpen, setPackageNameHelpOpen] = useState(false)
  const [packageNameValidation, setPackageNameValidation] = useState<{
    isValid: boolean | null
    error: string | null
    warning: string | null
  }>({ isValid: null, error: null, warning: null })
  
  // Undo/Redo systém
  const [history, setHistory] = useState<Array<{
    menu: AppPage[]
    appData: any
    timestamp: number
  }>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isUndoRedo, setIsUndoRedo] = useState(false)

  // Pomocná funkce pro odstranění všech undefined hodnot rekurzivně
  function removeUndefined(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined).filter(v => v !== undefined)
    } else if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, removeUndefined(v)])
      )
    }
    return obj
  }

  function serializeMenu(menu: AppPage[]): any[] {
    return menu.map(page => removeUndefined({
      ...page,
      blocks: Array.isArray(page.blocks)
        ? page.blocks.map(block => {
            // Serialize standalone tables
            if (block.type === 'table' && Array.isArray(block.data)) {
              return { ...block, data: JSON.stringify(block.data) }
            }
            // Serialize tables in mixed blocks
            if (block.type === 'mixed' && block.content?.table?.data) {
              return {
                ...block,
                content: {
                  ...block.content,
                  table: {
                    ...block.content.table,
                    data: JSON.stringify(block.content.table.data)
                  }
                }
              }
            }
            return block
          })
        : page.blocks,
    }))
  }

  function deserializeMenu(menu: any[]): AppPage[] {
    return menu.map(page => ({
      ...page,
      blocks: Array.isArray(page.blocks)
        ? page.blocks.map(block => {
            // Deserialize standalone tables
            if (block.type === 'table' && typeof block.data === 'string') {
              return { ...block, data: JSON.parse(block.data) }
            }
            // Deserialize tables in mixed blocks
            if (block.type === 'mixed' && block.content?.table?.data && typeof block.content.table.data === 'string') {
              return {
                ...block,
                content: {
                  ...block.content,
                  table: {
                    ...block.content.table,
                    data: JSON.parse(block.content.table.data)
                  }
                }
              }
            }
            return block
          })
        : page.blocks,
    }))
  }

  useEffect(() => {
    if (!appId) return
    const fetchApp = async () => {
      setLoading(true)
      try {
        const docRef = doc(db, 'apps', appId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          let loadedMenu = deserializeMenu(data.menu || [])

          // MIGRACE: Pokud existuje globální content/images, promítni je do první stránky menu
          if (data.content || data.images) {
            if (loadedMenu.length === 0) loadedMenu = [{ title: 'Úvodní stránka', type: 'content' as const }]
            if (data.content && !loadedMenu[0].content) loadedMenu[0].content = data.content
            if (data.images && (!loadedMenu[0].images || loadedMenu[0].images.length === 0)) loadedMenu[0].images = data.images
          }

          // MIGRACE: Pokud některá stránka má obrázky ve starém formátu (imageUrl), převeď na images pole
          loadedMenu = loadedMenu.map(page => {
            if (page.imageUrl && (!page.images || page.images.length === 0)) {
              return { ...page, images: [{ url: page.imageUrl, alt: '', position: 'center', width: 100, margin: 10 }] }
            }
            return page
          })

          setAppData(data)
          setMenu(loadedMenu)
          
          // Inicializuj historii s počátečním stavem
          const initialState = {
            menu: [...loadedMenu],
            appData: { ...data },
            timestamp: Date.now()
          }
          setHistory([initialState])
          setHistoryIndex(0)
        } else {
          toast({ title: 'Aplikace nenalezena', status: 'error' })
        }
      } catch (e) {
        toast({ title: 'Chyba při načítání aplikace', status: 'error' })
      } finally {
        setLoading(false)
      }
    }
    fetchApp()
  }, [appId])

  // Automatické ukládání do historie při změnách
  useEffect(() => {
    if (!loading && appData && menu.length > 0) {
      const historyTimeout = setTimeout(() => {
        saveToHistory()
      }, 1000)
      return () => clearTimeout(historyTimeout)
    }
  }, [menu, appData, appId, loading])

  // Automatické ukládání menu a appData do Firestore s retry logikou
  useEffect(() => {
    if (!loading && appId) {
      const saveTimeout = setTimeout(async () => {
        setSaveStatus('saving')
        const saveData = async (retryCount = 0) => {
          try {
            const updateData: any = { menu: serializeMenu(menu) }
            if (appData) {
              updateData.name = appData.name
              updateData.description = appData.description
              updateData.packageName = appData.packageName
              updateData.settings = appData.settings
            }
            await updateDoc(doc(db, 'apps', appId), updateData)
            setSaveStatus('saved')
            setSaveRetryCount(0)
            setTimeout(() => setSaveStatus(null), 3000)
          } catch (e) {
            console.error('Save error:', e)
            if (retryCount < 3) {
              setTimeout(() => saveData(retryCount + 1), 2000)
              setSaveRetryCount(retryCount + 1)
            } else {
              setSaveStatus('error')
              setSaveRetryCount(0)
              toast({ 
                title: 'Chyba při automatickém ukládání', 
                description: 'Zkuste uložit ručně nebo obnovit stránku',
                status: 'error',
                duration: 5000
              })
            }
          }
        }
        saveData()
      }, 2000)
      return () => clearTimeout(saveTimeout)
    }
  }, [menu, appData, appId, loading])

  const handleEditPage = (idx: number) => {
    setPageEdit(menu[idx])
    setModalOpen(true)
    // Automatické ukládání se postará o uložení změn
  }

  // Funkce pro generování unikátního id
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  // Validace package name
  const validatePackageName = (packageName: string) => {
    if (!packageName) {
      setPackageNameValidation({ isValid: false, error: 'Package name je povinný', warning: null })
      return
    }

    // Základní validace formátu
    const packageNameRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/
    if (!packageNameRegex.test(packageName)) {
      setPackageNameValidation({ 
        isValid: false, 
        error: 'Neplatný formát. Použijte malá písmena, číslice a tečky (např. com.example.myapp)', 
        warning: null 
      })
      return
    }

    // Kontrola délky
    if (packageName.length < 3) {
      setPackageNameValidation({ isValid: false, error: 'Package name je příliš krátký', warning: null })
      return
    }
    if (packageName.length > 100) {
      setPackageNameValidation({ isValid: false, error: 'Package name je příliš dlouhý', warning: null })
      return
    }

    // Kontrola zda se jedná o produkční aplikaci (obsahuje vypovídající název)
    if (!packageName.includes('example') && !packageName.includes('test') && !packageName.includes('demo')) {
      setPackageNameValidation({ 
        isValid: true, 
        error: null, 
        warning: 'Tento package name vypadá jako produkční. Ujistěte se, že je unikátní!' 
      })
    } else {
      setPackageNameValidation({ isValid: true, error: null, warning: null })
    }
  }

  // Kontrola duplicity package name
  const checkPackageNameDuplicate = async (packageName: string) => {
    if (!packageName || !appId) return
    
    try {
      // Najdi všechny aplikace s tímto package name (kromě aktuální)
      const appsQuery = query(
        collection(db, 'apps'),
        where('packageName', '==', packageName)
      )
      const appsSnapshot = await getDocs(appsQuery)
      
      // Filtr pouze aplikace které nejsou aktuální
      const duplicateApps = appsSnapshot.docs.filter(doc => doc.id !== appId)
      
      if (duplicateApps.length > 0) {
        const appNames = duplicateApps.map(doc => doc.data().name || 'Bez názvu').join(', ')
        setPackageNameValidation({ 
          isValid: false, 
          error: null, 
          warning: `⚠️ Tento package name již používá aplikace: ${appNames}. Pro produkci použijte unikátní package name!` 
        })
      }
    } catch (error) {
      console.error('Error checking package name duplicate:', error)
    }
  }

  // Undo/Redo funkce
  const saveToHistory = () => {
    if (isUndoRedo) return
    
    const currentState = {
      menu: [...menu],
      appData: appData ? {...appData} : null,
      timestamp: Date.now()
    }
    
    // Odstraň vše za aktuální pozicí
    const newHistory = history.slice(0, historyIndex + 1)
    
    // Přidej nový stav
    newHistory.push(currentState)
    
    // Omezte historii na 50 stavů
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(prev => prev + 1)
    }
    
    setHistory(newHistory)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setIsUndoRedo(true)
      const prevState = history[historyIndex - 1]
      setMenu(prevState.menu)
      setAppData(prevState.appData)
      setHistoryIndex(prevState => prevState - 1)
      
      toast({
        title: 'Změna vrácena',
        description: `Vracem na stav z ${new Date(prevState.timestamp).toLocaleTimeString()}`,
        status: 'info',
        duration: 2000
      })
      
      setTimeout(() => setIsUndoRedo(false), 100)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true)
      const nextState = history[historyIndex + 1]
      setMenu(nextState.menu)
      setAppData(nextState.appData)
      setHistoryIndex(prevState => prevState + 1)
      
      toast({
        title: 'Změna obnovena',
        description: `Obnovujem na stav z ${new Date(nextState.timestamp).toLocaleTimeString()}`,
        status: 'info',
        duration: 2000
      })
      
      setTimeout(() => setIsUndoRedo(false), 100)
    }
  }

  const handleSavePage = async () => {
    if (pageEdit) {
      // Najdi stránku podle id (nebo title, pokud není id)
      const idx = menu.findIndex(p => (p.id && pageEdit.id && p.id === pageEdit.id) || (!p.id && !pageEdit.id && p.title === pageEdit.title))
      if (idx !== -1) {
        const newMenu = [...menu]
        newMenu[idx] = pageEdit
        setMenu(newMenu)
        setModalOpen(false)
        // Automatické ukládání se postará o uložení do Firestore
      }
    }
  }

  const handleSaveApp = async () => {
    try {
      setSaveStatus('saving')
      await updateDoc(doc(db, 'apps', appId), { menu: serializeMenu(menu) })
      setSaveStatus('saved')
      setSaveRetryCount(0)
      toast({ title: 'Aplikace uložena', status: 'success' })
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (e) {
      console.error('Save error:', e)
      setSaveStatus('error')
      setSaveRetryCount(0)
      toast({ 
        title: 'Chyba při ukládání', 
        description: e instanceof Error ? e.message : 'Neznámá chyba',
        status: 'error',
        duration: 5000
      })
    }
  }

  const handleGenerate = async () => {
    if (saveStatus === 'error') {
      toast({ title: 'Nelze generovat', description: 'Nejprve opravte chyby při ukládání!', status: 'warning' })
      return
    }
    if (saveStatus === null) {
      toast({ title: 'Nelze generovat', description: 'Nejprve uložte všechny změny!', status: 'warning' })
      return
    }
    setGenerating(true)
    setDownloadUrl(null)
    setGenerateError(null)
    try {
      // VŽDY načti aktuální data z Firestore těsně před generováním
      const docRef = doc(db, 'apps', appId)
      const docSnap = await getDoc(docRef)
      let latestMenu = menu
      let latestAppData = appData
      if (docSnap.exists()) {
        latestAppData = docSnap.data()
        latestMenu = docSnap.data().menu || []
      }
      
      // Kontrola, zda jsou data platná
      if (!latestMenu || latestMenu.length === 0) {
        throw new Error('Aplikace nemá žádné stránky. Přidejte alespoň jednu stránku.')
      }
      
      const config = {
        appId: appId, // Přidáno: appId pro správné propojení s Firestore
        appName: latestAppData.name,
        appDescription: latestAppData.description,
        packageName: latestAppData.packageName || `com.example.${latestAppData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        pages: latestMenu,
        settings: latestAppData.settings || {},
      }
      
      toast({ title: 'Generuji aplikaci...', status: 'info' })
      
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      if (data.success && data.downloadUrl) {
        setDownloadUrl(data.downloadUrl)
        toast({ title: 'APK vygenerováno úspěšně!', status: 'success' })
      } else {
        setGenerateError(data.error || 'Chyba při generování')
        toast({ title: 'Chyba při generování', description: data.error, status: 'error' })
      }
    } catch (e: any) {
      console.error('Generate error:', e)
      setGenerateError(e.message)
      toast({ 
        title: 'Chyba při generování', 
        description: e.message, 
        status: 'error',
        duration: 5000
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <Spinner size="xl" />
  if (!appData) return <Box>Aplikace nenalezena</Box>

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>Editor aplikace: {appData.name}</Heading>
      {/* Stav uložení */}
      {saveStatus === 'saving' && (
        <Box color="blue.500" mb={2}>
          Ukládám změny... {saveRetryCount > 0 && `(pokus ${saveRetryCount}/3)`}
        </Box>
      )}
      {saveStatus === 'saved' && <Box color="green.600" mb={2}>✓ Změny uloženy</Box>}
      {saveStatus === 'error' && (
        <Box color="red.500" mb={2}>
          ❌ Chyba při ukládání změn! 
          <button 
            onClick={handleSaveApp} 
            style={{ marginLeft: 10, padding: '4px 8px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Zkusit znovu
          </button>
        </Box>
      )}
      <Box display={{ base: 'block', lg: 'flex' }} alignItems="flex-start" gap={8}>
        {/* Levý sloupec: editor menu */}
        <Box flex="2" minW={0}>
          {/* Základní nastavení aplikace */}
          <VStack spacing={4} align="stretch" mb={6} p={4} bg="gray.50" borderRadius="md">
            <Heading size="md">Základní nastavení</Heading>
            <FormControl>
              <FormLabel>Název aplikace</FormLabel>
              <Input 
                value={appData.name || ''} 
                onChange={e => setAppData({ ...appData, name: e.target.value })}
                placeholder="Název aplikace"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Popis aplikace</FormLabel>
              <Input 
                value={appData.description || ''} 
                onChange={e => setAppData({ ...appData, description: e.target.value })}
                placeholder="Popis aplikace"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Package Name (Android)</FormLabel>
              <Input 
                value={appData.packageName || ''} 
                onChange={e => {
                  setAppData({ ...appData, packageName: e.target.value })
                  validatePackageName(e.target.value)
                }}
                onBlur={() => {
                  if (appData.packageName) {
                    validatePackageName(appData.packageName)
                    checkPackageNameDuplicate(appData.packageName)
                  }
                }}
                placeholder="com.nazev_projektu_nebo_firmy.tady_vas_package_name..."
                isInvalid={packageNameValidation.error !== null}
              />
              
              {/* Help Button */}
              <Button 
                size="xs" 
                variant="link" 
                colorScheme="blue"
                onClick={() => setPackageNameHelpOpen(!packageNameHelpOpen)}
                mt={1}
              >
                {packageNameHelpOpen ? 'Skrýt návod' : 'Jak získat Package Name?'}
              </Button>
              
              {/* Expandable Help Section */}
              <Collapse in={packageNameHelpOpen} animateOpacity>
                <Box 
                  bg="blue.50" 
                  border="1px" 
                  borderColor="blue.200" 
                  borderRadius="md" 
                  p={4} 
                  mt={2}
                  fontSize="sm"
                >
                  <VStack align="start" spacing={3}>
                    <Box>
                      <Text fontWeight="bold" color="blue.700">1️⃣ Najděte Package Name v Google Play Console:</Text>
                      <Text ml={4}>• Přihlaste se na <Text as="span" color="blue.600">console.developers.google.com</Text></Text>
                      <Text ml={4}>• Vyberte svůj projekt → Aplikace → Všechny aplikace</Text>
                      <Text ml={4}>• Najděte aplikaci a klikněte na ni</Text>
                      <Text ml={4}>• Package Name najdete pod základními informacemi</Text>
                    </Box>
                    
                    <Box>
                      <Text fontWeight="bold" color="blue.700">2️⃣ Nebo najděte v APK souboru:</Text>
                      <Text ml={4}>• Použijte APK Analyzer v Android Studio</Text>
                      <Text ml={4}>• Nebo použijte online nástroj jako APKPure Analyzer</Text>
                    </Box>
                    
                    <Box>
                      <Text fontWeight="bold" color="blue.700">3️⃣ Pro novou aplikaci:</Text>
                      <Text ml={4}>• Vytvořte projekt v Firebase Console</Text>
                      <Text ml={4}>• Přidejte Android aplikaci s vlastním Package Name</Text>
                      <Text ml={4}>• Formát: com.vase_organizace.nazev_aplikace</Text>
                    </Box>
                    
                    <Alert status="info" size="sm">
                      <AlertIcon />
                      <Box>
                        <AlertDescription>
                          <Text fontWeight="bold">Bezpečnostní tip:</Text> Pokud používáte existující Package Name, stáhněte si nový google-services.json soubor a nahrajte ho do složky server/google-services/[package-name]/
                        </AlertDescription>
                      </Box>
                    </Alert>
                  </VStack>
                </Box>
              </Collapse>

              {/* Validation Messages */}
              {packageNameValidation.error && (
                <Alert status="error" size="sm" mt={2}>
                  <AlertIcon />
                  <AlertDescription>{packageNameValidation.error}</AlertDescription>
                </Alert>
              )}
              
              {packageNameValidation.warning && !packageNameValidation.error && (
                <Alert status="warning" size="sm" mt={2}>
                  <AlertIcon />
                  <AlertDescription>{packageNameValidation.warning}</AlertDescription>
                </Alert>
              )}

              <Box fontSize="sm" color="gray.600" mt={1}>
                Jedinečný identifikátor pro Android aplikaci. Použije se pro instalaci a aktualizace.
              </Box>
            </FormControl>
          </VStack>

          {/* Pokročilá nastavení aplikace */}
          <VStack spacing={4} align="stretch" mb={6} p={4} bg="gray.50" borderRadius="md">
            <Heading size="md">Pokročilá nastavení</Heading>
            
            {/* Uživatelské účty */}
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <FormLabel mb={0}>
                  Uživatelské účty
                </FormLabel>
                <Text fontSize="sm" color="gray.600">
                  Aplikace bude mít přihlašování registrovaných uživatelů
                </Text>
              </Box>
              <Switch 
                isChecked={appData?.settings?.userAccounts || false}
                onChange={e => setAppData({ 
                  ...appData, 
                  settings: { 
                    ...appData?.settings, 
                    userAccounts: e.target.checked 
                  }
                })}
                colorScheme="blue"
              />
            </FormControl>

            {/* Pokud jsou uživatelské účty zapnuté, zobraz dodatečné nastavení */}
            <Collapse in={appData?.settings?.userAccounts || false} animateOpacity>
              <Box pl={4} borderLeft="2px" borderColor="blue.200">
                <FormControl>
                  <FormLabel fontSize="sm">Možnosti registrace</FormLabel>
                  <VStack align="start" spacing={2} mt={2}>
                    <FormControl display="flex" alignItems="center">
                      <Switch 
                        isChecked={appData?.settings?.allowEmailRegistration || false}
                        onChange={e => setAppData({ 
                          ...appData, 
                          settings: { 
                            ...appData?.settings, 
                            allowEmailRegistration: e.target.checked 
                          }
                        })}
                        colorScheme="green"
                        size="sm"
                      />
                      <Text fontSize="sm" ml={2}>
                        Registrace emailem a heslem
                      </Text>
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <Switch 
                        isChecked={appData?.settings?.allowSocialLogin || false}
                        onChange={e => setAppData({ 
                          ...appData, 
                          settings: { 
                            ...appData?.settings, 
                            allowSocialLogin: e.target.checked 
                          }
                        })}
                        colorScheme="orange"
                        size="sm"
                      />
                      <Text fontSize="sm" ml={2}>
                        Přihlášení přes Google/Facebook
                      </Text>
                    </FormControl>
                  </VStack>
                </FormControl>

                <Alert status="info" size="sm" mt={4}>
                  <AlertIcon />
                  <AlertDescription fontSize="xs">
                    <Text fontWeight="bold">Požadavky:</Text> Pro uživatelské účty budete potřebovat vlastní Firebase projekt s povoleným Authentication. Více informací je v dokumentaci.
                  </AlertDescription>
                </Alert>
              </Box>
            </Collapse>

            <Divider />

            {/* Push Notifikace */}
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <FormLabel mb={0}>
                  Push Notifikace
                </FormLabel>
                <Text fontSize="sm" color="gray.600">
                  Možnost posílat oznámení uživatelům aplikace
                </Text>
              </Box>
              <Switch 
                isChecked={appData?.settings?.pushNotifications || false}
                onChange={e => setAppData({ 
                  ...appData, 
                  settings: { 
                    ...appData?.settings, 
                    pushNotifications: e.target.checked 
                  }
                })}
                colorScheme="purple"
              />
            </FormControl>

            {/* Chat System */}
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <FormLabel mb={0}>
                  Chat System
                </FormLabel>
                <Text fontSize="sm" color="gray.600">
                  Uživatelé mohou chatovat a sdílet fotografie
                </Text>
              </Box>
              <Switch 
                isChecked={appData?.settings?.chatSystem || false}
                onChange={e => setAppData({ 
                  ...appData, 
                  settings: { 
                    ...appData?.settings, 
                    chatSystem: e.target.checked 
                  }
                })}
                colorScheme="teal"
              />
            </FormControl>


            {/* Status badges */}
            <Box display="flex" gap={2} flexWrap="wrap">
              {appData?.settings?.userAccounts && (
                <Badge colorScheme="blue">Uživatelské účty</Badge>
              )}
              {appData?.settings?.pushNotifications && (
                <Badge colorScheme="purple">Push Notifikace</Badge>
              )}
              {appData?.settings?.chatSystem && (
                <Badge colorScheme="teal">Chat System</Badge>
              )}
              {!appData?.settings?.userAccounts && !appData?.settings?.pushNotifications && !appData?.settings?.chatSystem && (
                <Badge colorScheme="gray">Základní nastavení</Badge>
              )}
            </Box>
          </VStack>
          
          <AppMenuEditor
            pages={menu}
            onChange={pages => {
              // Pokud stránka nemá id, vygeneruj ho
              const withIds = pages.map(page => page.id ? page : { ...page, id: generateId() })
              setMenu(withIds)
            }}
            onEdit={handleEditPage}
          />
          <Box mt={4} display="flex" gap={4} alignItems="center" flexWrap="wrap">
            {/* Undo/Redo ovládání */}
            <Box display="flex" gap={2}>
              <Button 
                size="sm" 
                variant="outline"
                onClick={undo}
                disabled={historyIndex <= 0}
                title={historyIndex > 0 ? `Undo: vrať se na stav z ${new Date(history[historyIndex - 1]?.timestamp).toLocaleString()}` : 'Nelze vrátit'}
              >
                ↶ Undo
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title={historyIndex < history.length - 1 ? `Redo: pokračuj na stav z ${new Date(history[historyIndex + 1]?.timestamp).toLocaleString()}` : 'Nelze pokračovat'}
              >
                ↷ Redo
              </Button>
            </Box>
            
            <Button onClick={handleSaveApp} disabled={saveStatus === 'saving'} colorScheme="blue">
              {saveStatus === 'saved' ? 'Změny uloženy' : 'Uložit změny'}
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={generating || saveStatus === 'error' || saveStatus === null} 
              colorScheme="green"
              title={saveStatus === 'error' || saveStatus === null ? 'Nejprve uložte změny' : 'Generovat APK'}
            >
              {generating ? 'Generuji...' : 'Generovat APK'}
            </Button>
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 16, color: 'green' }}>
                Stáhnout APK
              </a>
            )}
            {generateError && (
              <Box color="red.500" ml={4}>{generateError}</Box>
            )}
          </Box>
        </Box>
        {/* Pravý sloupec: mobilní simulátor */}
        <Box flex="1" minW="390px" maxW="420px" position="sticky" top={6} zIndex={2}>
          <Box mb={2}>
            <Select value={previewIdx} onChange={e => setPreviewIdx(Number(e.target.value))} w="100%">
              {menu.map((page, idx) => (
                <option key={idx} value={idx}>{page.title || `Stránka ${idx+1}`}</option>
              ))}
            </Select>
          </Box>
          <Box
            mx="auto"
            border="2px solid #333"
            borderRadius="32px"
            w="390px"
            h="800px"
            bg="white"
            position="relative"
            overflow="hidden"
            boxShadow="lg"
            display="flex"
            flexDirection="column"
          >
            <Box p={4} pt={6} pb={16} h="100%" overflowY="auto" flex="1">
              {menu[previewIdx] && (
                <Box>
                  <Heading size="md" mb={2}>{menu[previewIdx].title}</Heading>
                  {/* Nový renderovací systém pro bloky */}
                  {Array.isArray(menu[previewIdx].blocks) && menu[previewIdx].blocks.length > 0 ? (
                    <VStack spacing={3} align="stretch">
                      {menu[previewIdx].blocks.map((block, idx) => {
                        const getBlockStyle = (block: any) => {
                          const style = block.style || {}
                          return {
                            padding: `${style.padding || 8}px`,
                            margin: `${style.margin || 8}px`,
                            borderRadius: `${style.borderRadius || 0}px`,
                            borderWidth: `${style.borderWidth || 0}px`,
                            borderColor: style.borderColor || 'transparent',
                            borderStyle: style.borderStyle || 'solid',
                            backgroundColor: style.backgroundColor || 'transparent',
                            color: style.textColor || 'inherit',
                            fontSize: style.fontSize ? `${style.fontSize}px` : 'inherit',
                            fontWeight: style.fontWeight || 'normal',
                            textAlign: style.textAlign || 'left',
                            boxShadow: style.boxShadow || 'none',
                            ...(style.autoProportions && {
                              padding: '16px',
                              margin: '12px',
                              borderRadius: '8px'
                            })
                          }
                        }

                        if (block.type === 'text') return (
                          <Box key={idx} style={getBlockStyle(block)}>
                            {block.content}
                          </Box>
                        )
                        
                        if (block.type === 'table') return (
                          <Box key={idx} style={getBlockStyle(block)}>
                            <Box 
                              as="table" 
                              border="1px solid #ccc" 
                              borderRadius="md" 
                              w="100%" 
                              style={{ 
                                borderCollapse: 'collapse',
                                tableLayout: 'fixed',
                                minWidth: '100%'
                              }}
                            >
                              <tbody>
                                {block.data.map((row: any, i: number) => (
                                  <tr key={i}>
                                    {row.map((cell: any, j: number) => (
                                      <td 
                                        key={j} 
                                        style={{ 
                                          border: '1px solid #ccc', 
                                          padding: '8px 4px',
                                          wordWrap: 'break-word',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: `${100 / row.length}%`,
                                          width: `${100 / row.length}%`
                                        }}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </Box>
                          </Box>
                        )
                        
                        if (block.type === 'image') return (
                          <Box key={idx} style={getBlockStyle(block)}>
                            <Box textAlign={block.align === 'left' || block.align === 'right' || block.align === 'center' ? block.align : 'center'}>
                              <img 
                                src={block.url} 
                                alt={block.alt || ''} 
                                style={{ 
                                  width: block.width ? block.width + 'px' : '300px', 
                                  maxWidth: '100%', 
                                  borderRadius: 8, 
                                  display: 'block', 
                                  margin: block.align === 'center' ? '0 auto' : undefined, 
                                  float: block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : undefined 
                                }} 
                              />
                            </Box>
                          </Box>
                        )
                        
                        if (block.type === 'button') {
                          const blockStyle = block.style || {}
                          const buttonStyle = {
                            ...getBlockStyle(block),
                            padding: `${blockStyle.padding || 12}px ${blockStyle.padding || 24}px`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            transform: 'translateY(0)',
                            ...(blockStyle.plasticEffect && {
                              background: 'linear-gradient(145deg, #e6e6e6, #ffffff)',
                              boxShadow: '5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff'
                            })
                          }
                          
                          return (
                            <Box key={idx} style={{ margin: `${blockStyle.margin || 8}px` }}>
                              <button
                                style={buttonStyle}
                                onClick={() => {
                                  if (block.url) {
                                    window.open(block.url, '_blank')
                                  } else if (block.action) {
                                    console.log('Button action:', block.action)
                                  }
                                }}
                                onMouseDown={(e) => {
                                  if (blockStyle.plasticEffect) {
                                    e.currentTarget.style.transform = 'translateY(2px)'
                                    e.currentTarget.style.boxShadow = '2px 2px 5px #d1d1d1, -2px -2px 5px #ffffff'
                                  }
                                }}
                                onMouseUp={(e) => {
                                  if (blockStyle.plasticEffect) {
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    e.currentTarget.style.boxShadow = '5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff'
                                  }
                                }}
                              >
                                {block.text || 'Tlačítko'}
                              </button>
                            </Box>
                          )
                        }

                        if (block.type === 'mixed') {
                          const content = block.content as any
                          const blockStyle = block.style || {}
                          
                          return (
                            <Box key={idx} style={getBlockStyle(block)}>
                              <VStack spacing={3} align="stretch">
                                {content.text && (
                                  <Box>{content.text}</Box>
                                )}
                                {content.image && content.image.url && (
                                  <Box textAlign={content.image.align === 'left' || content.image.align === 'right' || content.image.align === 'center' ? content.image.align : 'center'}>
                                    <img 
                                      src={content.image.url} 
                                      alt={content.image.alt || ''} 
                                      style={{ 
                                        width: content.image.width ? content.image.width + 'px' : '300px', 
                                        maxWidth: '100%', 
                                        borderRadius: 8, 
                                        display: 'block', 
                                        margin: content.image.align === 'center' ? '0 auto' : undefined, 
                                        float: content.image.align === 'left' ? 'left' : content.image.align === 'right' ? 'right' : undefined 
                                      }} 
                                    />
                                  </Box>
                                )}
                                {content.button && content.button.text && (
                                  <Box textAlign="center">
                                    <Button
                                      colorScheme="blue"
                                      onClick={() => {
                                        if (content.button.url) {
                                          window.open(content.button.url, '_blank')
                                        }
                                      }}
                                      onMouseDown={(e) => {
                                        if (blockStyle.plasticEffect) {
                                          e.currentTarget.style.transform = 'scale(0.95)'
                                        }
                                      }}
                                      onMouseUp={(e) => {
                                        if (blockStyle.plasticEffect) {
                                          e.currentTarget.style.transform = 'scale(1)'
                                        }
                                      }}
                                      style={{
                                        transition: 'transform 0.1s ease',
                                        boxShadow: blockStyle.plasticEffect ? '0 4px 8px rgba(0,0,0,0.2)' : undefined
                                      }}
                                    >
                                      {content.button.text}
                                    </Button>
                                  </Box>
                                )}
                                {content.table && content.table.data && (
                                  <Box 
                                    as="table" 
                                    border="1px solid #ccc" 
                                    borderRadius="md" 
                                    w="100%" 
                                    style={{ 
                                      borderCollapse: 'collapse',
                                      tableLayout: 'fixed',
                                      minWidth: '100%'
                                    }}
                                  >
                                    <tbody>
                                      {content.table.data.map((row: any, i: number) => (
                                        <tr key={i}>
                                          {row.map((cell: any, j: number) => (
                                            <td 
                                              key={j} 
                                              style={{ 
                                                border: '1px solid #ccc', 
                                                padding: '8px 4px',
                                                wordWrap: 'break-word',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: `${100 / row.length}%`,
                                                width: `${100 / row.length}%`
                                              }}
                                            >
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Box>
                                )}
                              </VStack>
                            </Box>
                          )
                        }
                        
                        return null
                      })}
                    </VStack>
                  ) : menu[previewIdx].content ? (
                    <Box color="gray.600">{menu[previewIdx].content}</Box>
                  ) : (
                    <Box color="gray.400" fontStyle="italic">Žádný obsah</Box>
                  )}
                  {/* WebView stránka */}
                  {menu[previewIdx].type === 'webview' && menu[previewIdx].url && (
                    <Box h="600px" borderWidth={1} borderRadius="md" overflow="hidden">
                      <iframe src={menu[previewIdx].url} style={{ width: '100%', height: '100%', border: 'none' }} title="WebView náhled" />
                      <Box fontSize="xs" color="gray.500" mt={1}>Skryté elementy budou aplikovány v mobilní aplikaci.</Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
            {/* Spodní lišta - simulace skutečného menu aplikace */}
            <Box display="flex" justifyContent="space-around" alignItems="center" h="56px" bg="purple.200" borderTop="1px solid #ccc" borderBottomRadius="32px">
              {/* Zpět tlačítko */}
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                px={2}
                py={1}
                cursor="pointer"
                color="gray.700"
                fontSize="xs"
              >
                <Box fontSize="lg">←</Box>
                <Box>Zpět</Box>
              </Box>
              
              {/* Domů tlačítko - aktivní */}
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                px={2}
                py={1}
                cursor="pointer"
                color="purple.700"
                fontSize="xs"
                bg="purple.300"
                borderRadius="md"
                fontWeight="bold"
              >
                <Box fontSize="lg">🏠</Box>
                <Box>Domů</Box>
              </Box>
              
              {/* Menu tlačítko */}
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                px={2}
                py={1}
                cursor="pointer"
                color="gray.700"
                fontSize="xs"
              >
                <Box fontSize="lg">☰</Box>
                <Box>Menu</Box>
              </Box>
            </Box>
            <Box position="absolute" top={0} left={0} w="100%" h="32px" bg="gray.200" borderBottom="1px solid #ccc" borderTopRadius="32px" />
          </Box>
        </Box>
      </Box>
      <PageEditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        pageEdit={pageEdit}
        setPageEdit={setPageEdit}
        onSave={handleSavePage}
        pickerActive={pickerActive}
        setPickerActive={setPickerActive}
      />
    </Box>
  )
}