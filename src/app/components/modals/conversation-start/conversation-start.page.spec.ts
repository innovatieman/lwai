import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConversationStartPage } from './conversation-start.page';

describe('ConversationStartPage', () => {
  let component: ConversationStartPage;
  let fixture: ComponentFixture<ConversationStartPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConversationStartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
