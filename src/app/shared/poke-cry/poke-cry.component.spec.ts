import type { MockInstance } from 'vitest';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PokeCryComponent } from './poke-cry.component';

describe('PokeCryComponent', () => {
  let play: MockInstance<HTMLMediaElement['play']>;

  beforeEach(() => {
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  function render(url: string | null, canPlay = 'probably') {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue(canPlay as CanPlayTypeResult);
    const fixture = TestBed.createComponent(PokeCryComponent);
    fixture.componentRef.setInput('url', url);
    fixture.componentRef.setInput('name', 'pikachu');
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick(); // the format check runs after the first render
    fixture.detectChanges();
    return fixture;
  }

  it('plays the cry', () => {
    const fixture = render('https://cries/25.ogg');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Ouvir o som de pikachu');

    button.click();
    expect(play).toHaveBeenCalled();
    expect((play.mock.contexts[0] as HTMLAudioElement).src).toBe('https://cries/25.ogg');
  });

  it('has no button where Ogg does not play, or when there is no recording', () => {
    expect(render('https://cries/25.ogg', '').nativeElement.querySelector('button')).toBeNull();
    expect(render(null).nativeElement.querySelector('button')).toBeNull();
  });

  it('says so when the sound cannot be played', async () => {
    play.mockRejectedValue(new Error('NotAllowedError'));
    const fixture = render('https://cries/25.ogg');
    fixture.nativeElement.querySelector('button').click();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toBe('Não foi possível tocar o som.');
  });
});
