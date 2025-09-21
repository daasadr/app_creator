import React from 'react'
import {
  Box,
  Button,
  Input,
  HStack,
  VStack,
  Text,
  Select,
  FormControl,
  FormLabel,
  useColorModeValue
} from '@chakra-ui/react'
import type { Block } from '../types'

interface ButtonBlockProps {
  block: Extract<Block, { type: 'button' }>;
  onChange: (block: Block) => void;
  onDelete: () => void;
}

const ButtonBlock: React.FC<ButtonBlockProps> = ({ block, onChange, onDelete }) => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const updateButton = (updates: Partial<Extract<Block, { type: 'button' }>>) => {
    onChange({ ...block, ...updates })
  }

  const getButtonStyle = () => {
    const style = block.style || {}
    return {
      padding: `${style.padding || 12}px ${style.padding || 24}px`,
      margin: `${style.margin || 8}px`,
      borderRadius: `${style.borderRadius || 8}px`,
      borderWidth: `${style.borderWidth || 1}px`,
      borderColor: style.borderColor || '#e2e8f0',
      borderStyle: style.borderStyle || 'solid',
      backgroundColor: style.backgroundColor || '#3182ce',
      color: style.textColor || '#ffffff',
      fontSize: `${style.fontSize || 14}px`,
      fontWeight: style.fontWeight || 'normal',
      textAlign: style.textAlign || 'center',
      boxShadow: style.boxShadow || '0 1px 3px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      transform: 'translateY(0)',
      ...(style.plasticEffect && {
        background: 'linear-gradient(145deg, #e6e6e6, #ffffff)',
        boxShadow: '5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff',
        '&:active': {
          transform: 'translateY(2px)',
          boxShadow: '2px 2px 5px #d1d1d1, -2px -2px 5px #ffffff'
        }
      })
    }
  }

  const handleClick = () => {
    if (block.url) {
      window.open(block.url, '_blank')
    } else if (block.action) {
      // Zde by se mohly přidat vlastní akce
      console.log('Button action:', block.action)
    }
  }

  return (
    <Box bg={bgColor} p={4} borderRadius="md" border="1px solid" borderColor={borderColor}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">Tlačítko</Text>
          <Button size="sm" colorScheme="red" onClick={onDelete}>
            Smazat
          </Button>
        </HStack>

        {/* Button Preview */}
        <Box textAlign="center" p={4} bg="gray.50" borderRadius="md">
          <Button
            onClick={handleClick}
            style={getButtonStyle()}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
            }}
            _active={{
              transform: 'translateY(0)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {block.text || 'Tlačítko'}
          </Button>
        </Box>

        {/* Button Settings */}
        <VStack spacing={3} align="stretch">
          <FormControl>
            <FormLabel fontSize="sm">Text tlačítka</FormLabel>
            <Input
              value={block.text || ''}
              onChange={(e) => updateButton({ text: e.target.value })}
              placeholder="Text tlačítka"
              size="sm"
            />
          </FormControl>

          <HStack>
            <FormControl flex="1">
              <FormLabel fontSize="sm">URL (odkaz)</FormLabel>
              <Input
                value={block.url || ''}
                onChange={(e) => updateButton({ url: e.target.value })}
                placeholder="https://example.com"
                size="sm"
              />
            </FormControl>

            <FormControl flex="1">
              <FormLabel fontSize="sm">Akce</FormLabel>
              <Select
                value={block.action || ''}
                onChange={(e) => updateButton({ action: e.target.value })}
                size="sm"
              >
                <option value="">Žádná akce</option>
                <option value="navigate_back">Zpět</option>
                <option value="navigate_home">Domů</option>
                <option value="open_menu">Otevřít menu</option>
                <option value="custom">Vlastní akce</option>
              </Select>
            </FormControl>
          </HStack>

          <Text fontSize="xs" color="gray.500">
            {block.url ? `Odkaz: ${block.url}` : 
             block.action ? `Akce: ${block.action}` : 
             'Nastavte URL nebo akci pro tlačítko'}
          </Text>
        </VStack>
      </VStack>
    </Box>
  )
}

export default ButtonBlock