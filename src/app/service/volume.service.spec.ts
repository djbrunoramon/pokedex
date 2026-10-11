import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_VOLUME, VOLUME_STORAGE_KEY, VolumeService } from './volume.service';

describe('VolumeService', () => {
  beforeEach(() => localStorage.clear());

  function create(): VolumeService {
    const volume = TestBed.inject(VolumeService);
    TestBed.inject(ApplicationRef).tick(); // the stored volume is read after the first render
    return volume;
  }

  it('starts low by default', () => {
    const volume = create();
    expect(DEFAULT_VOLUME).toBe(25);
    expect(volume.percent()).toBe(25);
    expect(volume.level()).toBe(0.25);
    expect(volume.muted()).toBe(false);
  });

  it('reads the stored volume, including 0 (muted)', () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, '0');
    const volume = create();
    expect(volume.percent()).toBe(0);
    expect(volume.muted()).toBe(true);
  });

  it('stores changes, kept between 0 and 100', () => {
    const volume = create();
    volume.set(60);
    expect(volume.level()).toBe(0.6);
    expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBe('60');

    volume.set(150);
    expect(volume.percent()).toBe(100);
    volume.set(-5);
    expect(volume.percent()).toBe(0);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem(VOLUME_STORAGE_KEY, 'alto');
    expect(create().percent()).toBe(DEFAULT_VOLUME);
  });
});
