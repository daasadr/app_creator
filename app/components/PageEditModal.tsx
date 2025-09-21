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
                  
                  {/* Offline obsah pro webview */}
                  <FormControl>
                    <FormLabel>Offline obsah (HTML)</FormLabel>
                    <Textarea 
                      value={pageEdit.offlineContent || ''} 
                      onChange={e => setPageEdit({ ...pageEdit, offlineContent: e.target.value })}
                      placeholder="HTML obsah, který se zobrazí když není internet..."
                      rows={6}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Tento obsah se zobrazí místo webview když aplikace není online.
                    </Text>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Nadpis pro offline režim</FormLabel>
                    <Input 
                      value={pageEdit.offlineTitle || ''} 
                      onChange={e => setPageEdit({ ...pageEdit, offlineTitle: e.target.value })}
                      placeholder="Nadpis pro offline obsah (volitelné)"
                    />
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
                        const getBlockStyle = (block: any) => {
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

                        if (block.type === 'text') return (
                          <Box key={idx} style={getBlockStyle(block)}>
                            {block.content}
                          </Box>
                        );
                        
                        if (block.type === 'table') return (
                          <Box key={idx} style={getBlockStyle(block)}>
                            <Box as="table" border="1px solid #ccc" borderRadius="md" w="100%" style={{ borderCollapse: 'collapse' }}>
                              <tbody>{block.data.map((row: any, i: number) => <tr key={i}>{row.map((cell: any, j: number) => <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>)}</tr>)}</tbody>
                            </Box>
                          </Box>
                        );
                        
                        if (block.type === 'image') return (
                          <Box key={idx} style={getBlockStyle(block)}>
                            <Box textAlign={block.align === 'left' || block.align === 'right' || block.align === 'center' ? block.align : 'center'}>
                              <img src={block.url} alt={block.alt || ''} style={{ width: block.width ? block.width + 'px' : '300px', maxWidth: '100%', borderRadius: 8, display: 'block', margin: block.align === 'center' ? '0 auto' : undefined, float: block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : undefined }} />
                            </Box>
                          </Box>
                        );

                        if (block.type === 'button') {
                          const blockStyle = block.style || {}
                          const buttonStyle = {
                            ...getBlockStyle(block),
                            padding: `${blockStyle.padding || 12}px ${blockStyle.padding || 24}px`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            transform: 'translateY(0)',
                            ...(blockStyle.plasticEffect && {
                              background: 'linear-gradient(145deg, #e6e6e6, #ffffff)',
                              boxShadow: '5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff'
                            })
                          }
                          
                          return (
                            <Box key={idx} style={{ margin: `${blockStyle.margin || 8}px` }}>
                              <button
                                style={buttonStyle}
                                onClick={() => {
                                  if (block.url) {
                                    window.open(block.url, '_blank')
                                  } else if (block.action) {
                                    console.log('Button action:', block.action)
                                  }
                                }}
                              >
                                {block.text || 'Tlačítko'}
                              </button>
                            </Box>
                          )
                        }

                        if (block.type === 'mixed') {
                          const content = block.content as any
                          const blockStyle = block.style || {}
                          
                          return (
                            <Box key={idx} style={getBlockStyle(block)}>
                              <VStack spacing={3} align="stretch">
                                {content.text && (
                                  <Box>{content.text}</Box>
                                )}
                                {content.image && content.image.url && (
                                  <Box textAlign={content.image.align === 'left' || content.image.align === 'right' || content.image.align === 'center' ? content.image.align : 'center'}>
                                    <img 
                                      src={content.image.url} 
                                      alt={content.image.alt || ''} 
                                      style={{ 
                                        width: content.image.width ? content.image.width + 'px' : '300px', 
                                        maxWidth: '100%', 
                                        borderRadius: 8, 
                                        display: 'block', 
                                        margin: content.image.align === 'center' ? '0 auto' : undefined, 
                                        float: content.image.align === 'left' ? 'left' : content.image.align === 'right' ? 'right' : undefined 
                                      }} 
                                    />
                                  </Box>
                                )}
                                {content.button && content.button.text && (
                                  <Box textAlign="center">
                                    <Button
                                      colorScheme="blue"
                                      onClick={() => {
                                        if (content.button.url) {
                                          window.open(content.button.url, '_blank')
                                        }
                                      }}
                                      onMouseDown={(e) => {
                                        if (blockStyle.plasticEffect) {
                                          e.currentTarget.style.transform = 'scale(0.95)'
                                        }
                                      }}
                                      onMouseUp={(e) => {
                                        if (blockStyle.plasticEffect) {
                                          e.currentTarget.style.transform = 'scale(1)'
                                        }
                                      }}
                                      style={{
                                        transition: 'transform 0.1s ease',
                                        boxShadow: blockStyle.plasticEffect ? '0 4px 8px rgba(0,0,0,0.2)' : undefined
                                      }}
                                    >
                                      {content.button.text}
                                    </Button>
                                  </Box>
                                )}
                                {content.table && content.table.data && (
                                  <Box 
                                    as="table" 
                                    border="1px solid #ccc" 
                                    borderRadius="md" 
                                    w="100%" 
                                    style={{ 
                                      borderCollapse: 'collapse',
                                      tableLayout: 'fixed',
                                      minWidth: '100%'
                                    }}
                                  >
                                    <tbody>
                                      {content.table.data.map((row: any, i: number) => (
                                        <tr key={i}>
                                          {row.map((cell: any, j: number) => (
                                            <td 
                                              key={j} 
                                              style={{ 
                                                border: '1px solid #ccc', 
                                                padding: '8px 4px',
                                                wordWrap: 'break-word',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: `${100 / row.length}%`,
                                                width: `${100 / row.length}%`
                                              }}
                                            >
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Box>
                                )}
                              </VStack>
                            </Box>
                          )
                        }
                        
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