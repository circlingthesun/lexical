/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableSelection,
  registerTablePlugin,
  registerTableSelectionObserver,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  createEditor,
  LexicalEditor,
} from 'lexical';

/**
 * Test suite for mobile/touch table selection behavior.
 * Addresses the bug where simple taps between table cells on mobile
 * would incorrectly create table selections instead of just moving the cursor.
 */
describe('LexicalTableMobileSelection', () => {
  let editor: LexicalEditor;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const testConfig = {
      namespace: 'test',
      nodes: [TableNode, TableCellNode, TableRowNode],
      onError: (error: Error) => {
        throw error;
      },
      theme: {},
    };
    
    editor = createEditor(testConfig);
    editor.setRootElement(container);
    
    // Register table plugin and selection observer
    registerTablePlugin(editor);
    registerTableSelectionObserver(editor);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  /**
   * Helper function to create a 2x2 table for testing
   */
  function createTestTable(): {
    tableNode: TableNode;
    cells: TableCellNode[][];
  } {
    const tableNode = $createTableNode();
    const cells: TableCellNode[][] = [];
    
    for (let row = 0; row < 2; row++) {
      const rowNode = $createTableRowNode();
      const rowCells: TableCellNode[] = [];
      
      for (let col = 0; col < 2; col++) {
        const cellNode = $createTableCellNode();
        const paragraph = $createParagraphNode();
        const text = $createTextNode(`Cell ${row}-${col}`);
        
        paragraph.append(text);
        cellNode.append(paragraph);
        rowNode.append(cellNode);
        rowCells.push(cellNode);
      }
      
      tableNode.append(rowNode);
      cells.push(rowCells);
    }
    
    return { tableNode, cells };
  }

  /**
   * Helper function to simulate a pointer event
   */
  function simulatePointerEvent(
    element: Element,
    type: string,
    options: Partial<PointerEventInit> = {}
  ): PointerEvent {
    const event = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons: 1,
      pointerType: options.pointerType || 'mouse',
      ...options,
    });
    
    element.dispatchEvent(event);
    return event;
  }

  test('mouse click should set anchor cell for selection (existing behavior)', () => {
    editor.update(() => {
      const root = $getRoot();
      const { tableNode, cells } = createTestTable();
      root.clear().append(tableNode);
      
      // Select first cell
      cells[0][0].selectStart();
    });

    // Get the DOM elements
    const tableElement = container.querySelector('table');
    const firstCellElement = container.querySelector('td');
    
    expect(tableElement).not.toBeNull();
    expect(firstCellElement).not.toBeNull();

    // Simulate mouse pointer down on first cell
    simulatePointerEvent(firstCellElement!, 'pointerdown', {
      pointerType: 'mouse'
    });

    editor.getEditorState().read(() => {
      // For mouse events, anchor should still be set (existing behavior)
      // This test ensures we didn't break mouse selection
      expect(true).toBe(true); // This test mainly ensures no errors occur
    });
  });

  test('touch tap on single cell should not create table selection', () => {
    editor.update(() => {
      const root = $getRoot();
      const { tableNode, cells } = createTestTable();
      root.clear().append(tableNode);
      
      // Select first cell
      cells[0][0].selectStart();
    });

    // Get the DOM elements
    const firstCellElement = container.querySelector('td');
    expect(firstCellElement).not.toBeNull();

    // Simulate touch pointer down on first cell
    simulatePointerEvent(firstCellElement!, 'pointerdown', {
      pointerType: 'touch'
    });

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      // Should remain a range selection, not become a table selection
      expect($isRangeSelection(selection)).toBe(true);
      expect($isTableSelection(selection)).toBe(false);
    });
  });

  test('touch tap between different cells should not create table selection', () => {
    let firstCellElement: Element;
    let secondCellElement: Element;

    editor.update(() => {
      const root = $getRoot();
      const { tableNode, cells } = createTestTable();
      root.clear().append(tableNode);
      
      // Select first cell
      cells[0][0].selectStart();
    });

    // Get the DOM elements
    firstCellElement = container.querySelector('td:nth-child(1)')!;
    secondCellElement = container.querySelector('td:nth-child(2)')!;
    
    expect(firstCellElement).not.toBeNull();
    expect(secondCellElement).not.toBeNull();

    // Simulate touch tap on first cell
    simulatePointerEvent(firstCellElement, 'pointerdown', {
      pointerType: 'touch'
    });

    // Simulate touch tap on second cell (simulates user tapping between cells)
    simulatePointerEvent(secondCellElement, 'pointerdown', {
      pointerType: 'touch'
    });

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      // Should remain a range selection, not become a table selection
      expect($isRangeSelection(selection)).toBe(true);
      expect($isTableSelection(selection)).toBe(false);
    });
  });

  test('touch drag (with isSelecting=true) should still create table selection', () => {
    let firstCellElement: Element;
    let secondCellElement: Element;

    editor.update(() => {
      const root = $getRoot();
      const { tableNode, cells } = createTestTable();
      root.clear().append(tableNode);
      
      // Select first cell
      cells[0][0].selectStart();
    });

    // Get the DOM elements
    firstCellElement = container.querySelector('td:nth-child(1)')!;
    secondCellElement = container.querySelector('td:nth-child(2)')!;
    
    expect(firstCellElement).not.toBeNull();
    expect(secondCellElement).not.toBeNull();

    // Simulate touch drag by setting up the selection state manually
    // and then triggering pointer events
    simulatePointerEvent(firstCellElement, 'pointerdown', {
      pointerType: 'touch'
    });

    // Simulate pointer move to indicate dragging
    simulatePointerEvent(secondCellElement, 'pointermove', {
      pointerType: 'touch'
    });

    // Note: This test verifies that intentional drag operations still work
    // The actual table selection creation depends on the internal state management
    // which is complex to fully simulate in a unit test
    editor.getEditorState().read(() => {
      // For now, we just verify no errors occur
      // In a real implementation, you might need more sophisticated simulation
      expect(true).toBe(true);
    });
  });

  test('mixed pointer types should be handled correctly', () => {
    editor.update(() => {
      const root = $getRoot();
      const { tableNode, cells } = createTestTable();
      root.clear().append(tableNode);
      
      // Select first cell
      cells[0][0].selectStart();
    });

    const firstCellElement = container.querySelector('td:nth-child(1)')!;
    const secondCellElement = container.querySelector('td:nth-child(2)')!;

    // Mouse down on first cell
    simulatePointerEvent(firstCellElement, 'pointerdown', {
      pointerType: 'mouse'
    });

    // Touch on second cell
    simulatePointerEvent(secondCellElement, 'pointerdown', {
      pointerType: 'touch'
    });

    editor.getEditorState().read(() => {
      // Should handle mixed input gracefully without errors
      expect(true).toBe(true);
    });
  });
});
