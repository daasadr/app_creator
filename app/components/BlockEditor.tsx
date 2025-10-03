import type { Block, PageImage, AppPage, BlockStyle } from '../types'
import React, { useState } from 'react'
import { VStack, Box, Textarea, Button, HStack, Collapse, useDisclosure, IconButton, Switch, Text } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import TableWidget from './TableWidget'
import ImageBlock from './ImageBlock'
import ButtonBlock from './ButtonBlock'
import MixedBlock from './MixedBlock'
import BlockStyleEditor from './BlockStyleEditor'

function BlockEditor({ value, onChange }: { value: Block[], onChange: (blocks: Block[]) => void }) {
  const [editingStyle, setEditingStyle] = useState<number | null>(null)
  const { isOpen, onToggle } = useDisclosure()

  const handleTextChange = (idx: number, text: string) => {
    const newBlocks = value.map((b, i) => i === idx && b.type === 'text' ? { ...b, content: text } : b)
    onChange(newBlocks)
  }
  
  const handleTableChange = (idx: number, data: string[][]) => {
    const newBlocks = value.map((b, i) => i === idx && b.type === 'table' ? { ...b, data } : b)
    onChange(newBlocks)
  }
  
  const handleImageChange = (idx: number, block: Block) => {
    const newBlocks = value.map((b, i) => i === idx ? block : b)
    onChange(newBlocks)
  }

  const handleButtonChange = (idx: number, block: Block) => {
    const newBlocks = value.map((b, i) => i === idx ? block : b)
    onChange(newBlocks)
  }

  const handleMixedChange = (idx: number, block: Block) => {
    const newBlocks = value.map((b, i) => i === idx ? block : b)
    onChange(newBlocks)
  }

  const handleStyleChange = (idx: number, style: BlockStyle) => {
    const newBlocks = value.map((b, i) => i === idx ? { ...b, style } : b)
    onChange(newBlocks)
  }

  const resetStyle = (idx: number) => {
    const newBlocks = value.map((b, i) => i === idx ? { ...b, style: undefined } : b)
    onChange(newBlocks)
  }

  const addTextBlock = () => onChange([...value, { type: 'text', content: '' }])
  const addTableBlock = () => onChange([...value, { type: 'table', data: [['',''],['','']] }])
  const addImageBlock = () => onChange([...value, { type: 'image', url: '', align: 'center', width: 300 }])
  const addButtonBlock = () => onChange([...value, { type: 'button', text: 'Tlačítko', url: '' }])
  const addMixedBlock = () => onChange([...value, { 
    type: 'mixed', 
    content: { 
      text: 'Text v kombinovaném bloku',
      image: { url: '', align: 'center', width: 300 },
      button: { text: 'Tlačítko', url: '' }
    } 
  }])
  
  const removeBlock = (idx: number) => onChange(value.filter((_, i) => i !== idx))
  
  const moveBlock = (idx: number, dir: -1|1) => {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === value.length-1)) return
    const newBlocks = [...value]
    const [block] = newBlocks.splice(idx, 1)
    newBlocks.splice(idx+dir, 0, block)
    onChange(newBlocks)
  }

  const getBlockStyle = (block: Block) => {
    const style = block.style || {}
    return {
      padding: `${style.padding || 16}px`,
      margin: `${style.margin || 8}px`,
      borderRadius: `${style.borderRadius || 8}px`,
      borderWidth: `${style.borderWidth || 1}px`,
      borderColor: style.borderColor || '#e2e8f0',
      borderStyle: style.borderStyle || 'solid',
      backgroundColor: style.backgroundColor || '#ffffff',
      color: style.textColor || '#1a202c',
      fontSize: `${style.fontSize || 14}px`,
      fontWeight: style.fontWeight || 'normal',
      textAlign: style.textAlign || 'left',
      boxShadow: style.boxShadow || '0 1px 3px rgba(0, 0, 0, 0.1)',
      ...(style.plasticEffect && {
        background: 'linear-gradient(145deg, #e6e6e6, #ffffff)',
        boxShadow: '5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff'
      })
    }
  }

  return (
    <VStack align="stretch" spacing={3} border="1px solid #ccc" borderRadius="md" p={2}>
      {value.map((block, idx) => (
        <Box key={idx} style={getBlockStyle(block)}>
          {block.type === 'text' && (
            <Textarea 
              value={block.content} 
              onChange={e => handleTextChange(idx, e.target.value)} 
              placeholder="Text..." 
              minH={10}
              border="none"
              bg="transparent"
              _focus={{ boxShadow: 'none' }}
            />
          )}
          {block.type === 'table' && (
            <TableWidget data={block.data} onChange={data => handleTableChange(idx, data)} />
          )}
          {block.type === 'image' && (
            <ImageBlock block={block} onChange={b => handleImageChange(idx, b)} onDelete={() => removeBlock(idx)} />
          )}
          {block.type === 'button' && (
            <ButtonBlock 
              block={block} 
              onChange={b => handleButtonChange(idx, b)} 
              onDelete={() => removeBlock(idx)} 
            />
          )}
          {block.type === 'mixed' && (
            <MixedBlock 
              block={block} 
              onChange={b => handleMixedChange(idx, b)} 
              onDelete={() => removeBlock(idx)} 
            />
          )}
          
          <HStack mt={1} spacing={1} justify="space-between">
            <HStack spacing={1}>
              <Button size="xs" onClick={() => moveBlock(idx, -1)} isDisabled={idx === 0}>↑</Button>
              <Button size="xs" onClick={() => moveBlock(idx, 1)} isDisabled={idx === value.length-1}>↓</Button>
              <Button size="xs" colorScheme="red" onClick={() => removeBlock(idx)}>Smazat</Button>
            </HStack>
            <HStack spacing={2}>
              {/* Permissions toggle */}
              <Box display="flex" alignItems="center" bg="gray.50" px={2} py={1} borderRadius="sm">
                <Text fontSize="xs" mr={1}>🔐</Text>
                <Switch
                  size="sm"
                  isChecked={block.requireAuth || false}
                  onChange={(e) => {
                    const newBlocks = value.map((b, i) => i === idx ? { ...b, requireAuth: e.target.checked } : b);
                    onChange(newBlocks);
                  }}
                />
                <Text fontSize="xs" ml={1}>Auth</Text>
              </Box>
              <IconButton
                size="xs"
                icon={editingStyle === idx ? <ChevronUpIcon /> : <ChevronDownIcon />}
                onClick={() => setEditingStyle(editingStyle === idx ? null : idx)}
                aria-label="Stylování"
                colorScheme="blue"
                variant="outline"
              />
            </HStack>
          </HStack>

          <Collapse in={editingStyle === idx}>
            <Box mt={2}>
              <BlockStyleEditor
                style={block.style || {}}
                onChange={(style) => handleStyleChange(idx, style)}
                onReset={() => resetStyle(idx)}
              />
            </Box>
          </Collapse>
        </Box>
      ))}
      
      <HStack wrap="wrap">
        <Button size="sm" onClick={addTextBlock}>+ Text</Button>
        <Button size="sm" onClick={addTableBlock}>+ Tabulka</Button>
        <Button size="sm" onClick={addImageBlock}>+ Obrázek</Button>
        <Button size="sm" onClick={addButtonBlock}>+ Tlačítko</Button>
        <Button size="sm" colorScheme="purple" onClick={addMixedBlock}>+ Kombinovaný</Button>
      </HStack>
    </VStack>
  )
}

export default BlockEditor