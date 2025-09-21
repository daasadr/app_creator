import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Select,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  Divider,
  FormControl,
  FormLabel,
  ColorPicker,
  useColorModeValue
} from '@chakra-ui/react'

interface BlockStyleEditorProps {
  style: BlockStyle;
  onChange: (style: BlockStyle) => void;
  onReset: () => void;
}

const BlockStyleEditor: React.FC<BlockStyleEditorProps> = ({ style, onChange, onReset }) => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const updateStyle = (updates: Partial<BlockStyle>) => {
    onChange({ ...style, ...updates })
  }

  const getDefaultStyle = (): BlockStyle => ({
    padding: 16,
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    backgroundColor: '#ffffff',
    textColor: '#1a202c',
    fontSize: 14,
    fontWeight: 'normal',
    textAlign: 'left',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    autoProportions: false,
    plasticEffect: false
  })

  const applyAutoProportions = () => {
    const autoStyle = {
      padding: 20,
      margin: 12,
      borderRadius: 12,
      borderWidth: 2,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }
    updateStyle(autoStyle)
  }

  return (
    <Box bg={bgColor} p={4} borderRadius="md" border="1px solid" borderColor={borderColor}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">Stylování Bloku</Text>
          <HStack>
            <Button size="sm" onClick={applyAutoProportions} colorScheme="blue">
              Automatické proporce
            </Button>
            <Button size="sm" onClick={onReset} colorScheme="red" variant="outline">
              Reset
            </Button>
          </HStack>
        </HStack>

        <Divider />

        {/* Spacing */}
        <VStack spacing={3} align="stretch">
          <Text fontWeight="semibold">Rozestupy</Text>
          
          <FormControl>
            <FormLabel fontSize="sm">Padding (vnitřní odsazení)</FormLabel>
            <HStack>
              <Slider
                value={style.padding || 16}
                min={0}
                max={50}
                onChange={(val) => updateStyle({ padding: val })}
                flex="1"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <NumberInput
                value={style.padding || 16}
                onChange={(_, val) => updateStyle({ padding: val })}
                min={0}
                max={50}
                size="sm"
                w="80px"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </HStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Margin (vnější odsazení)</FormLabel>
            <HStack>
              <Slider
                value={style.margin || 8}
                min={0}
                max={30}
                onChange={(val) => updateStyle({ margin: val })}
                flex="1"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <NumberInput
                value={style.margin || 8}
                onChange={(_, val) => updateStyle({ margin: val })}
                min={0}
                max={30}
                size="sm"
                w="80px"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </HStack>
          </FormControl>
        </VStack>

        <Divider />

        {/* Border */}
        <VStack spacing={3} align="stretch">
          <Text fontWeight="semibold">Ohraničení</Text>
          
          <HStack>
            <FormControl flex="1">
              <FormLabel fontSize="sm">Šířka borderu</FormLabel>
              <HStack>
                <Slider
                  value={style.borderWidth || 1}
                  min={0}
                  max={10}
                  onChange={(val) => updateStyle({ borderWidth: val })}
                  flex="1"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <NumberInput
                  value={style.borderWidth || 1}
                  onChange={(_, val) => updateStyle({ borderWidth: val })}
                  min={0}
                  max={10}
                  size="sm"
                  w="60px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
            </FormControl>

            <FormControl flex="1">
              <FormLabel fontSize="sm">Styl borderu</FormLabel>
              <Select
                value={style.borderStyle || 'solid'}
                onChange={(e) => updateStyle({ borderStyle: e.target.value as any })}
                size="sm"
              >
                <option value="none">Žádný</option>
                <option value="solid">Plný</option>
                <option value="dashed">Čárkovaný</option>
                <option value="dotted">Tečkovaný</option>
              </Select>
            </FormControl>
          </HStack>

          <HStack>
            <FormControl flex="1">
              <FormLabel fontSize="sm">Barva borderu</FormLabel>
              <Input
                type="color"
                value={style.borderColor || '#e2e8f0'}
                onChange={(e) => updateStyle({ borderColor: e.target.value })}
                size="sm"
                h="32px"
              />
            </FormControl>

            <FormControl flex="1">
              <FormLabel fontSize="sm">Radius (zaoblení)</FormLabel>
              <HStack>
                <Slider
                  value={style.borderRadius || 8}
                  min={0}
                  max={50}
                  onChange={(val) => updateStyle({ borderRadius: val })}
                  flex="1"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <NumberInput
                  value={style.borderRadius || 8}
                  onChange={(_, val) => updateStyle({ borderRadius: val })}
                  min={0}
                  max={50}
                  size="sm"
                  w="60px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
            </FormControl>
          </HStack>
        </VStack>

        <Divider />

        {/* Colors */}
        <VStack spacing={3} align="stretch">
          <Text fontWeight="semibold">Barvy</Text>
          
          <HStack>
            <FormControl flex="1">
              <FormLabel fontSize="sm">Barva pozadí</FormLabel>
              <Input
                type="color"
                value={style.backgroundColor || '#ffffff'}
                onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                size="sm"
                h="32px"
              />
            </FormControl>

            <FormControl flex="1">
              <FormLabel fontSize="sm">Barva písma</FormLabel>
              <Input
                type="color"
                value={style.textColor || '#1a202c'}
                onChange={(e) => updateStyle({ textColor: e.target.value })}
                size="sm"
                h="32px"
              />
            </FormControl>
          </HStack>
        </VStack>

        <Divider />

        {/* Typography */}
        <VStack spacing={3} align="stretch">
          <Text fontWeight="semibold">Typografie</Text>
          
          <HStack>
            <FormControl flex="1">
              <FormLabel fontSize="sm">Velikost písma</FormLabel>
              <HStack>
                <Slider
                  value={style.fontSize || 14}
                  min={8}
                  max={32}
                  onChange={(val) => updateStyle({ fontSize: val })}
                  flex="1"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <NumberInput
                  value={style.fontSize || 14}
                  onChange={(_, val) => updateStyle({ fontSize: val })}
                  min={8}
                  max={32}
                  size="sm"
                  w="60px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
            </FormControl>

            <FormControl flex="1">
              <FormLabel fontSize="sm">Zarovnání textu</FormLabel>
              <Select
                value={style.textAlign || 'left'}
                onChange={(e) => updateStyle({ textAlign: e.target.value as any })}
                size="sm"
              >
                <option value="left">Vlevo</option>
                <option value="center">Na střed</option>
                <option value="right">Vpravo</option>
                <option value="justify">Do bloku</option>
              </Select>
            </FormControl>
          </HStack>

          <FormControl>
            <FormLabel fontSize="sm">Tloušťka písma</FormLabel>
            <Select
              value={style.fontWeight || 'normal'}
              onChange={(e) => updateStyle({ fontWeight: e.target.value as any })}
              size="sm"
            >
              <option value="normal">Normální</option>
              <option value="bold">Tučné</option>
              <option value="lighter">Tenké</option>
              <option value="bolder">Velmi tučné</option>
            </Select>
          </FormControl>
        </VStack>

        <Divider />

        {/* Effects */}
        <VStack spacing={3} align="stretch">
          <Text fontWeight="semibold">Efekty</Text>
          
          <FormControl>
            <FormLabel fontSize="sm">Stín</FormLabel>
            <Input
              placeholder="např: 0 4px 6px rgba(0, 0, 0, 0.1)"
              value={style.boxShadow || ''}
              onChange={(e) => updateStyle({ boxShadow: e.target.value })}
              size="sm"
            />
          </FormControl>

          <HStack>
            <FormControl>
              <HStack>
                <Switch
                  isChecked={style.plasticEffect || false}
                  onChange={(e) => updateStyle({ plasticEffect: e.target.checked })}
                />
                <FormLabel fontSize="sm" mb={0}>Plastický efekt</FormLabel>
              </HStack>
            </FormControl>

            <FormControl>
              <HStack>
                <Switch
                  isChecked={style.autoProportions || false}
                  onChange={(e) => updateStyle({ autoProportions: e.target.checked })}
                />
                <FormLabel fontSize="sm" mb={0}>Automatické proporce</FormLabel>
              </HStack>
            </FormControl>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  )
}

export default BlockStyleEditor