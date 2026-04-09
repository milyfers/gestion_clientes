import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppBPage } from './app-b.page';

describe('AppBPage', () => {
  let component: AppBPage;
  let fixture: ComponentFixture<AppBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AppBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
