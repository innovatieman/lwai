import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainerInfoPage } from './trainer-info.page';

describe('TrainerInfoPage', () => {
  let component: TrainerInfoPage;
  let fixture: ComponentFixture<TrainerInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainerInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
