import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InViewportDirective } from './in-viewport.directive';

/** Minimal IntersectionObserver stand-in that tests drive by hand. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observed = new Set<Element>();
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.add(element);
  }

  unobserve(element: Element): void {
    this.observed.delete(element);
  }

  disconnect(): void {
    this.disconnected = true;
    this.observed.clear();
  }

  trigger(isIntersecting: boolean): void {
    const entries = [...this.observed].map((target) => ({ target, isIntersecting }));
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

@Component({
  imports: [InViewportDirective],
  template: `
    @if (shown()) {
      <div pokeInViewport (inViewport)="hits = hits + 1"></div>
    }
  `,
})
class HostComponent {
  readonly shown = signal(true);
  hits = 0;
}

describe('InViewportDirective', () => {
  const original = globalThis.IntersectionObserver;

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = original;
  });

  async function render() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    return { fixture, observer: FakeIntersectionObserver.instances[0] };
  }

  it('observes the host with a pre-load margin and emits when it intersects', async () => {
    const { fixture, observer } = await render();

    expect(observer.options?.rootMargin).toBe('600px');
    expect(observer.observed.size).toBe(1);

    observer.trigger(false);
    expect(fixture.componentInstance.hits).toBe(0);

    observer.trigger(true);
    expect(fixture.componentInstance.hits).toBe(1);
  });

  it('emits at most once per render, then re-observes to check again', async () => {
    const { fixture, observer } = await render();

    observer.trigger(true);
    observer.trigger(true);
    expect(fixture.componentInstance.hits).toBe(1);

    fixture.componentInstance.shown.set(true); // any change detection pass = a render
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();

    expect(observer.observed.size).toBe(1);
    observer.trigger(true);
    expect(fixture.componentInstance.hits).toBe(2);
  });

  it('disconnects when the host is destroyed', async () => {
    const { fixture, observer } = await render();

    fixture.componentInstance.shown.set(false);
    await fixture.whenStable();

    expect(observer.disconnected).toBe(true);
  });
});
