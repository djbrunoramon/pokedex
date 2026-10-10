import { TypeNamePipe } from './type-name.pipe';

describe('TypeNamePipe', () => {
  const pipe = new TypeNamePipe();

  it('translates the types to Portuguese', () => {
    expect(pipe.transform('fire')).toBe('Fogo');
    expect(pipe.transform('water')).toBe('Água');
    expect(pipe.transform('fairy')).toBe('Fada');
  });

  it('keeps types it does not know as they are', () => {
    expect(pipe.transform('stellar')).toBe('stellar');
  });
});
