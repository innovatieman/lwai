import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyseConversationsPage } from './analyse-conversations.page';

describe('AnalyseConversationsPage', () => {
  let component: AnalyseConversationsPage;
  let fixture: ComponentFixture<AnalyseConversationsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalyseConversationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
