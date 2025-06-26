import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateTrainerPage } from './create-trainer.page';

describe('CreateTrainerPage', () => {
  let component: CreateTrainerPage;
  let fixture: ComponentFixture<CreateTrainerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateTrainerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
