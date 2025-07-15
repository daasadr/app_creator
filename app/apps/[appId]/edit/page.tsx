'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { Box, Heading, Spinner, useToast, Tabs, TabList, TabPanels, Tab, TabPanel, Select } from '@chakra-ui/react'
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

  useEffect(() => {
    if (!appId) return
    const fetchApp = async () => {
      setLoading(true)
      try {
        const docRef = doc(db, 'apps', appId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setAppData(docSnap.data())
          setMenu(docSnap.data().menu || [])
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

  const handleEditPage = (idx: number) => {
    setPageEdit(menu[idx])
    setModalOpen(true)
  }

  // Funkce pro generování unikátního id
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  const handleSavePage = () => {
    if (pageEdit) {
      // Najdi stránku podle id (nebo title, pokud není id)
      const idx = menu.findIndex(p => (p.id && pageEdit.id && p.id === pageEdit.id) || (!p.id && !pageEdit.id && p.title === pageEdit.title))
      if (idx !== -1) {
        const newMenu = [...menu]
        newMenu[idx] = pageEdit
        setMenu(newMenu)
        setModalOpen(false)
      }
    }
  }

  const handleSaveApp = async () => {
    try {
      await updateDoc(doc(db, 'apps', appId), { menu })
      toast({ title: 'Aplikace uložena', status: 'success' })
    } catch (e) {
      toast({ title: 'Chyba při ukládání', status: 'error' })
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setDownloadUrl(null)
    setGenerateError(null)
    try {
      const config = {
        appName: appData.name,
        appDescription: appData.description,
        pages: menu,
        settings: appData.settings || {},
        // případně další pole dle potřeby
      }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success && data.downloadUrl) {
        setDownloadUrl(data.downloadUrl)
        toast({ title: 'APK vygenerováno', status: 'success' })
      } else {
        setGenerateError(data.error || 'Chyba při generování')
        toast({ title: 'Chyba při generování', description: data.error, status: 'error' })
      }
    } catch (e: any) {
      setGenerateError(e.message)
      toast({ title: 'Chyba při generování', description: e.message, status: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <Spinner size="xl" />
  if (!appData) return <Box>Aplikace nenalezena</Box>

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>Editor aplikace: {appData.name}</Heading>
      <Box display={{ base: 'block', lg: 'flex' }} alignItems="flex-start" gap={8}>
        {/* Levý sloupec: editor menu */}
        <Box flex="2" minW={0}>
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
            <button onClick={handleSaveApp}>Uložit změny</button>
            <button onClick={handleGenerate} disabled={generating} style={{ minWidth: 120 }}>
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
                  {/* Bloky obsahu nebo fallback na content */}
                  {Array.isArray((menu[previewIdx] as any)?.blocks) && (menu[previewIdx] as any).blocks.length > 0 ? (
                    (menu[previewIdx] as any).blocks.map((block: any, bidx: number) => {
                      if (block.type === 'text') return <Box key={bidx} mb={2}>{block.content}</Box>
                      if (block.type === 'table') return (
                        <Box key={bidx} as="table" border="1px solid #ccc" borderRadius="md" my={2} w="100%" style={{ borderCollapse: 'collapse' }}>
                          <tbody>{block.data.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>)}</tr>)}</tbody>
                        </Box>
                      )
                      if (block.type === 'image') return (
                        <Box key={bidx} my={2} textAlign={block.align === 'left' || block.align === 'right' || block.align === 'center' ? block.align : 'center'}>
                          <img src={block.url} alt={block.alt || ''} style={{ width: block.width ? block.width + 'px' : '300px', maxWidth: '100%', borderRadius: 8, display: 'block', margin: block.align === 'center' ? '0 auto' : undefined, float: block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : undefined }} />
                        </Box>
                      )
                      return null
                    })
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
            {/* Spodní lišta pro přepínání stránek */}
            <Box display="flex" justifyContent="space-around" alignItems="center" h="56px" bg="gray.100" borderTop="1px solid #ccc" borderBottomRadius="32px">
              {menu.map((page, idx) => (
                <Box
                  key={idx}
                  as="button"
                  onClick={() => setPreviewIdx(idx)}
                  px={3}
                  py={2}
                  fontWeight={previewIdx === idx ? 'bold' : 'normal'}
                  color={previewIdx === idx ? 'blue.600' : 'gray.700'}
                  bg={previewIdx === idx ? 'gray.200' : 'transparent'}
                  borderRadius="md"
                  border={previewIdx === idx ? '2px solid #3182ce' : 'none'}
                  transition="all 0.2s"
                  cursor="pointer"
                  fontSize="sm"
                >
                  {page.title || `Stránka ${idx+1}`}
                </Box>
              ))}
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