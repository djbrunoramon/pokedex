import { TestBed } from '@angular/core/testing';

import { PokeShareComponent } from './poke-share.component';

describe('PokeShareComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  function render() {
    const fixture = TestBed.createComponent(PokeShareComponent);
    fixture.componentRef.setInput('title', 'Pikachu | Pokédex');
    fixture.componentRef.setInput('text', 'Pikachu (#025)');
    fixture.componentRef.setInput('path', '/details/25');
    fixture.detectChanges();
    return fixture;
  }

  async function click(fixture: ReturnType<typeof render>) {
    fixture.nativeElement.querySelector('button').click();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  it('opens the share sheet with the public url', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share, canShare: () => true });
    await click(render());
    expect(share).toHaveBeenCalledWith({
      title: 'Pikachu | Pokédex',
      text: 'Pikachu (#025)',
      url: 'https://pokedex.mocah.com.br/details/25',
    });
  });

  it('copies the link where there is no share sheet, and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const fixture = render();
    await click(fixture);
    expect(writeText).toHaveBeenCalledWith('https://pokedex.mocah.com.br/details/25');
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toBe('Link copiado!');
  });

  it('stays quiet when the user closes the share sheet', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('', 'AbortError')) });
    const fixture = render();
    await click(fixture);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toBe('');
  });
});
