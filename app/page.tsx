<<<<<<< HEAD
import Layout from './components/Layout'

export default function Home() {
  return <Layout />
=======
'use client'

import { useState, useEffect, useRef } from 'react'
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
  Flex,
  Grid,
  GridItem,
  Badge,
  Divider,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, getFirestore, onSnapshot } from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

let firebaseApp: any = null
let db: any = null
let storage: any = null

// Rozšířený interface pro obrázek s pozicí
interface PageImage {
  url: string;
  alt?: string;
  position: 'left' | 'right' | 'center' | 'full';
  width?: number; // v procentech
  margin?: number; // v px
}

// Rozšířený interface pro stránku s rich contentem
interface AppPage {
  title: string;
  type: 'content' | 'webview';
  url?: string;
  content?: string;
  richContent?: string; // HTML content z rich editoru
  hiddenSelectors?: string[];
  imageUrl?: string; // pro kompatibilitu
  images?: PageImage[]; // nové pole pro více obrázků
}

// Komponenta pro rich text editor
function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [fontSize, setFontSize] = useState(16)
  const [fontColor, setFontColor] = useState('#000000')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [showTableOptions, setShowTableOptions] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBgColorPicker, setShowBgColorPicker] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const insertTable = () => {
    const table = document.createElement('table')
    table.style.cssText = 'border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #ccc;'
    
    for (let i = 0; i < tableRows; i++) {
      const row = document.createElement('tr')
      for (let j = 0; j < tableCols; j++) {
        const cell = document.createElement('td')
        cell.style.cssText = 'border: 1px solid #ccc; padding: 8px; text-align: left; min-height: 30px; vertical-align: top;'
        cell.contentEditable = 'true'
        cell.innerHTML = '&nbsp;'
        row.appendChild(cell)
      }
      table.appendChild(row)
    }
    
    // Vlož tabulku na konec editoru
    if (editorRef.current) {
      editorRef.current.appendChild(table)
      // Přesuň caret do první buňky
      const firstCell = table.querySelector('td') as HTMLElement
      if (firstCell) {
        firstCell.focus()
        const range = document.createRange()
        const sel = window.getSelection()
        if (sel) {
          range.selectNodeContents(firstCell)
          range.collapse(false)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }
    setShowTableOptions(false)
  }

  const insertTableNoBorder = () => {
    const table = document.createElement('table')
    table.style.cssText = 'border-collapse: collapse; width: 100%; margin: 10px 0;'
    
    for (let i = 0; i < tableRows; i++) {
      const row = document.createElement('tr')
      for (let j = 0; j < tableCols; j++) {
        const cell = document.createElement('td')
        cell.style.cssText = 'border: none; padding: 8px; text-align: left; min-height: 30px; vertical-align: top;'
        cell.contentEditable = 'true'
        cell.innerHTML = '&nbsp;'
        row.appendChild(cell)
      }
      table.appendChild(row)
    }
    
    // Vlož tabulku na konec editoru
    if (editorRef.current) {
      editorRef.current.appendChild(table)
      // Přesuň caret do první buňky
      const firstCell = table.querySelector('td') as HTMLElement
      if (firstCell) {
        firstCell.focus()
        const range = document.createRange()
        const sel = window.getSelection()
        if (sel) {
          range.selectNodeContents(firstCell)
          range.collapse(false)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }
    setShowTableOptions(false)
  }

  const handleEditorChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertLink = () => {
    const url = prompt('Zadejte URL:')
    if (url) {
      document.execCommand('createLink', false, url)
      editorRef.current?.focus()
    }
  }

  const insertImage = () => {
    // Vytvoř skrytý input pro nahrávání souborů
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          // Nahraj obrázek do Firebase Storage
          if (!storage) {
            alert('Firebase ještě není inicializováno. Zkuste to za chvíli.')
            return
          }
          
          const fileRef = storageRef(storage, 'editor-images/' + file.name + '-' + Date.now())
          await uploadBytes(fileRef, file)
          const url = await getDownloadURL(fileRef)
          
          // Vlož obrázek do editoru
          const alt = prompt('Zadejte alt text (volitelně):')
          const imgHTML = `<img src="${url}" alt="${alt || ''}" style="max-width: 100%; height: auto; margin: 10px 0; cursor: pointer;" class="resizable-image">`
          
          if (editorRef.current) {
            editorRef.current.focus()
            document.execCommand('insertHTML', false, imgHTML)
          }
        } catch (error) {
          console.error('Chyba při nahrávání obrázku:', error)
          alert('Chyba při nahrávání obrázku')
        }
      }
    }
    
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  const insertHorizontalRule = () => {
    document.execCommand('insertHTML', false, '<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">')
    editorRef.current?.focus()
  }

  const insertList = (ordered: boolean) => {
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false)
    editorRef.current?.focus()
  }

  const clearFormatting = () => {
    document.execCommand('removeFormat', false)
    editorRef.current?.focus()
  }

  // Funkce pro přidání řádku do tabulky
  const addTableRow = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      let cell = range.startContainer
      
      // Najdi buňku tabulky
      while (cell && cell.nodeName !== 'TD' && cell.nodeName !== 'TH') {
        cell = (cell.parentNode as Element)
      }
      
      if (cell && (cell.nodeName === 'TD' || cell.nodeName === 'TH')) {
        const table = (cell as Element).closest('table')
        if (table) {
          const row = cell.parentNode as HTMLTableRowElement
          const newRow = document.createElement('tr')
          const colCount = row.cells.length
          
          for (let i = 0; i < colCount; i++) {
            const newCell = document.createElement(cell.nodeName === 'TH' ? 'th' : 'td')
            (newCell as HTMLElement).style.cssText = (cell as HTMLElement).style.cssText
            newCell.contentEditable = 'true'
            newCell.innerHTML = '&nbsp;'
            newRow.appendChild(newCell)
          }
          
          row.parentNode?.insertBefore(newRow, row.nextSibling)
          editorRef.current?.focus()
        }
      }
    }
  }

  // Funkce pro přidání sloupce do tabulky
  const addTableColumn = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      let cell = range.startContainer
      
      // Najdi buňku tabulky
      while (cell && cell.nodeName !== 'TD' && cell.nodeName !== 'TH') {
        cell = (cell.parentNode as Element)
      }
      
      if (cell && (cell.nodeName === 'TD' || cell.nodeName === 'TH')) {
        const table = (cell as Element).closest('table')
        if (table) {
          const rows = table.rows
          const cellIndex = (cell as HTMLTableCellElement).cellIndex
          
          for (let i = 0; i < rows.length; i++) {
            const newCell = document.createElement(cell.nodeName === 'TH' ? 'th' : 'td')
            (newCell as HTMLElement).style.cssText = (cell as HTMLElement).style.cssText
            newCell.contentEditable = 'true'
            newCell.innerHTML = '&nbsp;'
            rows[i].insertBefore(newCell, rows[i].cells[cellIndex + 1] || null)
          }
          
          editorRef.current?.focus()
        }
      }
    }
  }

  // --- SIMPLE IMAGE RESIZING ---
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    let currentImg: HTMLImageElement | null = null
    let isResizing = false
    let startX = 0, startY = 0, startWidth = 0, startHeight = 0
    let resizeHandle: HTMLDivElement | null = null
    let wrapper: HTMLDivElement | null = null

    // Funkce pro vytvoření wrapperu kolem obrázku
    function wrapImage(img: HTMLImageElement) {
      if (img.parentElement && img.parentElement.classList.contains('img-resize-wrapper')) {
        return img.parentElement as HTMLDivElement
      }
      const w = document.createElement('div')
      w.className = 'img-resize-wrapper'
      w.style.position = 'relative'
      w.style.display = 'inline-block'
      w.style.maxWidth = '100%'
      w.style.verticalAlign = 'top'
      img.parentNode?.insertBefore(w, img)
      w.appendChild(img)
      return w
    }

    // Funkce pro odstranění wrapperu a handle
    function unwrapImage(img: HTMLImageElement) {
      if (img.parentElement && img.parentElement.classList.contains('img-resize-wrapper')) {
        const w = img.parentElement
        w.parentNode?.insertBefore(img, w)
        w.remove()
      }
    }

    // Funkce pro vytvoření resize handle
    function createResizeHandle(img: HTMLImageElement) {
      const w = wrapImage(img)
      // Odstraň starý handle
      const old = w.querySelector('.resize-handle')
      if (old) old.remove()
      const handle = document.createElement('div')
      handle.className = 'resize-handle'
      handle.style.cssText = `
        position: absolute;
        right: 0;
        bottom: 0;
        width: 16px;
        height: 16px;
        background: #007AFF;
        border: 2px solid white;
        border-radius: 50%;
        cursor: nwse-resize;
        z-index: 10000;
        pointer-events: all;
      `
      w.appendChild(handle)
      return { handle, wrapper: w }
    }

    function removeResizeHandle() {
      document.querySelectorAll('.resize-handle').forEach(h => h.remove())
      document.querySelectorAll('.img-resize-wrapper').forEach(w => {
        if (w.firstChild && w.firstChild.nodeName === 'IMG') {
          const img = w.firstChild as HTMLImageElement
          unwrapImage(img)
        }
      })
    }

    function handleImageClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.classList.contains('resize-handle')) return
      removeResizeHandle()
      if (target.tagName === 'IMG') {
        currentImg = target as HTMLImageElement
        currentImg.setAttribute('contentEditable', 'false')
        const { handle, wrapper: w } = createResizeHandle(currentImg)
        resizeHandle = handle
        wrapper = w
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          isResizing = true
          startX = e.clientX
          startY = e.clientY
          startWidth = currentImg!.offsetWidth
          startHeight = currentImg!.offsetHeight
          document.body.style.userSelect = 'none'
          const onMouseMove = (ev: MouseEvent) => {
            if (!isResizing || !currentImg) return
            const dx = ev.clientX - startX
            const dy = ev.clientY - startY
            const newWidth = Math.max(50, startWidth + dx)
            const newHeight = Math.max(50, startHeight + dy)
            currentImg.style.width = newWidth + 'px'
            currentImg.style.height = newHeight + 'px'
          }
          const onMouseUp = () => {
            isResizing = false
            document.body.style.userSelect = ''
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
          }
          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        })
      } else {
        currentImg = null
      }
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.classList.contains('resize-handle') && target.tagName !== 'IMG') {
        removeResizeHandle()
        currentImg = null
      }
    }

    editor.addEventListener('click', handleImageClick)
    document.addEventListener('click', handleClickOutside)
    return () => {
      editor.removeEventListener('click', handleImageClick)
      document.removeEventListener('click', handleClickOutside)
      removeResizeHandle()
    }
  }, [])

  // --- TABLE FOCUS FIX ---
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const handleTableClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'TD' || target.tagName === 'TH') {
        if (!target.hasAttribute('contentEditable')) {
          target.setAttribute('contentEditable', 'true')
        }
        // Pokud je buňka prázdná, vlož <br> a nastav caret
        if (
          target.innerHTML.trim() === '' ||
          target.innerHTML.trim() === '&nbsp;' ||
          target.innerHTML.trim() === '<br>'
        ) {
          target.innerHTML = '<br>'
          setTimeout(() => {
            const range = document.createRange()
            const sel = window.getSelection()
            range.selectNodeContents(target)
            range.collapse(false)
            sel?.removeAllRanges()
            sel?.addRange(range)
          }, 0)
        }
      }
    }
    editor.addEventListener('click', handleTableClick, true)
    return () => {
      editor.removeEventListener('click', handleTableClick, true)
    }
  }, [])

  return (
    <Box border="1px solid" borderColor="gray.300" borderRadius="md">
      {/* Toolbar */}
      <Flex wrap="wrap" p={2} bg="gray.50" borderBottom="1px solid" borderColor="gray.300" gap={1}>
        {/* Text formatting */}
        <HStack spacing={1}>
          <Tooltip label="Tučné">
            <IconButton
              aria-label="Tučné"
              size="sm"
              icon={<span style={{ fontWeight: 'bold' }}>B</span>}
              onClick={() => execCommand('bold')}
              colorScheme={isBold ? 'blue' : 'gray'}
            />
          </Tooltip>
          <Tooltip label="Kurzíva">
            <IconButton
              aria-label="Kurzíva"
              size="sm"
              icon={<span style={{ fontStyle: 'italic' }}>I</span>}
              onClick={() => execCommand('italic')}
              colorScheme={isItalic ? 'blue' : 'gray'}
            />
          </Tooltip>
          <Tooltip label="Podtržené">
            <IconButton
              aria-label="Podtržené"
              size="sm"
              icon={<span style={{ textDecoration: 'underline' }}>U</span>}
              onClick={() => execCommand('underline')}
              colorScheme={isUnderline ? 'blue' : 'gray'}
            />
          </Tooltip>
        </HStack>

        <Divider orientation="vertical" />

        {/* Alignment */}
        <HStack spacing={1}>
          <Tooltip label="Vlevo">
            <IconButton
              aria-label="Vlevo"
              size="sm"
              icon={<span>⫷</span>}
              onClick={() => execCommand('justifyLeft')}
              colorScheme={alignment === 'left' ? 'blue' : 'gray'}
            />
          </Tooltip>
          <Tooltip label="Na střed">
            <IconButton
              aria-label="Na střed"
              size="sm"
              icon={<span>⫸⫷</span>}
              onClick={() => execCommand('justifyCenter')}
              colorScheme={alignment === 'center' ? 'blue' : 'gray'}
            />
          </Tooltip>
          <Tooltip label="Vpravo">
            <IconButton
              aria-label="Vpravo"
              size="sm"
              icon={<span>⫸</span>}
              onClick={() => execCommand('justifyRight')}
              colorScheme={alignment === 'right' ? 'blue' : 'gray'}
            />
          </Tooltip>
          <Tooltip label="Do bloku">
            <IconButton
              aria-label="Do bloku"
              size="sm"
              icon={<span>⫸⫷⫸</span>}
              onClick={() => execCommand('justifyFull')}
              colorScheme={alignment === 'justify' ? 'blue' : 'gray'}
            />
          </Tooltip>
        </HStack>

        <Divider orientation="vertical" />

        {/* Lists */}
        <HStack spacing={1}>
          <Tooltip label="Odrážkový seznam">
            <IconButton
              aria-label="Odrážkový seznam"
              size="sm"
              icon={<span>•</span>}
              onClick={() => insertList(false)}
            />
          </Tooltip>
          <Tooltip label="Číslovaný seznam">
            <IconButton
              aria-label="Číslovaný seznam"
              size="sm"
              icon={<span>1.</span>}
              onClick={() => insertList(true)}
            />
          </Tooltip>
        </HStack>

        <Divider orientation="vertical" />

        {/* Links and images */}
        <HStack spacing={1}>
          <Tooltip label="Vložit odkaz">
            <IconButton
              aria-label="Vložit odkaz"
              size="sm"
              icon={<span>🔗</span>}
              onClick={insertLink}
            />
          </Tooltip>
          <Tooltip label="Vložit obrázek">
            <IconButton
              aria-label="Vložit obrázek"
              size="sm"
              icon={<span>🖼️</span>}
              onClick={insertImage}
            />
          </Tooltip>
        </HStack>

        <Divider orientation="vertical" />

        {/* Tables */}
        <Popover isOpen={showTableOptions} onClose={() => setShowTableOptions(false)}>
          <PopoverTrigger>
            <Button size="sm" onClick={() => setShowTableOptions(!showTableOptions)}>
              📊 Tabulka
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverBody p={4}>
              <VStack spacing={3}>
                <HStack>
                  <Text>Řádky:</Text>
                  <NumberInput size="sm" min={1} max={10} value={tableRows} onChange={(_, val) => setTableRows(val)}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>
                <HStack>
                  <Text>Sloupce:</Text>
                  <NumberInput size="sm" min={1} max={10} value={tableCols} onChange={(_, val) => setTableCols(val)}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>
                <HStack spacing={2}>
                  <Button size="sm" onClick={insertTable}>S ohraničením</Button>
                  <Button size="sm" onClick={insertTableNoBorder}>Bez ohraničení</Button>
                </HStack>
                <Divider />
                <Text fontSize="sm" fontWeight="bold">Správa existující tabulky:</Text>
                <HStack spacing={2}>
                  <Button size="sm" onClick={addTableRow}>+ Řádek</Button>
                  <Button size="sm" onClick={addTableColumn}>+ Sloupec</Button>
                </HStack>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        <Divider orientation="vertical" />

        {/* Other formatting */}
        <HStack spacing={1}>
          <Tooltip label="Vodorovná čára">
            <IconButton
              aria-label="Vodorovná čára"
              size="sm"
              icon={<span>─</span>}
              onClick={insertHorizontalRule}
            />
          </Tooltip>
          <Tooltip label="Vymazat formátování">
            <IconButton
              aria-label="Vymazat formátování"
              size="sm"
              icon={<span>🧹</span>}
              onClick={clearFormatting}
            />
          </Tooltip>
        </HStack>
      </Flex>

      {/* Editor area */}
      <Box
        ref={editorRef}
        contentEditable
        p={4}
        minH="300px"
        maxH="500px"
        overflowY="auto"
        onInput={handleEditorChange}
        onBlur={handleEditorChange}
        style={{
          outline: 'none',
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5'
        }}
        _focus={{
          border: '2px solid',
          borderColor: 'blue.300'
        }}
        sx={{
          'table': {
            borderCollapse: 'collapse',
            width: '100%',
            margin: '10px 0',
            border: '1px solid #ccc'
          },
          'td, th': {
            border: '1px solid #ccc',
            padding: '8px',
            textAlign: 'left',
            minHeight: '30px',
            verticalAlign: 'top',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          },
          'td:focus, th:focus': {
            outline: '2px solid #007AFF',
            outlineOffset: '-2px',
            backgroundColor: '#f8f9fa'
          },
          'th': {
            fontWeight: 'bold',
            backgroundColor: '#f5f5f5'
          },
          // Styly pro obrázky
          'img': {
            maxWidth: '100%',
            height: 'auto',
            margin: '4px 0',
            display: 'block',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          },
          'img:hover': {
            opacity: 0.8
          },
          // Zajisti, že tabulky mají správné ohraničení
          'table[style*="border: none"] td, table[style*="border: none"] th': {
            border: 'none !important'
          }
        }}
      />
    </Box>
  )
}

