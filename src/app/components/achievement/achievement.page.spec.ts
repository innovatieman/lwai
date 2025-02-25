import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AchievementPage } from './achievement.page';

describe('AchievementPage', () => {
  let component: AchievementPage;
  let fixture: ComponentFixture<AchievementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AchievementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
