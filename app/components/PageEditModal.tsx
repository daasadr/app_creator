import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, Button, Box, Flex, FormControl, FormLabel, Input, Select, Textarea, Heading, VStack, HStack, Text
} from '@chakra-ui/react';
import ImageManager from './ImageManager';
import BlockEditor from './BlockEditor';
import { PageEditModalProps } from '../types';

const PageEditModal: React.FC<PageEditModalProps> = ({
  isOpen,
  onClose,
  pageEdit,
  setPageEdit,
  onSave,
  pickerActive,
  setPickerActive
}) => {
  if (!pageEdit) return null;

  const handleInsertImage = (url: string) => {
    if (!pageEdit) return;
    const newBlock = { type: 'image', url, align: 'center', width: 300 };
    const blocks = Array.isArray(pageEdit.blocks) ? [...pageEdit.blocks, newBlock] : [newBlock];
    setPageEdit({ ...pageEdit, blocks });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent maxW="1200px" minH="80vh">
        <ModalHeader>Upravit stránku</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6} p={0}>
          <Flex direction="row" align="flex-start" gap={8} minH="70vh">
            {/* Levý sloupec: editace stránky */}
            <Box flex="2" minW={0} maxW="65vw" p={4} bg="white" borderRadius="md" boxShadow="sm" overflowY="auto" maxHeight="75vh">
              <FormControl>
                <FormLabel>Název stránky</FormLabel>
                <Input value={pageEdit.title || ''} onChange={e => setPageEdit({ ...pageEdit, title: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Typ stránky</FormLabel>
                <Select value={pageEdit.type || 'content'} onChange={e => setPageEdit({ ...pageEdit, type: e.target.value as any })}>
                  <option value="content">Content</option>
                  <option value="webview">WebView</option>
                </Select>
              </FormControl>
              {pageEdit.type === 'content' && (
                <>
                  <FormControl>
                    <FormLabel>Obrázky stránky</FormLabel>
                    <ImageManager 
                      images={pageEdit.images || []} 
                      onChange={(images) => setPageEdit({ ...pageEdit, images })}
                      onInsert={handleInsertImage}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Obsah stránky (Rich Text Editor)</FormLabel>
                    <BlockEditor 
                      value={pageEdit.blocks || [{type:'text',content:''}]} 
                      onChange={(blocks) => setPageEdit({ ...pageEdit, blocks })}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Původní obsah (pro kompatibilitu)</FormLabel>
                    <Textarea 
                      value={pageEdit.content || ''} 
                      onChange={e => setPageEdit({ ...pageEdit, content: e.target.value })}
                      placeholder="Prostý text obsah (pro kompatibilitu se starými aplikacemi)"
                    />
                  </FormControl>
                </>
              )}
              {pageEdit.type === 'webview' && (
                <>
                  <FormControl>
                    <FormLabel>URL</FormLabel>
                    <Input value={pageEdit.url || ''} onChange={e => setPageEdit({ ...pageEdit, url: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Skryté elementy (CSS selektory, oddělené čárkou)</FormLabel>
                    <Input value={pageEdit.hiddenSelectors?.join(', ') || ''} onChange={e => setPageEdit({ ...pageEdit, hiddenSelectors: e.target.value.split(',').map((s: string) => s.trim()) })} />
                  </FormControl>
                  <Button size="sm" colorScheme={pickerActive ? 'red' : 'blue'} mb={2} onClick={() => setPickerActive(!pickerActive)}>
                    {pickerActive ? 'Ukončit výběr (kapátko)' : 'Vybrat elementy ke skrytí (kapátko)'}
                  </Button>
                  <Box>
                    {pageEdit.hiddenSelectors?.map((sel: string, i: number) => (
                      <Box key={i} display="inline-block" bg="gray.200" px={2} py={1} borderRadius="md" m={1}>
                        <Text as="span" fontSize="sm">{sel}</Text>
                        <Button size="xs" ml={2} onClick={() => setPageEdit({ ...pageEdit, hiddenSelectors: pageEdit.hiddenSelectors.filter((s: string) => s !== sel) })}>x</Button>
                      </Box>
                    ))}
                  </Box>
                  {/* Náhled WebView (iframe) s kapátkem */}
                  {pageEdit.url && (
                    <Box mt={2} borderWidth={1} borderRadius="md" overflow="hidden" h="300px">
                      <iframe
                        src={pageEdit.url}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="WebView náhled"
                        ref={el => {
                          if (el && pickerActive) {
                            (el.contentWindow as any)?.postMessage({ type: 'INJECT_PICKER' }, '*');
                            el.onload = () => {
                              (el.contentWindow as any)?.eval(window.getPickerScript?.());
                            };
                            setTimeout(() => {
                              try { (el.contentWindow as any)?.eval(window.getPickerScript?.()); } catch {};
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
            </Box>
            {/* Pravý sloupec: sticky náhled a akce */}
            <Box flex="1" minW="350px" maxW="420px" p={2} bg="gray.50" borderRadius="md" boxShadow="sm" position="sticky" top={0} zIndex={2}>
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
                <Box p={4} pt={6} pb={16} h="100%" overflowY="auto">
                  {pageEdit.type === 'content' && pageEdit.blocks && (
                    <Box>
                      <Heading size="md" mb={2}>{pageEdit.title}</Heading>
                      {pageEdit.blocks.map((block, idx) => {
                        if (block.type === 'text') return <Box key={idx} mb={2} fontSize="md">{block.content}</Box>;
                        if (block.type === 'table') return (
                          <Box key={idx} as="table" border="1px solid #ccc" borderRadius="md" my={2} w="100%" style={{ borderCollapse: 'collapse' }}>
                            <tbody>{block.data.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>)}</tr>)}</tbody>
                          </Box>
                        );
                        if (block.type === 'image') return (
                          <Box key={idx} my={2} textAlign={block.align === 'left' || block.align === 'right' || block.align === 'center' ? block.align : 'center'}>
                            <img src={block.url} alt={block.alt || ''} style={{ width: block.width ? block.width + 'px' : '300px', maxWidth: '100%', borderRadius: 8, display: 'block', margin: block.align === 'center' ? '0 auto' : undefined, float: block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : undefined }} />
                          </Box>
                        );
                        return null;
                      })}
                    </Box>
                  )}
                  {pageEdit.type === 'webview' && pageEdit.url && (
                    <Box h="600px" borderWidth={1} borderRadius="md" overflow="hidden">
                      <iframe src={pageEdit.url} style={{ width: '100%', height: '100%', border: 'none' }} title="WebView náhled" />
                      <Text fontSize="xs" color="gray.500" mt={1}>Skryté elementy budou aplikovány v mobilní aplikaci.</Text>
                    </Box>
                  )}
                </Box>
                <Box position="absolute" top={0} left={0} w="100%" h="32px" bg="gray.200" borderBottom="1px solid #ccc" borderTopRadius="32px" />
              </Box>
              <HStack justify="flex-end" mt={4}>
                <Button colorScheme="blue" onClick={onSave}>
                  Uložit
                </Button>
                <Button onClick={onClose}>Zrušit</Button>
              </HStack>
            </Box>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PageEditModal; 