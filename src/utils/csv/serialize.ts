/**
 * CSV serialization utilities.
 */

/**
 * Serialize a 2D array into CSV format.
 */
export function serializeCsv(data: string[][], delimiter: string = ','): string {
  let lastRowWithData = -1;
  let lastColWithData = -1;
  let maxColsInGrid = 0;

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex] || [];
    maxColsInGrid = Math.max(maxColsInGrid, row.length);
  }

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex] || [];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex] || '';
      if (cell !== '') {
        lastRowWithData = Math.max(lastRowWithData, rowIndex);
        lastColWithData = Math.max(lastColWithData, colIndex);
      }
    }
  }

  if (lastRowWithData < 0 || lastColWithData < 0) {
    return '';
  }

  const preserveGridShape = true;
  const finalLastRow = preserveGridShape ? Math.max(0, data.length - 1) : lastRowWithData;
  const finalLastCol = preserveGridShape ? Math.max(0, maxColsInGrid - 1) : lastColWithData;

  const lines: string[] = [];

  for (let rowIndex = 0; rowIndex <= finalLastRow; rowIndex++) {
    const row = data[rowIndex] || [];
    const cells = row.map((cell) => {
      const needsQuoting =
        cell.includes(delimiter) ||
        cell.includes('"') ||
        cell.includes('\n') ||
        cell.includes('\r');

      if (needsQuoting) {
        const escaped = cell.replace(/"/g, '""');
        return `"${escaped}"`;
      }

      return cell;
    });

    while (cells.length < finalLastCol + 1) {
      cells.push('');
    }

    const trimmedCells = cells.slice(0, finalLastCol + 1);
    lines.push(trimmedCells.join(delimiter));
  }

  return lines.join('\n');
}
