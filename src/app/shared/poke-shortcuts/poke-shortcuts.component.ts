import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';

/** Keys the app answers to, as listed in the help dialog. */
export const SHORTCUTS: ReadonlyArray<{ keys: string[]; label: string; where: string }> = [
  { keys: ['/'], label: 'Ir para a busca', where: 'Lista' },
  { keys: ['←', '→'], label: 'Pokémon anterior / próximo', where: 'Detalhe' },
  { keys: ['?'], label: 'Mostrar estes atalhos', where: 'Qualquer página' },
  { keys: ['Esc'], label: 'Fechar esta janela', where: 'Atalhos' },
];

/** Help dialog with the keyboard shortcuts; opens with `?` (or `open()`, from the header). */
@Component({
  selector: 'poke-shortcuts',
  templateUrl: './poke-shortcuts.component.html',
  styleUrls: ['./poke-shortcuts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class PokeShortcutsComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly shortcuts = SHORTCUTS;

  open(): void {
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** `?` opens the dialog, unless the user is typing somewhere. */
  protected onKey(event: KeyboardEvent): void {
    const target = event.target;
    const typing = target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '?' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.open();
    }
  }
}
