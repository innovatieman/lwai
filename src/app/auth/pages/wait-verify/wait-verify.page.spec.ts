import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaitVerifyPage } from './wait-verify.page';

describe('WaitVerifyPage', () => {
  let component: WaitVerifyPage;
  let fixture: ComponentFixture<WaitVerifyPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WaitVerifyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
