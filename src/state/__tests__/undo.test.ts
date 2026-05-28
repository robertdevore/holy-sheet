import { describe, it, expect } from 'vitest';
import {
  UndoStack,
  createCellEditCommand,
  createPasteCommand,
  createInsertRowCommand,
  createDeleteRowCommand,
  createInsertColumnCommand,
  createDeleteColumnCommand,
  createMoveRowCommand,
  createMoveColumnCommand,
} from '../undo';

function makeGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => `${r},${c}`),
  );
}

describe('UndoStack', () => {
  it('executes a command and allows undo', () => {
    const stack = new UndoStack();
    const data = makeGrid(2, 2);
    let current = data;

    const cmd = createCellEditCommand(current, 0, 0, 'new', '0,0', (d) => {
      current = d;
    });
    stack.execute(cmd);
    expect(current[0][0]).toBe('new');

    stack.undo();
    expect(current[0][0]).toBe('0,0');
  });

  it('redo re-applies after undo', () => {
    const stack = new UndoStack();
    const data = makeGrid(2, 2);
    let current = data;

    const cmd = createCellEditCommand(current, 0, 0, 'new', '0,0', (d) => {
      current = d;
    });
    stack.execute(cmd);
    stack.undo();
    stack.redo();
    expect(current[0][0]).toBe('new');
  });

  it('clears redo stack on new execute', () => {
    const stack = new UndoStack();
    const data = makeGrid(2, 2);
    let current = data;

    stack.execute(createCellEditCommand(current, 0, 0, 'a', '0,0', (d) => { current = d; }));
    stack.undo();
    expect(stack.canRedo()).toBe(true);

    stack.execute(createCellEditCommand(current, 0, 0, 'b', '0,0', (d) => { current = d; }));
    expect(stack.canRedo()).toBe(false);
  });

  it('limits stack to max size', () => {
    const stack = new UndoStack();
    const data = makeGrid(2, 2);
    let current = data;

    // Fill stack beyond max (100)
    for (let i = 0; i < 105; i++) {
      stack.execute(
        createCellEditCommand(current, 0, 0, `${i}`, `${i - 1}`, (d) => {
          current = d;
        }),
      );
    }
    // Oldest items should be dropped
    let undoCount = 0;
    while (stack.undo()) undoCount++;
    expect(undoCount).toBeLessThanOrEqual(100);
  });

  it('notifies onChange callback', () => {
    const stack = new UndoStack();
    let notified = false;
    stack.setOnChange(() => { notified = true; });

    const data = makeGrid(1, 1);
    stack.execute(createCellEditCommand(data, 0, 0, 'x', '0,0', () => {}));
    expect(notified).toBe(true);

    notified = false;
    stack.undo();
    expect(notified).toBe(true);

    notified = false;
    stack.clear();
    expect(notified).toBe(true);
  });
});

describe('createCellEditCommand', () => {
  it('changes cell value and undoes', () => {
    const data = makeGrid(2, 2);
    let current = data;
    const cmd = createCellEditCommand(current, 1, 1, 'new', '1,1', (d) => { current = d; });

    cmd.execute();
    expect(current[1][1]).toBe('new');

    cmd.undo();
    expect(current[1][1]).toBe('1,1');
  });
});

describe('createPasteCommand', () => {
  it('pastes data and undoes', () => {
    const data = makeGrid(3, 3);
    let current = data;
    const paste = [['x', 'y'], ['z', 'w']];
    const cmd = createPasteCommand(current, 0, 0, paste, (d) => { current = d; });

    cmd.execute();
    expect(current[0][0]).toBe('x');
    expect(current[0][1]).toBe('y');
    expect(current[1][0]).toBe('z');

    cmd.undo();
    expect(current[0][0]).toBe('0,0');
    expect(current[0][1]).toBe('0,1');
    expect(current[1][0]).toBe('1,0');
  });

  it('only captures changed cells for undo', () => {
    const data = [['keep', 'change'], ['stay', 'also']];
    let current = data;
    const paste = [['keep', 'CHANGED'], ['stay', 'CHANGED']];
    const cmd = createPasteCommand(current, 0, 0, paste, (d) => { current = d; });

    cmd.execute();
    cmd.undo();
    expect(current).toEqual([['keep', 'change'], ['stay', 'also']]);
  });
});

describe('createInsertRowCommand', () => {
  it('inserts row', () => {
    const data = makeGrid(2, 2);
    let current = data;
    const cmd = createInsertRowCommand(current, 1, (d) => { current = d; });

    cmd.execute();
    expect(current.length).toBe(3);
  });
});

describe('createDeleteRowCommand', () => {
  it('deletes row', () => {
    const data = makeGrid(3, 2);
    let current = data;
    const cmd = createDeleteRowCommand(current, 1, (d) => { current = d; });

    cmd.execute();
    expect(current.length).toBe(2);
  });
});

describe('createInsertColumnCommand', () => {
  it('inserts column', () => {
    const data = makeGrid(2, 2);
    let current = data;
    const cmd = createInsertColumnCommand(current, 1, (d) => { current = d; });

    cmd.execute();
    expect(current[0].length).toBe(3);
  });
});

describe('createDeleteColumnCommand', () => {
  it('deletes column', () => {
    const data = makeGrid(2, 3);
    let current = data;
    const cmd = createDeleteColumnCommand(current, 1, (d) => { current = d; });

    cmd.execute();
    expect(current[0].length).toBe(2);
  });
});

describe('createMoveRowCommand', () => {
  it('moves row from 0 to 2', () => {
    const data = makeGrid(3, 2);
    let current = data;
    const cmd = createMoveRowCommand(current, 0, 2, (d) => { current = d; });

    cmd.execute();
    // Row 0 moves to position 1 (normalized: fromIndex < toIndex → toIndex - 1)
    expect(current[0][0]).toBe('1,0');
    expect(current[1][0]).toBe('0,0');
    expect(current[2][0]).toBe('2,0');
  });
});

describe('createMoveColumnCommand', () => {
  it('moves column from 0 to 2', () => {
    const data = makeGrid(2, 3);
    let current = data;
    const cmd = createMoveColumnCommand(current, 0, 2, (d) => { current = d; });

    cmd.execute();
    // Col 0 moves to position 1 (normalized)
    expect(current[0][0]).toBe('0,1');
    expect(current[0][1]).toBe('0,0');
    expect(current[0][2]).toBe('0,2');
  });
});
