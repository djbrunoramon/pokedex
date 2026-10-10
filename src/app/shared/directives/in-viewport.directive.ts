import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
} from '@angular/core';

/**
 * Emits `inViewport` whenever the host element scrolls into (or near) the viewport, and
 * again after each render while it stays there (so a short page keeps filling up).
 * Does nothing where IntersectionObserver is unavailable, so the host must also work
 * by plain interaction (e.g. a button click).
 */
@Directive({
  selector: '[pokeInViewport]',
})
export class InViewportDirective implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  /** How far before the viewport edge to fire, as a CSS margin. */
  readonly rootMargin = input('600px');
  readonly inViewport = output<void>();

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const element = this.host.nativeElement;
    // At most one emission per render: the content added by a listener must lay out
    // before we know whether the host is still in view.
    let pending = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!pending && entries.some((entry) => entry.isIntersecting)) {
          pending = true;
          this.inViewport.emit();
          // Re-observing makes the observer report the current state again once the
          // content added by the listener has rendered.
          afterNextRender(
            () => {
              pending = false;
              observer.unobserve(element);
              observer.observe(element);
            },
            { injector: this.injector },
          );
        }
      },
      { rootMargin: this.rootMargin() },
    );
    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
