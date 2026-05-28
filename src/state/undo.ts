/**
 * Undo/Redo system for grid operations
 */

export interface Command {
  execute: () => void;
  undo: () => void;
  description?: string;
}

export class UndoStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize: number = 100;
  private onChange: (() => void) | null = null;

  /** Register a callback invoked on every stack mutation (execute, undo, redo, clear). */
  setOnChange(callback: () => void): void {
    this.onChange = callback;
  }

  private notify(): void {
    if (this.onChange) {
      this.onChange();
    }
  }

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.notify();
  }

  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }

    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    this.notify();

    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    const command = this.redoStack.pop()!;
    command.execute();
    this.undoStack.push(command);
    this.notify();

    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}

/**
 * Create a command for cell edit
 */
export function createCellEditCommand(
  data: string[][],
  row: number,
  col: number,
  newValue: string,
  oldValue: string,
  onChange: (newData: string[][]) => void,
): Command {
  return {
    execute: () => {
      const newData = data.map((r) => [...r]);
      newData[row][col] = newValue;
      onChange(newData);
    },
    undo: () => {
      const newData = data.map((r) => [...r]);
      newData[row][col] = oldValue;
      onChange(newData);
    },
    description: `Edit cell ${row},${col}`,
  };
}

/**
 * Create a command for paste operation
 */
export function createPasteCommand(
  data: string[][],
  startRow: number,
  startCol: number,
  pastedData: string[][],
  onChange: (newData: string[][]) => void,
): Command {
  // Capture old values only for cells that actually change
  const oldValues: Array<{ row: number; col: number; value: string }> = [];
  for (let r = 0; r < pastedData.length; r++) {
    for (let c = 0; c < pastedData[r].length; c++) {
      const row = startRow + r;
      const col = startCol + c;
      const oldVal = data[row]?.[col] || '';
      const newVal = pastedData[r][c];
      if (oldVal !== newVal) {
        oldValues.push({ row, col, value: oldVal });
      }
    }
  }

  return {
    execute: () => {
      const newData = data.map((r) => [...r]);
      for (let r = 0; r < pastedData.length; r++) {
        for (let c = 0; c < pastedData[r].length; c++) {
          const row = startRow + r;
          const col = startCol + c;
          if (row < newData.length && col < newData[row].length) {
            newData[row][col] = pastedData[r][c];
          }
        }
      }
      onChange(newData);
    },
    undo: () => {
      const newData = data.map((r) => [...r]);
      for (const { row, col, value } of oldValues) {
        if (row < newData.length && col < newData[row].length) {
          newData[row][col] = value;
        }
      }
      onChange(newData);
    },
    description: 'Paste',
  };
}

/**
 * Create a command for row insertion
 */
export function createInsertRowCommand(
  data: string[][],
  rowIndex: number,
  onChange: (newData: string[][]) => void,
): Command {
  const colCount = data[0]?.length || 10;

  return {
    execute: () => {
      const newData = [...data];
      newData.splice(rowIndex, 0, Array(colCount).fill(''));
      onChange(newData);
    },
    undo: () => {
      const newData = [...data];
      newData.splice(rowIndex, 1);
      onChange(newData);
    },
    description: `Insert row at ${rowIndex}`,
  };
}

/**
 * Create a command for row deletion
 */
export function createDeleteRowCommand(
  data: string[][],
  rowIndex: number,
  onChange: (newData: string[][]) => void,
): Command {
  const deletedRow = [...data[rowIndex]];

  return {
    execute: () => {
      const newData = [...data];
      newData.splice(rowIndex, 1);
      onChange(newData);
    },
    undo: () => {
      const newData = [...data];
      newData.splice(rowIndex, 0, deletedRow);
      onChange(newData);
    },
    description: `Delete row ${rowIndex}`,
  };
}

/**
 * Create a command for column insertion
 */
export function createInsertColumnCommand(
  data: string[][],
  colIndex: number,
  onChange: (newData: string[][]) => void,
): Command {
  return {
    execute: () => {
      const newData = data.map((row) => {
        const newRow = [...row];
        newRow.splice(colIndex, 0, '');
        return newRow;
      });
      onChange(newData);
    },
    undo: () => {
      const newData = data.map((row) => {
        const newRow = [...row];
        newRow.splice(colIndex, 1);
        return newRow;
      });
      onChange(newData);
    },
    description: `Insert column at ${colIndex}`,
  };
}

/**
 * Create a command for column deletion
 */
export function createDeleteColumnCommand(
  data: string[][],
  colIndex: number,
  onChange: (newData: string[][]) => void,
): Command {
  const deletedColumn = data.map((row) => row[colIndex]);

  return {
    execute: () => {
      const newData = data.map((row) => {
        const newRow = [...row];
        newRow.splice(colIndex, 1);
        return newRow;
      });
      onChange(newData);
    },
    undo: () => {
      const newData = data.map((row, rowIndex) => {
        const newRow = [...row];
        newRow.splice(colIndex, 0, deletedColumn[rowIndex]);
        return newRow;
      });
      onChange(newData);
    },
    description: `Delete column ${colIndex}`,
  };
}

/**
 * Create a command for row reordering
 */
export function createMoveRowCommand(
  data: string[][],
  fromIndex: number,
  toIndex: number,
  onChange: (newData: string[][]) => void,
): Command {
  const normalizedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;

  const moveRow = (
    source: string[][],
    sourceIndex: number,
    destinationIndex: number,
  ): string[][] => {
    const nextData = source.map((row) => [...row]);
    const row = nextData.splice(sourceIndex, 1)[0];
    nextData.splice(destinationIndex, 0, row);
    return nextData;
  };

  return {
    execute: () => {
      onChange(moveRow(data, fromIndex, normalizedToIndex));
    },
    undo: () => {
      onChange(moveRow(moveRow(data, fromIndex, normalizedToIndex), normalizedToIndex, fromIndex));
    },
    description: `Move row ${fromIndex} to ${toIndex}`,
  };
}

/**
 * Create a command for column reordering
 */
export function createMoveColumnCommand(
  data: string[][],
  fromIndex: number,
  toIndex: number,
  onChange: (newData: string[][]) => void,
): Command {
  const normalizedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;

  const moveColumn = (
    source: string[][],
    sourceIndex: number,
    destinationIndex: number,
  ): string[][] => {
    return source.map((row) => {
      const nextRow = [...row];
      const value = nextRow.splice(sourceIndex, 1)[0];
      nextRow.splice(destinationIndex, 0, value);
      return nextRow;
    });
  };

  return {
    execute: () => {
      onChange(moveColumn(data, fromIndex, normalizedToIndex));
    },
    undo: () => {
      onChange(
        moveColumn(moveColumn(data, fromIndex, normalizedToIndex), normalizedToIndex, fromIndex),
      );
    },
    description: `Move column ${fromIndex} to ${toIndex}`,
  };
}
