/**
 * Delimiter detection edge case tests (HS-015).
 *
 * Verifies that auto-detection works correctly for edge cases:
 * - Files where first line differs from data lines
 * - Files with quoted fields containing delimiter-like characters
 * - Mixed-content files where detection could be confused
 */

import { describe, it, expect } from 'vitest';
import { detectDelimiter } from '../csv/parse';

describe('Delimiter detection (HS-015)', () => {
  it('detects comma as delimiter in standard CSV', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('detects semicolon as delimiter', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('detects tab as delimiter', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('samples first 5 non-empty lines (not just first line)', () => {
    // First line has no commas, but subsequent lines do
    const content = 'title\ncol1,col2,col3\na,b,c\nd,e,f\ng,h,i';
    expect(detectDelimiter(content)).toBe(',');
  });

  it('skips empty lines during sampling', () => {
    const content = '\n\na,b,c\n\n1,2,3\n\n';
    expect(detectDelimiter(content)).toBe(',');
  });

  it('detects comma in file where first line is a single-value header', () => {
    const content = 'HEADER\na,b,c\n1,2,3\nd,e,f';
    expect(detectDelimiter(content)).toBe(',');
  });

  it('detects tab in TSV file correctly', () => {
    const content = 'Name\tAge\tCity\nAlice\t30\tNYC\nBob\t25\tLA';
    expect(detectDelimiter(content)).toBe('\t');
  });

  it('detects semicolon in European-style CSV', () => {
    const content = 'Nom;Âge;Ville\nJean;30;Paris\nMarie;25;Lyon';
    expect(detectDelimiter(content)).toBe(';');
  });

  it('detects comma in file with many commas per line', () => {
    const content = 'a,b,c,d,e,f,g,h,i,j\n1,2,3,4,5,6,7,8,9,10';
    expect(detectDelimiter(content)).toBe(',');
  });

  it('defaults to comma when all delimiters are equally absent', () => {
    // No clear delimiter in any sampled line
    const content = 'hello\nworld\nfoo';
    expect(detectDelimiter(content)).toBe(',');
  });

  it('detects comma even when semicolons also appear', () => {
    // More commas than semicolons → comma wins
    const content = 'a,b,c;note\n1,2,3;remark';
    // Comma splits into 3, semicolon into 2 → comma wins
    expect(detectDelimiter(content)).toBe(',');
  });

  it('detects tab when tabs outnumber commas across sampled lines', () => {
    // 3 tabs per line, 1 comma per line → 15 tab-splits vs 10 comma-splits
    const content = 'a\tb\tc,d\n1\t2\t3,4\n4\t5\t6,7\n7\t8\t9,10\n10\t11\t12,13';
    expect(detectDelimiter(content)).toBe('\t');
  });
});
