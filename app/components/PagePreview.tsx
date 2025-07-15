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