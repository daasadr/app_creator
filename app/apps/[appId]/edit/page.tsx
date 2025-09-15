'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { Box, Heading, Spinner, useToast, Tabs, TabList, TabPanels, Tab, TabPanel, Select, FormControl, FormLabel, Input, VStack } from '@chakra-ui/react'
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
  const [pageEdit, setPageEdit] = useState<AppPage & { blocks?: any[] } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pickerActive, setPickerActive] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null)
  const [saveRetryCount, setSaveRetryCount] = useState(0)

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
        ? page.blocks.map(block =>
            block.type === 'table' && Array.isArray(block.data)
              ? { ...block, data: JSON.stringify(block.data) }
              : block
          )
        : page.blocks,
    }))
  }

  function deserializeMenu(menu: any[]): AppPage[] {
    return menu.map(page => ({
      ...page,
      blocks: Array.isArray(page.blocks)
        ? page.blocks.map(block =>
            block.type === 'table' && typeof block.data === 'string'
              ? { ...block, data: JSON.parse(block.data) }
              : block
          )
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
            if (loadedMenu.length === 0) loadedMenu = [{}]
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

  // Automatické ukládání menu do Firestore s retry logikou
  useEffect(() => {
    if (!loading && appId) {
      const saveTimeout = setTimeout(async () => {
        setSaveStatus('saving')
        const saveMenu = async (retryCount = 0) => {
          try {
            await updateDoc(doc(db, 'apps', appId), { menu: serializeMenu(menu) })
            setSaveStatus('saved')
            setSaveRetryCount(0)
            setTimeout(() => setSaveStatus(null), 3000)
          } catch (e) {
            console.error('Save error:', e)
            if (retryCount < 3) {
              setTimeout(() => saveMenu(retryCount + 1), 2000)
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
        saveMenu()
      }, 2000)
      return () => clearTimeout(saveTimeout)
    }
  }, [menu, appId, loading])

  const handleEditPage = (idx: number) => {
    setPageEdit(menu[idx])
    setModalOpen(true)
    setSaved(false) // Po editaci stránky nejsou změny uložené
  }

  // Funkce pro generování unikátního id
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
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
                onChange={e => setAppData({ ...appData, packageName: e.target.value })}
                placeholder="com.example.hezka_aplikace"
              />
              <Box fontSize="sm" color="gray.600" mt={1}>
                Jedinečný identifikátor pro Android aplikaci. Použije se pro instalaci a aktualizace.
              </Box>
            </FormControl>
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
          <Box mt={4} display="flex" gap={4} alignItems="center">
            <button onClick={handleSaveApp} disabled={saved}>
              {saved ? 'Změny uloženy' : 'Uložit změny'}
            </button>
            <button 
              onClick={handleGenerate} 
              disabled={generating || !saved} 
              style={{ minWidth: 120 }}
              title={!saved ? 'Nejprve uložte změny' : 'Generovat APK'}
            >
              {generating ? 'Generuji...' : 'Generovat APK'}
            </button>
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
                  {/* Zobraz text z content nebo z blocks */}
                  {menu[previewIdx].content ? (
                    <Box color="gray.600">{menu[previewIdx].content}</Box>
                  ) : Array.isArray(menu[previewIdx].blocks) && menu[previewIdx].blocks.find(b => b.type === 'text') ? (
                    <Box color="gray.600">{menu[previewIdx].blocks.find(b => b.type === 'text').content}</Box>
                  ) : (
                    <Box color="gray.400" fontStyle="italic">Žádný obsah</Box>
                  )}
                  {/* Obrázky z images */}
                  {menu[previewIdx].images && menu[previewIdx].images.length > 0 && (
                    <VStack spacing={2} mb={3} align="stretch">
                      {menu[previewIdx].images.map((img, idx) => (
                        <Box 
                          key={idx} 
                          textAlign={img.position === 'center' ? 'center' : img.position === 'right' ? 'right' : 'left'}
                        >
                          <img
                            src={img.url}
                            alt={img.alt || 'Obrázek'}
                            style={{
                              width: img.width ? `${img.width}%` : '100%',
                              maxWidth: '100%',
                              height: 'auto',
                              margin: `${img.margin || 10}px 0`,
                              borderRadius: '8px'
                            }}
                          />
                        </Box>
                      ))}
                    </VStack>
                  )}
                  {/* Obrázky z blocks */}
                  {Array.isArray(menu[previewIdx].blocks) && menu[previewIdx].blocks.filter(b => b.type === 'image').length > 0 && (
                    <VStack spacing={2} mb={3} align="stretch">
                      {menu[previewIdx].blocks.filter(b => b.type === 'image').map((block, idx) => (
                        <Box key={100+idx} my={2} textAlign={block.align === 'left' || block.align === 'right' || block.align === 'center' ? block.align : 'center'}>
                          <img src={block.url} alt={block.alt || ''} style={{ width: block.width ? block.width + 'px' : '300px', maxWidth: '100%', borderRadius: 8, display: 'block', margin: block.align === 'center' ? '0 auto' : undefined, float: block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : undefined }} />
                        </Box>
                      ))}
                    </VStack>
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