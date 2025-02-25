import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TokenAnalysisPage } from './token-analysis.page';

describe('TokenAnalysisPage', () => {
  let component: TokenAnalysisPage;
  let fixture: ComponentFixture<TokenAnalysisPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TokenAnalysisPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
