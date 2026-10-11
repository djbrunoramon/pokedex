import { TestBed } from '@angular/core/testing';

import { PokeShortcutsComponent } from './poke-shortcuts.component';

describe('PokeShortcutsComponent', () => {
  beforeEach(() => {
    // jsdom has no modal dialogs
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
  });

  function render() {
    const fixture = TestBed.createComponent(PokeShortcutsComponent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
  }

  it('lists the shortcuts', () => {
    const dialog = render();
    expect(dialog.querySelector('h2')?.textContent).toBe('Atalhos de teclado');
    expect([...dialog.querySelectorAll('dt')].map((dt) => dt.textContent?.replace(/\s+/g, ''))).toEqual(['/', '←→', '?', 'Esc']);
  });

  it('opens with ? and closes with its button', () => {
    const dialog = render();
    expect(dialog.open).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    expect(dialog.open).toBe(true);

    dialog.querySelector('button')!.click();
    expect(dialog.open).toBe(false);
  });

  it('ignores ? typed in a field', () => {
    const dialog = render();
    const input = document.body.appendChild(document.createElement('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(dialog.open).toBe(false);
    input.remove();
  });

  it('keeps the keys pressed inside it from reaching the page', () => {
    const dialog = render();
    const onPage = vi.fn();
    document.addEventListener('keydown', onPage);
    dialog.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(onPage).not.toHaveBeenCalled();
    document.removeEventListener('keydown', onPage);
  });
});
