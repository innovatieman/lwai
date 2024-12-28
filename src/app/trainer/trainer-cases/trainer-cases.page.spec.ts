import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainerCasesPage } from './trainer-cases.page';

describe('TrainerCasesPage', () => {
  let component: TrainerCasesPage;
  let fixture: ComponentFixture<TrainerCasesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainerCasesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
