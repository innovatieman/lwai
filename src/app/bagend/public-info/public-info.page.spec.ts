import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublicInfoPage } from './public-info.page';

describe('PublicInfoPage', () => {
  let component: PublicInfoPage;
  let fixture: ComponentFixture<PublicInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
