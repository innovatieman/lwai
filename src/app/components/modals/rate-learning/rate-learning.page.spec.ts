import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RateLearningPage } from './rate-learning.page';

describe('RateLearningPage', () => {
  let component: RateLearningPage;
  let fixture: ComponentFixture<RateLearningPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RateLearningPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
