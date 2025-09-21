import React from 'react';
import { Box, Heading, VStack, Text } from '@chakra-ui/react';
import { PagePreviewProps } from '../types';

const PagePreview: React.FC<PagePreviewProps> = ({ page, style, className }) => {
  return (
    <Box
      className={className}
      style={style}
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
        {page.type === 'content' && (
          <Box>
            <Heading size="md" mb={2}>{page.title}</Heading>
            {/* Zobrazení obrázků */}
            {page.images && page.images.length > 0 && (
              <VStack spacing={2} mb={3} align="stretch">
                {page.images.map((img, idx) => (
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
            {/* Zobrazení rich contentu nebo bloků */}
            {page.blocks && Array.isArray(page.blocks) ? (
              page.blocks.map((block, idx) => {
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
                        {block.data.map((row: any, i: number) => (
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
                        onMouseDown={(e) => {
                          if (blockStyle.plasticEffect) {
                            e.currentTarget.style.transform = 'translateY(2px)'
                            e.currentTarget.style.boxShadow = '2px 2px 5px #d1d1d1, -2px -2px 5px #ffffff'
                          }
                        }}
                        onMouseUp={(e) => {
                          if (blockStyle.plasticEffect) {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff'
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
              })
            ) : (
              <Box 
                dangerouslySetInnerHTML={{ 
                  __html: page.richContent || page.content || '<i>Žádný obsah</i>' 
                }}
                style={{
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              />
            )}
          </Box>
        )}
        {page.type === 'webview' && page.url && (
          <Box h="600px" borderWidth={1} borderRadius="md" overflow="hidden">
            <iframe
              src={page.url}
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
  );
};

export default PagePreview; 