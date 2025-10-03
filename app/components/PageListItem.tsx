import React from 'react';
import { Box, HStack, Input, Select, IconButton, Text, VStack } from '@chakra-ui/react';
import { PageListItemProps } from '../types';

const PageListItem: React.FC<PageListItemProps> = ({
  page,
  idx,
  onChange,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast
}) => {
  return (
    <Box p={2} borderWidth={1} borderRadius="md" bg="gray.50">
      <HStack>
          <Input value={page.title} onChange={e => onChange(idx, 'title', e.target.value)} placeholder="Název stránky" />
        <Select value={page.type} onChange={e => onChange(idx, 'type', e.target.value as any)} w="140px">
          <option value="content">Content</option>
          <option value="webview">WebView</option>
          <option value="login">Login</option>
          <option value="register">Register</option>
        </Select>
        {(page.type === 'content' || page.type === 'webview') && page.requireAuth && (
          <Box px={2} py={1} bg="yellow.100" borderRadius="sm" border="1px solid" borderColor="yellow.300">
            <Text fontSize="xs" color="yellow.800" fontWeight="bold">🔐 Auth</Text>
          </Box>
        )}
        <IconButton aria-label="Upravit" icon={<span>✏️</span>} onClick={() => onEdit(idx)} />
        <IconButton aria-label="Nahoru" icon={<span>↑</span>} isDisabled={isFirst} onClick={() => onMoveUp(idx)} />
        <IconButton aria-label="Dolů" icon={<span>↓</span>} isDisabled={isLast} onClick={() => onMoveDown(idx)} />
        <IconButton aria-label="Smazat" icon={<span>🗑️</span>} onClick={() => onDelete(idx)} />
      </HStack>
      {/* Inline náhled stránky */}
      {page.type === 'content' && (
        <Box mt={2} p={2} bg="white" borderRadius="md">
          <Text color="gray.600" fontSize="sm" fontWeight="bold">{page.title}</Text>
          <Box 
            mt={1} 
            dangerouslySetInnerHTML={{ 
              __html: page.richContent || page.content || '<i>Žádný obsah</i>' 
            }}
            style={{ 
              fontSize: '12px', 
              lineHeight: '1.3',
              maxHeight: '100px',
              overflow: 'hidden'
            }}
          />
          {page.images && page.images.length > 0 && (
            <HStack mt={1} spacing={1}>
              <Text fontSize="xs" color="gray.500">Obrázky: {page.images.length}</Text>
              {page.images.slice(0, 3).map((img, i) => (
                <Box key={i} w="20px" h="20px" borderRadius="sm" overflow="hidden">
                  <img 
                    src={img.url} 
                    alt={img.alt || 'Obrázek'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              ))}
              {page.images.length > 3 && (
                <Text fontSize="xs" color="gray.500">+{page.images.length - 3}</Text>
              )}
            </HStack>
          )}
        </Box>
      )}
      {page.type === 'webview' && (
        <Box mt={2} p={2} bg="white" borderRadius="md">
          <Text color="gray.600">URL: {page.url || <i>Žádná URL</i>}</Text>
          <Text color="gray.600">Skryté elementy: {page.hiddenSelectors?.join(', ') || <i>Žádné</i>}</Text>
          {page.offlineContent && (
            <Text color="green.600" fontSize="sm">✓ Offline obsah nastaven</Text>
          )}
          {page.offlineTitle && (
            <Text color="green.600" fontSize="sm">✓ Offline nadpis: {page.offlineTitle}</Text>
          )}
        </Box>
      )}
      {(page.type === 'login' || page.type === 'register') && (
        <Box mt={2} p={2} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
          <Text color="blue.600" fontSize="sm" fontWeight="bold">
            🔐 {page.type === 'login' ? 'Přihlašovací' : 'Registrační'} {page.type === 'login' ? 'stránka' : 'stránka'}
          </Text>
          <Text color="blue.500" fontSize="sm">
            Tato stránka bude použita pro {page.type === 'login' ? 'přihlášení' : 'registraci'} uživatelů aplikace
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default PageListItem; 