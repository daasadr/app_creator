'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Switch,
  SimpleGrid,
  ModalFooter,
  HStack,
  IconButton,
  Select,
} from '@chakra-ui/react'
import { collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, getFirestore, onSnapshot } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

// Firebase config (TODO: použijte skutečné hodnoty)
const firebaseConfig = {
  apiKey: 'YOUR-API-KEY',
  authDomain: 'YOUR-AUTH-DOMAIN',
  projectId: 'YOUR-PROJECT-ID',
  storageBucket: 'YOUR-STORAGE-BUCKET',
  messagingSenderId: 'YOUR-SENDER-ID',
  appId: 'YOUR-APP-ID',
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [appName, setAppName] = useState('')
  const [appDescription, setAppDescription] = useState('')
  const [pages, setPages] = useState<Array<{ title: string; type: 'content' | 'webview'; url?: string }>>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [buildApk, setBuildApk] = useState(true)
  const [buildAab, setBuildAab] = useState(true)
  const [role, setRole] = useState<'superadmin' | 'admin'>('admin')
  const [instances, setInstances] = useState<any[]>([])
  const [editingInstance, setEditingInstance] = useState<any | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingPageIdx, setEditingPageIdx] = useState<number | null>(null)
  const [pageEdit, setPageEdit] = useState<any | null>(null)
  const [isPageEditorOpen, setIsPageEditorOpen] = useState(false)
  const [simPageIdx, setSimPageIdx] = useState(0)
  const [pickerActive, setPickerActive] = useState(false)

  // Načti seznam aplikací (instancí)
  useEffect(() => {
    if (role === 'superadmin') {
      const unsub = onSnapshot(collection(db, 'apps'), (snapshot) => {
        setInstances(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      })
      return () => unsub()
    }
  }, [role])

  // Otevři editor pro novou nebo existující aplikaci
  const openEditor = (instance?: any) => {
    if (instance) {
      setAppName(instance.name || '')
      setAppDescription(instance.description || '')
      setPages(instance.menu || [])
      setEditingInstance(instance)
    } else {
      setAppName('')
      setAppDescription('')
      setPages([])
      setEditingInstance(null)
    }
    setIsEditorOpen(true)
  }

  // Ulož novou nebo upravenou aplikaci
  const handleSaveInstance = async () => {
    if (!appName) return
    if (editingInstance) {
      // update
      await updateDoc(doc(db, 'apps', editingInstance.id), {
        name: appName,
        description: appDescription,
        menu: pages,
      })
    } else {
      // create
      await addDoc(collection(db, 'apps'), {
        name: appName,
        description: appDescription,
        menu: pages,
      })
    }
    setIsEditorOpen(false)
  }

  const handleAddPage = () => {
    setPages([...pages, { title: '', type: 'content' }])
  }

  const handlePageChange = (index: number, field: string, value: string) => {
    const newPages = [...pages]
    newPages[index] = { ...newPages[index], [field]: value }
    setPages(newPages)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName,
          appDescription,
          pages,
          buildApk,
          buildAab,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Automatically trigger download
        const downloadResponse = await fetch(`http://localhost:3001${data.downloadUrl}`)
        const blob = await downloadResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'app.zip'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Generation failed:', data)
      }
    } catch (error) {
      console.error('Error generating app:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Otevři editor stránky
  const openPageEditor = (idx: number) => {
    setEditingPageIdx(idx)
    setPageEdit({ ...pages[idx] })
    setIsPageEditorOpen(true)
  }

  // Ulož změny stránky
  const handleSavePageEdit = () => {
    if (editingPageIdx !== null && pageEdit) {
      const newPages = [...pages]
      newPages[editingPageIdx] = { ...pageEdit }
      setPages(newPages)
    }
    setIsPageEditorOpen(false)
  }

  // Funkce pro injektování JS do iframe
  const getPickerScript = () => `
  (function() {
    let last;
    function getSelector(el) {
      if (!el) return '';
      if (el.id) return '#' + el.id;
      if (el.className && typeof el.className === 'string') return el.tagName.toLowerCase() + '.' + el.className.trim().replace(/\s+/g, '.');
      return el.tagName.toLowerCase();
    }
    function mouseOver(e) {
      if (last) last.style.outline = '';
      last = e.target;
      last.style.outline = '2px solid red';
    }
    function mouseOut(e) {
      if (last) last.style.outline = '';
      last = null;
    }
    function click(e) {
      e.preventDefault();
      e.stopPropagation();
      const sel = getSelector(e.target);
      window.parent.postMessage({ type: 'PICK_SELECTOR', selector: sel }, '*');
      last.style.outline = '';
    }
    document.body.addEventListener('mouseover', mouseOver, true);
    document.body.addEventListener('mouseout', mouseOut, true);
    document.body.addEventListener('click', click, true);
    window.__PICKER_ACTIVE = true;
  })();
  `;

  // Handler pro zprávy z iframe
  useEffect(() => {
    function handleMsg(e: any) {
      if (e.data && e.data.type === 'PICK_SELECTOR' && pageEdit?.type === 'webview') {
        const sel = e.data.selector;
        if (sel && !pageEdit.hiddenSelectors?.includes(sel)) {
          setPageEdit((prev: any) => ({ ...prev, hiddenSelectors: [...(prev.hiddenSelectors || []), sel] }));
        }
      }
    }
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [pageEdit]);

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center" py={10}>
          <Heading as="h1" size="2xl" mb={4}>
            App Generator
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Create your mobile application in minutes
          </Text>
        </Box>

        <Box>
          <Button colorScheme={role === 'superadmin' ? 'purple' : 'blue'} onClick={() => setRole(role === 'admin' ? 'superadmin' : 'admin')} size="lg">
            Přepnout na {role === 'admin' ? 'Superadmin' : 'Admin'} rozhraní
          </Button>
        </Box>

        {role === 'superadmin' ? (
          <Box p={8} borderWidth={1} borderRadius="md" bg="purple.50">
            <Heading size="lg" mb={4}>Superadmin rozhraní</Heading>
            <Button colorScheme="blue" onClick={() => openEditor()} size="lg" mb={4}>
              Vytvořit novou aplikaci
            </Button>
            <Heading size="md" mb={2}>Seznam aplikací</Heading>
            <VStack align="stretch" spacing={2} mb={6}>
              {instances.map((inst) => (
                <Box key={inst.id} p={4} borderWidth={1} borderRadius="md" bg="white">
                  <Text fontWeight="bold">{inst.name}</Text>
                  <Text color="gray.600">{inst.description}</Text>
                  <Button size="sm" colorScheme="blue" mt={2} onClick={() => openEditor(inst)}>
                    Upravit
                  </Button>
                </Box>
              ))}
            </VStack>
            {/* Editor nové/existující aplikace */}
            <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} size="xl">
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>{editingInstance ? 'Upravit aplikaci' : 'Vytvořit novou aplikaci'}</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Název aplikace</FormLabel>
                      <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Zadejte název aplikace" />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Popis</FormLabel>
                      <Textarea value={appDescription} onChange={(e) => setAppDescription(e.target.value)} placeholder="Popis aplikace" />
                    </FormControl>
                    <Box>
                      <Heading size="sm" mb={2}>Menu / Stránky</Heading>
                      <VStack align="stretch" spacing={2}>
                        {pages.map((page, idx) => (
                          <Box key={idx} p={2} borderWidth={1} borderRadius="md" bg="gray.50">
                            <HStack>
                              <Input value={page.title} onChange={e => handlePageChange(idx, 'title', e.target.value)} placeholder="Název stránky" />
                              <Select value={page.type} onChange={e => handlePageChange(idx, 'type', e.target.value as any)} w="120px">
                                <option value="content">Content</option>
                                <option value="webview">WebView</option>
                              </Select>
                              <IconButton aria-label="Upravit" icon={<span>✏️</span>} onClick={() => openPageEditor(idx)} />
                              <IconButton aria-label="Nahoru" icon={<span>↑</span>} isDisabled={idx === 0} onClick={() => {
                                const newPages = [...pages];
                                const [item] = newPages.splice(idx, 1);
                                newPages.splice(idx - 1, 0, item);
                                setPages(newPages);
                              }} />
                              <IconButton aria-label="Dolů" icon={<span>↓</span>} isDisabled={idx === pages.length - 1} onClick={() => {
                                const newPages = [...pages];
                                const [item] = newPages.splice(idx, 1);
                                newPages.splice(idx + 1, 0, item);
                                setPages(newPages);
                              }} />
                              <IconButton aria-label="Smazat" icon={<span>🗑️</span>} onClick={() => {
                                setPages(pages.filter((_, i) => i !== idx));
                              }} />
                            </HStack>
                            {/* Inline náhled stránky */}
                            {page.type === 'content' && (
                              <Box mt={2} p={2} bg="white" borderRadius="md">
                                <Text color="gray.600">{page.content || <i>Žádný obsah</i>}</Text>
                              </Box>
                            )}
                            {page.type === 'webview' && (
                              <Box mt={2} p={2} bg="white" borderRadius="md">
                                <Text color="gray.600">URL: {page.url || <i>Žádná URL</i>}</Text>
                                <Text color="gray.600">Skryté elementy: {page.hiddenSelectors?.join(', ') || <i>Žádné</i>}</Text>
                              </Box>
                            )}
                          </Box>
                        ))}
                        <Button onClick={handleAddPage} colorScheme="blue" variant="outline">
                          Přidat stránku
                        </Button>
                      </VStack>
                    </Box>
                    {/* Náhled aplikace */}
                    <Box mt={4} p={2} borderWidth={1} borderRadius="md" bg="gray.100">
                      <Heading size="sm" mb={2}>Náhled aplikace (menu)</Heading>
                      <HStack spacing={2}>
                        {pages.map((page, idx) => (
                          <Button key={idx} size="sm">{page.title}</Button>
                        ))}
                      </HStack>
                    </Box>
                    <Box mt={8}>
                      <Heading size="sm" mb={2}>Náhled aplikace (mobilní simulátor)</Heading>
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
                      >
                        {/* Menu (dole) */}
                        <Box position="absolute" bottom={0} left={0} w="100%" bg="gray.100" borderTop="1px solid #ccc" display="flex" justifyContent="space-around" p={2}>
                          {pages.map((page, idx) => (
                            <Button
                              key={idx}
                              size="sm"
                              variant={simPageIdx === idx ? 'solid' : 'ghost'}
                              colorScheme="blue"
                              onClick={() => setSimPageIdx(idx)}
                            >
                              {page.title}
                            </Button>
                          ))}
                        </Box>
                        {/* Obsah stránky */}
                        <Box p={4} pt={6} pb={16} h="100%" overflowY="auto">
                          {pages[simPageIdx]?.type === 'content' && (
                            <Box>
                              <Heading size="md" mb={2}>{pages[simPageIdx]?.title}</Heading>
                              <Text>{pages[simPageIdx]?.content || <i>Žádný obsah</i>}</Text>
                            </Box>
                          )}
                          {pages[simPageIdx]?.type === 'webview' && pages[simPageIdx]?.url && (
                            <Box h="600px" borderWidth={1} borderRadius="md" overflow="hidden">
                              <iframe
                                src={pages[simPageIdx]?.url}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="WebView náhled"
                              />
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                Skryté elementy budou aplikovány v mobilní aplikaci.
                              </Text>
                            </Box>
                          )}
                        </Box>
                        {/* Horní lišta (imitace) */}
                        <Box position="absolute" top={0} left={0} w="100%" h="32px" bg="gray.200" borderBottom="1px solid #ccc" borderTopRadius="32px" />
                      </Box>
                    </Box>
                  </VStack>
                </ModalBody>
                <ModalFooter>
                  <Button colorScheme="blue" mr={3} onClick={handleSaveInstance}>
                    Uložit
                  </Button>
                  <Button onClick={() => setIsEditorOpen(false)}>Zrušit</Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </Box>
        ) : (
          <Box p={8} borderWidth={1} borderRadius="md" bg="blue.50">
            <Heading size="lg" mb={4}>Admin rozhraní</Heading>
            <Text mb={4}>Zde bude správa obsahu a stránek pro jednu konkrétní aplikaci.</Text>
            {/* TODO: Implementace načtení a správy konkrétní aplikace pro admina */}
          </Box>
        )}

        {/* Modální editor stránky */}
        <Modal isOpen={isPageEditorOpen} onClose={() => setIsPageEditorOpen(false)} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Upravit stránku</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Název stránky</FormLabel>
                  <Input value={pageEdit?.title || ''} onChange={e => setPageEdit({ ...pageEdit, title: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Typ stránky</FormLabel>
                  <Select value={pageEdit?.type || 'content'} onChange={e => setPageEdit({ ...pageEdit, type: e.target.value })}>
                    <option value="content">Content</option>
                    <option value="webview">WebView</option>
                  </Select>
                </FormControl>
                {pageEdit?.type === 'content' && (
                  <FormControl>
                    <FormLabel>Obsah stránky</FormLabel>
                    <Textarea value={pageEdit?.content || ''} onChange={e => setPageEdit({ ...pageEdit, content: e.target.value })} />
                  </FormControl>
                )}
                {pageEdit?.type === 'webview' && (
                  <>
                    <FormControl>
                      <FormLabel>URL</FormLabel>
                      <Input value={pageEdit?.url || ''} onChange={e => setPageEdit({ ...pageEdit, url: e.target.value })} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Skryté elementy (CSS selektory, oddělené čárkou)</FormLabel>
                      <Input value={pageEdit?.hiddenSelectors?.join(', ') || ''} onChange={e => setPageEdit({ ...pageEdit, hiddenSelectors: e.target.value.split(',').map((s: string) => s.trim()) })} />
                    </FormControl>
                    <Button size="sm" colorScheme={pickerActive ? 'red' : 'blue'} mb={2} onClick={() => setPickerActive(!pickerActive)}>
                      {pickerActive ? 'Ukončit výběr (kapátko)' : 'Vybrat elementy ke skrytí (kapátko)'}
                    </Button>
                    <Box>
                      {pageEdit?.hiddenSelectors?.map((sel: string, i: number) => (
                        <Box key={i} display="inline-block" bg="gray.200" px={2} py={1} borderRadius="md" m={1}>
                          <Text as="span" fontSize="sm">{sel}</Text>
                          <Button size="xs" ml={2} onClick={() => setPageEdit({ ...pageEdit, hiddenSelectors: pageEdit.hiddenSelectors.filter((s: string) => s !== sel) })}>x</Button>
                        </Box>
                      ))}
                    </Box>
                    {/* Náhled WebView (iframe) s kapátkem */}
                    {pageEdit?.url && (
                      <Box mt={2} borderWidth={1} borderRadius="md" overflow="hidden" h="300px">
                        <iframe
                          src={pageEdit.url}
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          title="WebView náhled"
                          ref={el => {
                            if (el && pickerActive) {
                              el.contentWindow?.postMessage({ type: 'INJECT_PICKER' }, '*');
                              el.onload = () => {
                                el.contentWindow?.eval(getPickerScript());
                              };
                              setTimeout(() => {
                                try { el.contentWindow?.eval(getPickerScript()); } catch {};
                              }, 1000);
                            }
                          }}
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Skryté elementy budou aplikovány v mobilní aplikaci.
                        </Text>
                      </Box>
                    )}
                  </>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={handleSavePageEdit}>
                Uložit
              </Button>
              <Button onClick={() => setIsPageEditorOpen(false)}>Zrušit</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  )
} 