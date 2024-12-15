import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoModalPage } from './info-modal.page';

describe('InfoModalPage', () => {
  let component: InfoModalPage;
  let fixture: ComponentFixture<InfoModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
