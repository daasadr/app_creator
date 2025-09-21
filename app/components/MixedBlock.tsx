import React from 'react'
import { Box, VStack, HStack, Input, Textarea, Button, Text, Divider } from '@chakra-ui/react'
import type { Block, MixedBlockContent } from '../types'

interface MixedBlockProps {
  block: Block
  onChange: (block: Block) => void
  onDelete: () => void
}

function MixedBlock({ block, onChange, onDelete }: MixedBlockProps) {
  if (block.type !== 'mixed') return null

  const content = block.content as MixedBlockContent

  const updateContent = (updates: Partial<MixedBlockContent>) => {
    const newContent = { ...content, ...updates }
    onChange({ ...block, content: newContent })
  }

  const updateText = (text: string) => {
    updateContent({ text })
  }

  const updateImage = (image: MixedBlockContent['image']) => {
    updateContent({ image })
  }

  const updateButton = (button: MixedBlockContent['button']) => {
    updateContent({ button })
  }

  const updateTable = (table: MixedBlockContent['table']) => {
    updateContent({ table })
  }

  return (
    <Box p={3} border="1px solid" borderColor="purple.200" borderRadius="md" bg="purple.50">
      <Text fontSize="sm" fontWeight="bold" color="purple.600" mb={3}>
        Kombinovaný blok
      </Text>
      
      <VStack spacing={3} align="stretch">
        {/* Text sekce */}
        <Box>
          <Text fontSize="xs" color="gray.600" mb={1}>Text:</Text>
          <Textarea
            value={content.text || ''}
            onChange={e => updateText(e.target.value)}
            placeholder="Zadejte text..."
            size="sm"
            minH={20}
          />
        </Box>

        <Divider />

        {/* Obrázek sekce */}
        <Box>
          <Text fontSize="xs" color="gray.600" mb={1}>Obrázek:</Text>
          <VStack spacing={2} align="stretch">
            <Input
              value={content.image?.url || ''}
              onChange={e => updateImage({ ...content.image, url: e.target.value })}
              placeholder="URL obrázku..."
              size="sm"
            />
            <HStack spacing={2}>
              <Input
                value={content.image?.alt || ''}
                onChange={e => updateImage({ ...content.image, alt: e.target.value })}
                placeholder="Alt text..."
                size="sm"
                flex={1}
              />
              <Input
                type="number"
                value={content.image?.width || 300}
                onChange={e => updateImage({ ...content.image, width: parseInt(e.target.value) || 300 })}
                placeholder="Šířka"
                size="sm"
                w={20}
              />
            </HStack>
            {content.image?.url && (
              <Box textAlign="center">
                <img 
                  src={content.image.url} 
                  alt={content.image.alt || ''} 
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    maxHeight: '150px',
                    borderRadius: '4px'
                  }} 
                />
              </Box>
            )}
          </VStack>
        </Box>

        <Divider />

        {/* Tlačítko sekce */}
        <Box>
          <Text fontSize="xs" color="gray.600" mb={1}>Tlačítko:</Text>
          <VStack spacing={2} align="stretch">
            <Input
              value={content.button?.text || ''}
              onChange={e => updateButton({ ...content.button, text: e.target.value })}
              placeholder="Text tlačítka..."
              size="sm"
            />
            <Input
              value={content.button?.url || ''}
              onChange={e => updateButton({ ...content.button, url: e.target.value })}
              placeholder="URL tlačítka..."
              size="sm"
            />
            {content.button?.text && (
              <Box textAlign="center">
                <Button size="sm" colorScheme="blue" isDisabled>
                  {content.button.text}
                </Button>
              </Box>
            )}
          </VStack>
        </Box>

        <Divider />

        {/* Tabulka sekce */}
        <Box>
          <Text fontSize="xs" color="gray.600" mb={1}>Tabulka:</Text>
          {content.table?.data ? (
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                {content.table.data.length} řádků × {content.table.data[0]?.length || 0} sloupců
              </Text>
              <Box 
                as="table" 
                border="1px solid #ccc" 
                borderRadius="md" 
                w="100%" 
                style={{ borderCollapse: 'collapse' }}
              >
                <tbody>
                  {content.table.data.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td 
                          key={j} 
                          style={{ 
                            border: '1px solid #ccc', 
                            padding: '4px 8px',
                            fontSize: '12px'
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
          ) : (
            <Text fontSize="xs" color="gray.400" fontStyle="italic">
              Žádná tabulka
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  )
}

export default MixedBlock