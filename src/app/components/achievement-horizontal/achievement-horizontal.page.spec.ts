import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AchievementHorizontalPage } from './achievement-horizontal.page';

describe('AchievementHorizontalPage', () => {
  let component: AchievementHorizontalPage;
  let fixture: ComponentFixture<AchievementHorizontalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AchievementHorizontalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
