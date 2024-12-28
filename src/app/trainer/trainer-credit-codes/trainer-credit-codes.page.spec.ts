import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainerCreditCodesPage } from './trainer-credit-codes.page';

describe('TrainerCreditCodesPage', () => {
  let component: TrainerCreditCodesPage;
  let fixture: ComponentFixture<TrainerCreditCodesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainerCreditCodesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
