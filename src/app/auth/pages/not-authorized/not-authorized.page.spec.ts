import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotAuthorizedPage } from './not-authorized.page';

describe('NotAuthorizedPage', () => {
  let component: NotAuthorizedPage;
  let fixture: ComponentFixture<NotAuthorizedPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NotAuthorizedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
