import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingsPage } from './trainings.page';

describe('TrainingsPage', () => {
  let component: TrainingsPage;
  let fixture: ComponentFixture<TrainingsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
