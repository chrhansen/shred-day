import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
}

interface SortableItemProps {
  id: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, label, enabled, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center justify-between p-2 border rounded-md bg-white shadow-sm"
    >
      <label htmlFor={id} className="flex items-center cursor-pointer flex-grow">
        <input
          type="checkbox"
          id={id}
          checked={enabled}
          onChange={() => {
            onToggle();
          }}
          onClick={(e) => e.stopPropagation()}
          className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        {label}
      </label>
      <div {...listeners} className="text-gray-400 cursor-grab p-2" aria-label="Drag handle">
        :::
      </div>
    </div>
  );
};

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({ columns, onColumnsChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleColumn = (id: string) => {
    const newColumns = columns.map(col =>
      col.id === id ? { ...col, enabled: !col.enabled } : col
    );
    onColumnsChange(newColumns);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(col => col.id === active.id);
      const newIndex = columns.findIndex(col => col.id === over.id);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-2">Customize Columns ({columns.filter(c => c.enabled).length} selected)</h3>
      <p className="text-sm text-muted-foreground mb-4">Select and drag-to-reorder columns for your CSV export</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map(col => col.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {columns.map(col => (
              <SortableItem
                key={col.id}
                id={col.id}
                label={col.label}
                enabled={col.enabled}
                onToggle={() => toggleColumn(col.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