// Komponenta pro správu více obrázků
function ImageManager({ images = [], onChange }: { images: PageImage[]; onChange: (images: PageImage[]) => void }) {
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const handleImageUpload = async () => {
    if (imageFiles.length === 0) return
    
    setUploadingImages(true)
    const newImages: PageImage[] = []
    
    for (const file of imageFiles) {
      try {
        if (!storage) {
          alert('Firebase ještě není inicializováno. Zkuste to za chvíli.')
          return
        }
        const fileRef = storageRef(storage, 'images/' + file.name + '-' + Date.now())
        await uploadBytes(fileRef, file)
        const url = await getDownloadURL(fileRef)
        newImages.push({
          url,
          alt: file.name,
          position: 'center',
          width: 100,
          margin: 10
        })
      } catch (error) {
        console.error('Chyba při nahrávání obrázku:', error)
        alert('Chyba při nahrávání obrázku: ' + file.name)
      }
    }
    
    onChange([...images, ...newImages])
    setImageFiles([])
    setUploadingImages(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files))
    }
  }

  const updateImage = (index: number, updates: Partial<PageImage>) => {
    const newImages = [...images]
    newImages[index] = { ...newImages[index], ...updates }
    onChange(newImages)
  }

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <VStack spacing={4} align="stretch">
      <Box>
        <FormLabel>Nahrát nové obrázky</FormLabel>
        <Input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleImageChange}
          mb={2}
        />
        {imageFiles.length > 0 && (
          <HStack>
            <Button size="sm" colorScheme="blue" onClick={handleImageUpload} isLoading={uploadingImages}>
              Nahrát {imageFiles.length} obrázků
            </Button>
            <Text fontSize="sm" color="gray.600">
              {imageFiles.map(f => f.name).join(', ')}
            </Text>
          </HStack>
        )}
      </Box>

      {images.length > 0 && (
        <Box>
          <FormLabel>Nahrané obrázky ({images.length})</FormLabel>
          <VStack spacing={3} align="stretch">
            {images.map((image, index) => (
              <Box key={index} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                <Grid templateColumns="1fr 2fr" gap={3}>
                  <GridItem>
                    <img
                      src={image.url}
                      alt={image.alt || 'Obrázek'}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: 100, 
                        borderRadius: 8,
                        border: '1px solid #ccc'
                      }}
                    />
                  </GridItem>
                  <GridItem>
                    <VStack spacing={2} align="stretch">
                      <FormControl size="sm">
                        <FormLabel fontSize="xs">Alt text</FormLabel>
                        <Input
                          size="sm"
                          value={image.alt || ''}
                          onChange={(e) => updateImage(index, { alt: e.target.value })}
                          placeholder="Popis obrázku"
                        />
                      </FormControl>
                      
                      <FormControl size="sm">
                        <FormLabel fontSize="xs">Pozice</FormLabel>
                        <Select
                          size="sm"
                          value={image.position}
                          onChange={(e) => updateImage(index, { position: e.target.value as any })}
                        >
                          <option value="left">Vlevo</option>
                          <option value="center">Na střed</option>
                          <option value="right">Vpravo</option>
                          <option value="full">Plná šířka</option>
                        </Select>
                      </FormControl>

                      <HStack spacing={2}>
                        <FormControl size="sm">
                          <FormLabel fontSize="xs">Šířka (%)</FormLabel>
                          <NumberInput
                            size="sm"
                            min={10}
                            max={100}
                            value={image.width || 100}
                            onChange={(_, val) => updateImage(index, { width: val })}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                        
                        <FormControl size="sm">
                          <FormLabel fontSize="xs">Okraje (px)</FormLabel>
                          <NumberInput
                            size="sm"
                            min={0}
                            max={50}
                            value={image.margin || 10}
                            onChange={(_, val) => updateImage(index, { margin: val })}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                      </HStack>

                      <HStack justify="space-between">
                        <Badge colorScheme="blue">{image.position}</Badge>
                        <Button size="xs" colorScheme="red" onClick={() => removeImage(index)}>
                          Smazat
                        </Button>
                      </HStack>
                    </VStack>
                  </GridItem>
                </Grid>
              </Box>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}

// Funkce pro odstranění undefined hodnot z pages
function sanitizePages(pages: AppPage[]): AppPage[] {
  return pages.map(page => ({
    title: page.title ?? '',
    type: page.type ?? 'content',
    url: page.url ?? '',
    content: page.content ?? '',
    richContent: page.richContent ?? '',
    hiddenSelectors: page.hiddenSelectors ?? [],
    imageUrl: page.imageUrl ?? '',
    images: page.images ?? [],
  }));
}

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [appName, setAppName] = useState('')
  const [appDescription, setAppDescription] = useState('')
  const [pages, setPages] = useState<AppPage[]>([])
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
  const firebaseInitialized = useRef(false)

  useEffect(() => {
    if (!firebaseInitialized.current && typeof window !== 'undefined') {
      import('firebase/app').then(({ initializeApp }) => {
        firebaseApp = initializeApp({
          apiKey: 'AIzaSyA8HKV6sei0vW7DkURvdmp_BXYXvnIqqc',
          authDomain: 'app-generator-dd106.firebaseapp.com',
          projectId: 'app-generator-dd106',
          storageBucket: 'app-generator-dd106.firebasestorage.app',
          messagingSenderId: '996188428571',
          appId: '1:996188428571:web:5c3cfbeafd84c9f4119bbe',
        })
        import('firebase/firestore').then(({ getFirestore }) => {
          db = getFirestore(firebaseApp)
        })
        import('firebase/storage').then(({ getStorage }) => {
          storage = getStorage(firebaseApp)
        })
      })
      firebaseInitialized.current = true
    }
  }, [])

  // Načti seznam aplikací (instancí)
  useEffect(() => {
    if (role === 'superadmin' && db) {
      const unsub = onSnapshot(collection(db, 'apps'), (snapshot) => {
        setInstances(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      })
      return () => unsub()
    }
  }, [role, db])

  // Otevři editor pro novou nebo existující aplikaci
  const openEditor = (instance?: any) => {
    if (instance) {
      setAppName(instance.name || '')
      setAppDescription(instance.description || '')
      setPages((instance.menu || []).map((p: any) => ({
        title: p.title,
        type: p.type,
        url: p.url,
        content: p.content ?? '',
        richContent: p.richContent ?? p.content ?? '',
        hiddenSelectors: p.hiddenSelectors ?? [],
        imageUrl: p.imageUrl ?? '',
        images: p.images ?? [],
      })))
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
    if (!db) {
      alert('Firebase ještě není inicializováno. Zkuste to za chvíli.')
      return
    }
    if (editingInstance) {
      // update
      await updateDoc(doc(db, 'apps', editingInstance.id), {
        name: appName,
        description: appDescription,
        menu: sanitizePages(pages),
      })
    } else {
      // create
      await addDoc(collection(db, 'apps'), {
        name: appName,
        description: appDescription,
        menu: sanitizePages(pages),
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
          packageName: `com.example.${appName.toLowerCase().replace(/\s+/g, '')}`,
          version: '1.0.0',
          pages,
          settings: {
            description: appDescription,
          },
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Automaticky stáhni APK
        const downloadResponse = await fetch(`http://localhost:3001${data.downloadUrl}`)
        const blob = await downloadResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${appName.toLowerCase().replace(/\s+/g, '_')}.apk`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Chyba při generování: ' + (data.error || 'Neznámá chyba'))
        console.error('Generation failed:', data)
      }
    } catch (error) {
      alert('Chyba při komunikaci se serverem: ' + (error instanceof Error ? error.message : error))
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

  const handleSavePageEdit = async () => {
    if (editingPageIdx !== null && pageEdit) {
      const newPages = [...pages]
      newPages[editingPageIdx] = { 
        ...pageEdit,
        // Zachováme kompatibilitu se starým imageUrl polem
        imageUrl: pageEdit.images && pageEdit.images.length > 0 ? pageEdit.images[0].url : pageEdit.imageUrl
      }
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
                  <SimpleGrid columns={2} spacing={8} alignItems="flex-start">
                    {/* Levý sloupec: editace */}
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Název aplikace</FormLabel>
                        <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Zadejte název aplikace" />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Popis</FormLabel>
                        <Textarea value={appDescription} onChange={(e) => setAppDescription(e.target.value)} placeholder="Popis aplikace" />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Google Services (google-services.json)</FormLabel>
                        <Input type="file" accept="application/json" onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const formData = new FormData()
                            formData.append('file', e.target.files[0])
                            formData.append('packageName', `com.example.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`)
                            const res = await fetch('/api/upload-google-services', {
                              method: 'POST',
                              body: formData,
                            })
                            if (res.ok) {
                              alert('Soubor nahrán!')
                            } else {
                              alert('Chyba při nahrávání google-services.json')
                            }
                          }
                        }} />
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
                                  <Text color="gray.600" fontSize="sm" fontWeight="bold">{page.title}</Text>
                                  <Box 
                                    mt={1} 
                                    dangerouslySetInnerHTML={{ 
                                      __html: page.richContent || page.content || '<i>Žádný obsah</i>' 
                                    }}
                                    style={{ 
                                      fontSize: '12px', 
                                      lineHeight: '1.3',
                                      maxHeight: '100px',
                                      overflow: 'hidden'
                                    }}
                                  />
                                  {page.images && page.images.length > 0 && (
                                    <HStack mt={1} spacing={1}>
                                      <Text fontSize="xs" color="gray.500">Obrázky: {page.images.length}</Text>
                                      {page.images.slice(0, 3).map((img, idx) => (
                                        <Box key={idx} w="20px" h="20px" borderRadius="sm" overflow="hidden">
                                          <img 
                                            src={img.url} 
                                            alt={img.alt || 'Obrázek'} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          />
                                        </Box>
                                      ))}
                                      {page.images.length > 3 && (
                                        <Text fontSize="xs" color="gray.500">+{page.images.length - 3}</Text>
                                      )}
                                    </HStack>
                                  )}
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
                    </VStack>
                    {/* Pravý sloupec: náhled a akční tlačítka */}
                    <VStack spacing={4} align="stretch">
                      {/* Náhled aplikace */}
                      <Box mt={0} p={2} borderWidth={1} borderRadius="md" bg="gray.100">
                        <Heading size="sm" mb={2}>Náhled aplikace (menu)</Heading>
                        <HStack spacing={2}>
                          {pages.map((page, idx) => (
                            <Button key={idx} size="sm">{page.title}</Button>
                          ))}
                        </HStack>
                      </Box>
                      <Box mt={0}>
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
                                {/* Zobrazení obrázků */}
                                {pages[simPageIdx]?.images && pages[simPageIdx]?.images.length > 0 && (
                                  <VStack spacing={2} mb={3} align="stretch">
                                    {pages[simPageIdx]?.images.map((img, idx) => (
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
                                {/* Zobrazení rich contentu */}
                                <Box 
                                  dangerouslySetInnerHTML={{ 
                                    __html: pages[simPageIdx]?.richContent || pages[simPageIdx]?.content || '<i>Žádný obsah</i>' 
                                  }}
                                  style={{
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                  }}
                                />
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
                      <HStack justify="flex-end" mt={4}>
                        <Button colorScheme="blue" onClick={handleSaveInstance}>
                          Uložit
                        </Button>
                        <Button colorScheme="green" onClick={handleGenerate} isLoading={isGenerating}>
                          Generovat
                        </Button>
                        <Button onClick={() => setIsEditorOpen(false)}>
                          Zrušit
                        </Button>
                      </HStack>
                    </VStack>
                  </SimpleGrid>
                </ModalBody>
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
              <SimpleGrid
                columns={{ base: 1, md: 2 }}
                spacing={8}
                alignItems="flex-start"
                gridTemplateColumns={{ base: '1fr', md: '2fr 1fr' }}
              >
                {/* Levý sloupec: editace */}
                <VStack spacing={4} align="stretch" minW={0}>
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
                    <>
                      <FormControl>
                        <FormLabel>Obrázky stránky</FormLabel>
                        <ImageManager 
                          images={pageEdit?.images || []} 
                          onChange={(images) => setPageEdit({ ...pageEdit, images })}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Obsah stránky (Rich Text Editor)</FormLabel>
                        <RichTextEditor 
                          value={pageEdit?.richContent || pageEdit?.content || ''} 
                          onChange={(value) => setPageEdit({ ...pageEdit, richContent: value, content: value })}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Původní obsah (pro kompatibilitu)</FormLabel>
                        <Textarea 
                          value={pageEdit?.content || ''} 
                          onChange={e => setPageEdit({ ...pageEdit, content: e.target.value })}
                          placeholder="Prostý text obsah (pro kompatibilitu se starými aplikacemi)"
                        />
                      </FormControl>
                    </>
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
                                (el.contentWindow as any)?.postMessage({ type: 'INJECT_PICKER' }, '*');
                                el.onload = () => {
                                  (el.contentWindow as any)?.eval(getPickerScript());
                                };
                                setTimeout(() => {
                                  try { (el.contentWindow as any)?.eval(getPickerScript()); } catch {};
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
                {/* Pravý sloupec: náhled a akční tlačítka */}
                <VStack spacing={4} align="stretch" minW={0}>
                  {/* Náhled aplikace */}
                  <Box mt={0} p={2} borderWidth={1} borderRadius="md" bg="gray.100">
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
                            {/* Zobrazení obrázků */}
                            {pages[simPageIdx]?.images && pages[simPageIdx]?.images.length > 0 && (
                              <VStack spacing={2} mb={3} align="stretch">
                                {pages[simPageIdx]?.images.map((img, idx) => (
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
                            {/* Zobrazení rich contentu */}
                            <Box 
                              dangerouslySetInnerHTML={{ 
                                __html: pages[simPageIdx]?.richContent || pages[simPageIdx]?.content || '<i>Žádný obsah</i>' 
                              }}
                              style={{
                                fontSize: '14px',
                                lineHeight: '1.5'
                              }}
                            />
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
                  <HStack justify="flex-end" mt={4}>
                    <Button colorScheme="blue" onClick={handleSavePageEdit}>
                      Uložit
                    </Button>
                    <Button onClick={() => setIsPageEditorOpen(false)}>Zrušit</Button>
                  </HStack>
                </VStack>
              </SimpleGrid>
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  )
>>>>>>> 3ac947d (Dočasný commit před pull)
}