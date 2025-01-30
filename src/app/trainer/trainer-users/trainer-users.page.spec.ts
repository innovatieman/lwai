import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainerUsersPage } from './trainer-users.page';

describe('TrainerUsersPage', () => {
  let component: TrainerUsersPage;
  let fixture: ComponentFixture<TrainerUsersPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainerUsersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
