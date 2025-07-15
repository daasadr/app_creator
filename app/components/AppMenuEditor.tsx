import React from 'react';
import { VStack, Button } from '@chakra-ui/react';
import { AppMenuEditorProps } from '../types';
import PageListItem from './PageListItem';

const AppMenuEditor: React.FC<AppMenuEditorProps> = ({ pages, onChange, onEdit }) => {
  const handlePageChange = (idx: number, field: string, value: string) => {
    const newPages = [...pages];
    newPages[idx] = { ...newPages[idx], [field]: value };
    onChange(newPages);
  };
  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const newPages = [...pages];
    const [item] = newPages.splice(idx, 1);
    newPages.splice(idx - 1, 0, item);
    onChange(newPages);
  };
  const handleMoveDown = (idx: number) => {
    if (idx === pages.length - 1) return;
    const newPages = [...pages];
    const [item] = newPages.splice(idx, 1);
    newPages.splice(idx + 1, 0, item);
    onChange(newPages);
  };
  const handleDelete = (idx: number) => {
    onChange(pages.filter((_, i) => i !== idx));
  };
  const handleAddPage = () => {
    onChange([...pages, { title: '', type: 'content' }]);
  };
  return (
    <VStack align="stretch" spacing={2}>
      {pages.map((page, idx) => (
        <PageListItem
          key={idx}
          page={page}
          idx={idx}
          onChange={handlePageChange}
          onEdit={onEdit}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDelete={handleDelete}
          isFirst={idx === 0}
          isLast={idx === pages.length - 1}
        />
      ))}
      <Button onClick={handleAddPage} colorScheme="blue" variant="outline">
        Přidat stránku
      </Button>
    </VStack>
  );
};

export default AppMenuEditor; 