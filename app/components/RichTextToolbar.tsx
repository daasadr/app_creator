import React from 'react';
import {
  Flex, HStack, Tooltip, IconButton, Divider, Button, Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverBody, VStack, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Text
} from '@chakra-ui/react';
import { RichTextToolbarProps } from '../types';

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  isBold, isItalic, isUnderline, alignment, fontSize, fontColor, backgroundColor,
  onCommand, onInsertTable, onInsertTableNoBorder, onInsertLink, onInsertImage, onInsertHorizontalRule, onInsertList, onClearFormatting, onAddTableRow, onAddTableColumn,
  tableRows, setTableRows, tableCols, setTableCols, showTableOptions, setShowTableOptions, showColorPicker, setShowColorPicker, showBgColorPicker, setShowBgColorPicker
}) => (
  <Flex wrap="wrap" p={2} bg="gray.50" borderBottom="1px solid" borderColor="gray.300" gap={1}>
    {/* Text formatting */}
    <HStack spacing={1}>
      <Tooltip label="Tučné">
        <IconButton
          aria-label="Tučné"
          size="sm"
          icon={<span style={{ fontWeight: 'bold' }}>B</span>}
          onClick={() => onCommand('bold')}
          colorScheme={isBold ? 'blue' : 'gray'}
        />
      </Tooltip>
      <Tooltip label="Kurzíva">
        <IconButton
          aria-label="Kurzíva"
          size="sm"
          icon={<span style={{ fontStyle: 'italic' }}>I</span>}
          onClick={() => onCommand('italic')}
          colorScheme={isItalic ? 'blue' : 'gray'}
        />
      </Tooltip>
      <Tooltip label="Podtržené">
        <IconButton
          aria-label="Podtržené"
          size="sm"
          icon={<span style={{ textDecoration: 'underline' }}>U</span>}
          onClick={() => onCommand('underline')}
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
          onClick={() => onCommand('justifyLeft')}
          colorScheme={alignment === 'left' ? 'blue' : 'gray'}
        />
      </Tooltip>
      <Tooltip label="Na střed">
        <IconButton
          aria-label="Na střed"
          size="sm"
          icon={<span>⫸⫷</span>}
          onClick={() => onCommand('justifyCenter')}
          colorScheme={alignment === 'center' ? 'blue' : 'gray'}
        />
      </Tooltip>
      <Tooltip label="Vpravo">
        <IconButton
          aria-label="Vpravo"
          size="sm"
          icon={<span>⫸</span>}
          onClick={() => onCommand('justifyRight')}
          colorScheme={alignment === 'right' ? 'blue' : 'gray'}
        />
      </Tooltip>
      <Tooltip label="Do bloku">
        <IconButton
          aria-label="Do bloku"
          size="sm"
          icon={<span>⫸⫷⫸</span>}
          onClick={() => onCommand('justifyFull')}
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
          onClick={() => onInsertList(false)}
        />
      </Tooltip>
      <Tooltip label="Číslovaný seznam">
        <IconButton
          aria-label="Číslovaný seznam"
          size="sm"
          icon={<span>1.</span>}
          onClick={() => onInsertList(true)}
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
          onClick={onInsertLink}
        />
      </Tooltip>
      <Tooltip label="Vložit obrázek">
        <IconButton
          aria-label="Vložit obrázek"
          size="sm"
          icon={<span>🖼️</span>}
          onClick={onInsertImage}
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
              <Button size="sm" onClick={onInsertTable}>S ohraničením</Button>
              <Button size="sm" onClick={onInsertTableNoBorder}>Bez ohraničení</Button>
            </HStack>
            <Divider />
            <Text fontSize="sm" fontWeight="bold">Správa existující tabulky:</Text>
            <HStack spacing={2}>
              <Button size="sm" onClick={onAddTableRow}>+ Řádek</Button>
              <Button size="sm" onClick={onAddTableColumn}>+ Sloupec</Button>
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
          onClick={onInsertHorizontalRule}
        />
      </Tooltip>
      <Tooltip label="Vymazat formátování">
        <IconButton
          aria-label="Vymazat formátování"
          size="sm"
          icon={<span>🧹</span>}
          onClick={onClearFormatting}
        />
      </Tooltip>
    </HStack>
  </Flex>
);

export default RichTextToolbar; 