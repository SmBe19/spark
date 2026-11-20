import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { PasteImage } from './paste-image';

@Component({
  imports: [PasteImage],
  template: `<textarea appPasteImage></textarea>`,
})
class TestHost {}

@Component({
  imports: [FormField, PasteImage],
  template: `<textarea appPasteImage [formField]="testForm.text"></textarea>`,
})
class FormHost {
  model = signal({ text: '' });
  testForm = form(this.model);
}

function createPasteEvent(items: { type: string; file: File | null }[]): ClipboardEvent {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: items.map((item) => ({
        type: item.type,
        getAsFile: () => item.file,
      })),
    },
  });
  return event;
}

describe('PasteImage', () => {
  let fixture: ComponentFixture<TestHost>;
  let textarea: HTMLTextAreaElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    fixture = TestBed.createComponent(TestHost);
    textarea = fixture.nativeElement.querySelector('textarea');
    await fixture.whenStable();
  });

  it('should insert a pasted image as a base64 data url', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'image.png', { type: 'image/png' });
    const pasteEvent = createPasteEvent([{ type: 'image/png', file }]);

    textarea.dispatchEvent(pasteEvent);

    await vi.waitFor(() => {
      expect(textarea.value).toContain('![pasted image](data:image/png;base64,');
    });
    expect(pasteEvent.defaultPrevented).toBe(true);
  });

  it('should insert the image at the cursor position', async () => {
    textarea.value = 'before after';
    textarea.setSelectionRange(7, 7);
    const file = new File([new Uint8Array([1])], 'image.png', { type: 'image/png' });

    textarea.dispatchEvent(createPasteEvent([{ type: 'image/png', file }]));

    await vi.waitFor(() => {
      expect(textarea.value).toContain('![pasted image]');
    });
    expect(textarea.value.startsWith('before ![pasted image]')).toBe(true);
    expect(textarea.value.endsWith(')after')).toBe(true);
  });

  it('should ignore pastes that do not contain an image', () => {
    const pasteEvent = createPasteEvent([{ type: 'text/plain', file: null }]);

    textarea.dispatchEvent(pasteEvent);

    expect(pasteEvent.defaultPrevented).toBe(false);
    expect(textarea.value).toBe('');
  });

  it('should update a bound signal form field', async () => {
    const formFixture = TestBed.createComponent(FormHost);
    const formTextarea = formFixture.nativeElement.querySelector('textarea');
    await formFixture.whenStable();
    const file = new File([new Uint8Array([1])], 'image.png', { type: 'image/png' });

    formTextarea.dispatchEvent(createPasteEvent([{ type: 'image/png', file }]));

    await vi.waitFor(() => {
      expect(formFixture.componentInstance.model().text).toContain(
        '![pasted image](data:image/png;base64,',
      );
    });
  });
});
