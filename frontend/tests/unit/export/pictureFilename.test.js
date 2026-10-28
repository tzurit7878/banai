import { describe, expect, it } from 'vitest';
import { pictureFilename } from '../../../src/export/exportDialog.js';

const design = (width, height, depth) => ({ dimensions: { width, height, depth } });

describe('pictureFilename', () => {
  it('names the picture after the overall size in cm', () => {
    expect(pictureFilename(design(2000, 2400, 600))).toBe('banai-200x240x60.png');
  });

  it('keeps a decimal only when the size has one', () => {
    expect(pictureFilename(design(2005, 2400, 585))).toBe('banai-200.5x240x58.5.png');
  });
});
