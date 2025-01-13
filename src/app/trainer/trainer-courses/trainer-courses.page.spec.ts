import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainerCoursesPage } from './trainer-courses.page';

describe('TrainerCoursesPage', () => {
  let component: TrainerCoursesPage;
  let fixture: ComponentFixture<TrainerCoursesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainerCoursesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
