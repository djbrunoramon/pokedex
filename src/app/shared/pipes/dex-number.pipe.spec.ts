import { DexNumberPipe } from './dex-number.pipe';

describe('DexNumberPipe', () => {
  const pipe = new DexNumberPipe();

  it('pads ids to three digits', () => {
    expect(pipe.transform(1)).toBe('#001');
    expect(pipe.transform(25)).toBe('#025');
  });

  it('keeps ids with three or more digits as they are', () => {
    expect(pipe.transform(100)).toBe('#100');
    expect(pipe.transform(1025)).toBe('#1025');
  });
});
