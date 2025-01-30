import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchConversationsPage } from './search-conversations.page';

describe('SearchConversationsPage', () => {
  let component: SearchConversationsPage;
  let fixture: ComponentFixture<SearchConversationsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchConversationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
