import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalesTrainingsPage } from './sales-trainings.page';

describe('SalesTrainingsPage', () => {
  let component: SalesTrainingsPage;
  let fixture: ComponentFixture<SalesTrainingsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SalesTrainingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
