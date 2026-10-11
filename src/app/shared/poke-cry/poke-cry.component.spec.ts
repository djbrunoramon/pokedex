import type { MockInstance } from 'vitest';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PokeCryComponent } from './poke-cry.component';

describe('PokeCryComponent', () => {
  let play: MockInstance<HTMLMediaElement['play']>;

  beforeEach(() => {
    localStorage.clear();
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

  it('plays the cry at a low volume by default (25%)', () => {
    const fixture = render('https://cries/25.ogg');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Ouvir o som de pikachu');

    button.click();
    expect(play).toHaveBeenCalled();
    const audio = play.mock.contexts[0] as HTMLAudioElement;
    expect(audio.src).toBe('https://cries/25.ogg');
    expect(audio.volume).toBe(0.25);
  });

  it('has a labelled volume slider whose value is stored and used, even mid-cry', () => {
    const fixture = render('https://cries/25.ogg');
    const el: HTMLElement = fixture.nativeElement;
    const slider = el.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(slider.getAttribute('aria-label')).toBe('Volume dos sons');
    expect(el.querySelector('label.volume')?.textContent).toContain('Volume');
    expect(slider.value).toBe('25');
    expect(slider.getAttribute('aria-valuetext')).toBe('25%');

    el.querySelector('button')!.click();
    const audio = play.mock.contexts[0] as HTMLAudioElement;

    slider.value = '70';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(localStorage.getItem('pokedex:volume')).toBe('70');
    expect(slider.getAttribute('aria-valuetext')).toBe('70%');
    expect(audio.volume).toBe(0.7);
  });

  it('starts from the stored volume', () => {
    localStorage.setItem('pokedex:volume', '40');
    const fixture = render('https://cries/25.ogg');
    expect(fixture.nativeElement.querySelector('input[type="range"]').value).toBe('40');
    fixture.nativeElement.querySelector('button').click();
    expect((play.mock.contexts[0] as HTMLAudioElement).volume).toBe(0.4);
  });

  it('plays nothing at volume 0, and says so', () => {
    localStorage.setItem('pokedex:volume', '0');
    const fixture = render('https://cries/25.ogg');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button span')?.textContent).toBe('🔇');
    expect(el.querySelector('input[type="range"]')?.getAttribute('aria-valuetext')).toBe('Sem som');

    el.querySelector('button')!.click();
    fixture.detectChanges();
    expect(play).not.toHaveBeenCalled();
    expect(el.querySelector('[role="status"]')?.textContent).toBe('Som desligado: aumente o volume para ouvir.');
  });

  it('has no button where Ogg does not play, or when there is no recording', () => {
    expect(render('https://cries/25.ogg', '').nativeElement.querySelector('button, input')).toBeNull();
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
