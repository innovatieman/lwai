import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainerInfoItemsPage } from './trainer-info-items.page';

describe('TrainerInfoItemsPage', () => {
  let component: TrainerInfoItemsPage;
  let fixture: ComponentFixture<TrainerInfoItemsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainerInfoItemsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
