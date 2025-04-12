import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VoicesPage } from './voices.page';

describe('VoicesPage', () => {
  let component: VoicesPage;
  let fixture: ComponentFixture<VoicesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VoicesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
