import type { Block, PageImage, AppPage } from '../types'
import React from 'react'
import { VStack, Box, Textarea, Button, HStack } from '@chakra-ui/react'
import TableWidget from './TableWidget'
import ImageBlock from './ImageBlock'

function BlockEditor({ value, onChange }: { value: Block[], onChange: (blocks: Block[]) => void }) {
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
  const addTextBlock = () => onChange([...value, { type: 'text', content: '' }])
  const addTableBlock = () => onChange([...value, { type: 'table', data: [['',''],['','']] }])
  const addImageBlock = () => onChange([...value, { type: 'image', url: '', align: 'center', width: 300 }])
  const removeBlock = (idx: number) => onChange(value.filter((_, i) => i !== idx))
  const moveBlock = (idx: number, dir: -1|1) => {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === value.length-1)) return
    const newBlocks = [...value]
    const [block] = newBlocks.splice(idx, 1)
    newBlocks.splice(idx+dir, 0, block)
    onChange(newBlocks)
  }

  return (
    <VStack align="stretch" spacing={3} border="1px solid #ccc" borderRadius="md" p={2}>
      {value.map((block, idx) => (
        <Box key={idx}>
          {block.type === 'text' && (
            <Textarea value={block.content} onChange={e => handleTextChange(idx, e.target.value)} placeholder="Text..." minH={10} />
          )}
          {block.type === 'table' && (
            <TableWidget data={block.data} onChange={data => handleTableChange(idx, data)} />
          )}
          {block.type === 'image' && (
            <ImageBlock block={block} onChange={b => handleImageChange(idx, b)} onDelete={() => removeBlock(idx)} />
          )}
          <HStack mt={1} spacing={1}>
            <Button size="xs" onClick={() => moveBlock(idx, -1)} isDisabled={idx === 0}>↑</Button>
            <Button size="xs" onClick={() => moveBlock(idx, 1)} isDisabled={idx === value.length-1}>↓</Button>
            <Button size="xs" colorScheme="red" onClick={() => removeBlock(idx)}>Smazat blok</Button>
          </HStack>
        </Box>
      ))}
      <HStack>
        <Button size="sm" onClick={addTextBlock}>+ Text</Button>
        <Button size="sm" onClick={addTableBlock}>+ Tabulka</Button>
        <Button size="sm" onClick={addImageBlock}>+ Obrázek</Button>
      </HStack>
    </VStack>
  )
}

export default BlockEditor