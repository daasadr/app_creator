import React, { useState } from 'react';
import { Box, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Input } from '@chakra-ui/react';
import { TableWidgetProps } from '../types';

const TableWidget: React.FC<TableWidgetProps> = ({ data, onChange }) => {
  const [editData, setEditData] = useState(data);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = editData.map((r, i) => i === row ? r.map((c, j) => j === col ? value : c) : r);
    setEditData(newData);
  };

  const addRow = () => setEditData([...editData, Array(editData[0]?.length || 2).fill('')]);
  const addCol = () => setEditData(editData.map(row => [...row, '']));

  const save = () => {
    onChange(editData);
    setIsModalOpen(false);
  };

  return (
    <Box border="1px solid #ccc" borderRadius="md" p={2} my={2} bg="gray.50">
      <Button size="xs" onClick={() => setIsModalOpen(true)} mb={2}>Upravit tabulku</Button>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Editace tabulky</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {editData.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>
                        <Input size="sm" value={cell} onChange={e => handleCellChange(i, j, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Button size="sm" mt={2} onClick={addRow}>Přidat řádek</Button>
            <Button size="sm" mt={2} ml={2} onClick={addCol}>Přidat sloupec</Button>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={save}>Uložit</Button>
            <Button onClick={() => setIsModalOpen(false)}>Zrušit</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TableWidget; 