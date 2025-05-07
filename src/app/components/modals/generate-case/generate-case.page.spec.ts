import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenerateCasePage } from './generate-case.page';

describe('ConversationStartPage', () => {
  let component: GenerateCasePage;
  let fixture: ComponentFixture<GenerateCasePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GenerateCasePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
