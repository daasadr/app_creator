import React, { useRef, useState, useEffect } from 'react';
import { Box, Input, Button, HStack } from '@chakra-ui/react';
import { storage } from '../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ImageBlockProps } from '../types';

const ImageBlock: React.FC<ImageBlockProps> = ({ block, onChange, onDelete }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Upload obrázku
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!storage) {
      alert('Firebase není inicializováno');
      return;
    }
    const fileRef = storageRef(storage, 'editor-images/' + file.name + '-' + Date.now());
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    onChange({ ...block, url });
  };

  // Resize obrázku
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setStartX(e.clientX);
    setStartWidth(imgRef.current?.width || 0);
    e.preventDefault();
    e.stopPropagation();
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!imgRef.current) return;
      const dx = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + dx);
      onChange({ ...block, width: newWidth });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, startX, startWidth]);

  return (
    <Box
      my={2}
      textAlign={
        block.align === 'left' || block.align === 'right' || block.align === 'center'
          ? block.align
          : 'center'
      }
      position="relative"
    >
      {block.url ? (
        <Box display="inline-block" position="relative">
          <img
            ref={imgRef}
            src={block.url}
            alt={block.alt || ''}
            style={{
              width: block.width ? block.width + 'px' : '300px',
              maxWidth: '100%',
              borderRadius: 8,
              display: 'block',
              margin: block.align === 'center' ? '0 auto' : undefined,
              float: block.align === 'left' ? 'left' : block.align === 'right' ? 'right' : undefined
            }}
          />
          {/* Resize handle */}
          <Box
            position="absolute"
            right={-8}
            bottom={-8}
            width={4}
            height={4}
            bg="blue.400"
            borderRadius="full"
            cursor="ew-resize"
            zIndex={10}
            onMouseDown={handleMouseDown}
            border="2px solid white"
            boxShadow="0 0 2px #007AFF"
          />
        </Box>
      ) : (
        <Input type="file" accept="image/*" onChange={handleUpload} />
      )}
      <HStack mt={2} spacing={2} justify="center">
        <Button size="xs" onClick={() => onChange({ ...block, align: 'left' })}>Vlevo</Button>
        <Button size="xs" onClick={() => onChange({ ...block, align: 'center' })}>Na střed</Button>
        <Button size="xs" onClick={() => onChange({ ...block, align: 'right' })}>Vpravo</Button>
        <Button size="xs" onClick={() => onChange({ ...block, align: 'full' })}>Plná šířka</Button>
        <Button size="xs" colorScheme="red" onClick={onDelete}>Smazat</Button>
      </HStack>
      <Input size="sm" mt={2} placeholder="Alt text" value={block.alt || ''} onChange={e => onChange({ ...block, alt: e.target.value })} />
    </Box>
  );
};

export default ImageBlock; 