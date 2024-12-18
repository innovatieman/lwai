import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackupModalPage } from './backup-modal.page';

describe('BackupModalPage', () => {
  let component: BackupModalPage;
  let fixture: ComponentFixture<BackupModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BackupModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
