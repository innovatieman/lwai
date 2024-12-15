import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttitudesPage } from './attitudes.page';

describe('AttitudesPage', () => {
  let component: AttitudesPage;
  let fixture: ComponentFixture<AttitudesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AttitudesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
