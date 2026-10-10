import { SpritePipe } from './sprite.pipe';
import { Pokemon } from '../../models/pokeapi.model';

function withSprites(dream: string | null, artwork: string | null, pixel: string | null): Pokemon {
  return {
    id: 1,
    name: 'test',
    height: 1,
    weight: 1,
    stats: [],
    types: [],
    sprites: {
      front_default: pixel,
      other: { dream_world: { front_default: dream }, 'official-artwork': { front_default: artwork } },
    },
  };
}

describe('SpritePipe', () => {
  const pipe = new SpritePipe();

  it('prefers the dream-world artwork', () => {
    expect(pipe.transform(withSprites('dream.svg', 'art.png', 'pixel.png'))).toBe('dream.svg');
  });

  it('falls back to official artwork, then to the pixel sprite', () => {
    expect(pipe.transform(withSprites(null, 'art.png', 'pixel.png'))).toBe('art.png');
    expect(pipe.transform(withSprites(null, null, 'pixel.png'))).toBe('pixel.png');
  });
});
