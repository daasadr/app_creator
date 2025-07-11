import React, { useState } from 'react'
import {
  Box, VStack, FormLabel, Input, Button, HStack, Text, Grid, GridItem, FormControl, Select, Badge, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper
} from '@chakra-ui/react'
import type { PageImage } from '../types'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, } from 'firebase/storage'
import { storage } from '../lib/firebase'


function ImageManager({ images = [], onChange }: { images: PageImage[]; onChange: (images: PageImage[]) => void }) {
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const handleImageUpload = async () => {
    if (imageFiles.length === 0) return

    setUploadingImages(true)
    const newImages: PageImage[] = []

    for (const file of imageFiles) {
      try {
        
         if (!storage) {
           alert('Firebase ještě není inicializováno. Zkuste to za chvíli.')
          return
        }
         const fileRef = storageRef(storage, 'images/' + file.name + '-' + Date.now())
         await uploadBytes(fileRef, file)
         const url = await getDownloadURL(fileRef)
          newImages.push({
             url,
             alt: file.name,
             position: 'center',
             width: 100,
             margin: 10
            })
        
      } catch (error) {
        console.error('Chyba při nahrávání obrázku:', error)
        alert('Chyba při nahrávání obrázku: ' + file.name)
      }
    }

    onChange([...images, ...newImages])
    setImageFiles([])
    setUploadingImages(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files))
    }
  }

  const updateImage = (index: number, updates: Partial<PageImage>) => {
    const newImages = [...images]
    newImages[index] = { ...newImages[index], ...updates }
    onChange(newImages)
  }

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <VStack spacing={4} align="stretch">
      <Box>
        <FormLabel>Nahrát nové obrázky</FormLabel>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          mb={2}
        />
        {imageFiles.length > 0 && (
          <HStack>
            <Button size="sm" colorScheme="blue" onClick={handleImageUpload} isLoading={uploadingImages}>
              Nahrát {imageFiles.length} obrázků
            </Button>
            <Text fontSize="sm" color="gray.600">
              {imageFiles.map(f => f.name).join(', ')}
            </Text>
          </HStack>
        )}
      </Box>

      {images.length > 0 && (
        <Box>
          <FormLabel>Nahrané obrázky ({images.length})</FormLabel>
          <VStack spacing={3} align="stretch">
            {images.map((image, index) => (
              <Box key={index} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                <Grid templateColumns="1fr 2fr" gap={3}>
                  <GridItem>
                    <img
                      src={image.url}
                      alt={image.alt || 'Obrázek'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: 100,
                        borderRadius: 8,
                        border: '1px solid #ccc'
                      }}
                    />
                  </GridItem>
                  <GridItem>
                    <VStack spacing={2} align="stretch">
                      <FormControl size="sm">
                        <FormLabel fontSize="xs">Alt text</FormLabel>
                        <Input
                          size="sm"
                          value={image.alt || ''}
                          onChange={(e) => updateImage(index, { alt: e.target.value })}
                          placeholder="Popis obrázku"
                        />
                      </FormControl>

                      <FormControl size="sm">
                        <FormLabel fontSize="xs">Pozice</FormLabel>
                        <Select
                          size="sm"
                          value={image.position}
                          onChange={(e) => updateImage(index, { position: e.target.value as any })}
                        >
                          <option value="left">Vlevo</option>
                          <option value="center">Na střed</option>
                          <option value="right">Vpravo</option>
                          <option value="full">Plná šířka</option>
                        </Select>
                      </FormControl>

                      <HStack spacing={2}>
                        <FormControl size="sm">
                          <FormLabel fontSize="xs">Šířka (%)</FormLabel>
                          <NumberInput
                            size="sm"
                            min={10}
                            max={100}
                            value={image.width || 100}
                            onChange={(_, val) => updateImage(index, { width: val })}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl size="sm">
                          <FormLabel fontSize="xs">Okraje (px)</FormLabel>
                          <NumberInput
                            size="sm"
                            min={0}
                            max={50}
                            value={image.margin || 10}
                            onChange={(_, val) => updateImage(index, { margin: val })}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                      </HStack>

                      <HStack justify="space-between">
                        <Badge colorScheme="blue">{image.position}</Badge>
                        <Button size="xs" colorScheme="red" onClick={() => removeImage(index)}>
                          Smazat
                        </Button>
                      </HStack>
                    </VStack>
                  </GridItem>
                </Grid>
              </Box>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}

export default ImageManager