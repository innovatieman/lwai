import { TestBed } from '@angular/core/testing';

import { HeygenService } from './heygen.service';

describe('HeygenService', () => {
  let service: HeygenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HeygenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
