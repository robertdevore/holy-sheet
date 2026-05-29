/**
 * CSV parse → serialize round-trip tests (HS-013).
 *
 * Verifies that parsing and then re-serializing CSV produces
 * semantically identical output across the full range of CSV features.
 */

import { describe, it, expect } from 'vitest';
import { parseCsv } from '../csv/parse';
import { serializeCsv } from '../csv/serialize';

const roundTrip = (input: string, delimiter?: string): string => {
  const parsed = parseCsv(input, delimiter);
  return serializeCsv(parsed.data, delimiter);
};

describe('CSV round-trip (HS-013)', () => {
  it('simple comma-delimited CSV round-trips identically', () => {
    const input = 'a,b,c\n1,2,3';
    expect(roundTrip(input)).toBe(input);
  });

  it('CSV with quoted fields round-trips correctly', () => {
    const input = '"a,b",c\n"d",e';
    const output = roundTrip(input);
    // Re-parsed output should be semantically identical
    const reParsed = parseCsv(output);
    expect(reParsed.data[0][0]).toBe('a,b');
    expect(reParsed.data[0][1]).toBe('c');
    expect(reParsed.data[1][0]).toBe('d');
    expect(reParsed.data[1][1]).toBe('e');
  });

  it('CSV with commas inside quoted cells round-trips', () => {
    const input = '"San Francisco, CA",USA\n"Austin, TX",USA';
    const output = roundTrip(input);
    const reParsed = parseCsv(output);
    expect(reParsed.data[0][0]).toBe('San Francisco, CA');
    expect(reParsed.data[1][0]).toBe('Austin, TX');
  });

  it('CSV with newlines inside quoted cells round-trips', () => {
    const input = '"Line 1\nLine 2",col2';
    const output = roundTrip(input);
    const reParsed = parseCsv(output);
    expect(reParsed.data[0][0]).toBe('Line 1\nLine 2');
    expect(reParsed.data[0][1]).toBe('col2');
  });

  it('CSV with escaped quotes inside cells round-trips', () => {
    const input = '"She said ""hello""",world';
    const output = roundTrip(input);
    const reParsed = parseCsv(output);
    expect(reParsed.data[0][0]).toBe('She said "hello"');
    expect(reParsed.data[0][1]).toBe('world');
  });

  it('CSV with semicolon delimiter round-trips with explicit delimiter', () => {
    const input = 'a;b;c\n1;2;3';
    const output = roundTrip(input, ';');
    expect(output).toBe(input);
  });

  it('CSV with tab delimiter serializes as comma by default', () => {
    const input = 'a\tb\tc\n1\t2\t3';
    const output = roundTrip(input);
    // Default serialize uses comma; verify data is correct
    const reParsed = parseCsv(output);
    expect(reParsed.data[0][0]).toBe('a');
    expect(reParsed.data[0][1]).toBe('b');
    expect(reParsed.data[0][2]).toBe('c');
  });

  it('empty CSV round-trips (empty string in → empty string out)', () => {
    const input = '';
    const output = roundTrip(input);
    expect(output).toBe('');
  });

  it('ragged rows are normalized on read and preserved on write', () => {
    const input = 'a,b,c\n1,2\nx,y,z';
    const parsed = parseCsv(input);
    // Parsed data should normalize to 3 columns
    expect(parsed.data[0].length).toBe(3);
    expect(parsed.data[1].length).toBe(3);
    expect(parsed.data[2].length).toBe(3);
    // Serialized output should have consistent column count
    const output = serializeCsv(parsed.data);
    const reParsed = parseCsv(output);
    expect(reParsed.data[0].length).toBe(3);
    expect(reParsed.data[1].length).toBe(3);
  });

  it('single-cell CSV round-trips', () => {
    const input = 'hello';
    const output = roundTrip(input);
    const reParsed = parseCsv(output);
    expect(reParsed.data[0][0]).toBe('hello');
  });

  it('single-column multi-row CSV round-trips', () => {
    const input = 'a\nb\nc';
    const output = roundTrip(input);
    const reParsed = parseCsv(output);
    expect(reParsed.data.length).toBe(3);
    expect(reParsed.data[0][0]).toBe('a');
    expect(reParsed.data[1][0]).toBe('b');
    expect(reParsed.data[2][0]).toBe('c');
  });

  it('CSV with blank rows preserved through round-trip', () => {
    const input = 'a,b,c\n\n1,2,3';
    const output = roundTrip(input);
    const reParsed = parseCsv(output);
    expect(reParsed.data.length).toBe(3);
    expect(reParsed.data[1]).toEqual(['', '', '']);
  });

  it('CSV with mixed quoting patterns round-trips', () => {
    const input = 'plain,"quoted,with,commas",also_plain\n1,"2,3",4';
    const reParsed = parseCsv(roundTrip(input));
    expect(reParsed.data[0][0]).toBe('plain');
    expect(reParsed.data[0][1]).toBe('quoted,with,commas');
    expect(reParsed.data[0][2]).toBe('also_plain');
    expect(reParsed.data[1][0]).toBe('1');
    expect(reParsed.data[1][1]).toBe('2,3');
    expect(reParsed.data[1][2]).toBe('4');
  });

  it('unicode content survives round-trip', () => {
    const input = 'name,emoji\nJosé,🙂\nMünchen,🌟';
    const reParsed = parseCsv(roundTrip(input));
    expect(reParsed.data[1][0]).toBe('José');
    expect(reParsed.data[1][1]).toBe('🙂');
    expect(reParsed.data[2][0]).toBe('München');
    expect(reParsed.data[2][1]).toBe('🌟');
  });
});
