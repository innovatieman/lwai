import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserMessagesPage } from './user-messages.page';

describe('UserMessagesPage', () => {
  let component: UserMessagesPage;
  let fixture: ComponentFixture<UserMessagesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UserMessagesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
