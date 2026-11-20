import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: 'textarea[appPasteImage]',
})
export class PasteImage {
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
      item.type.startsWith('image/'),
    );
    const file = imageItem?.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();

    const textarea = event.target as HTMLTextAreaElement;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }
      const markdown = `![pasted image](${reader.result})`;
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? start;
      textarea.value = textarea.value.slice(0, start) + markdown + textarea.value.slice(end);
      const cursor = start + markdown.length;
      textarea.setSelectionRange(cursor, cursor);
      // Notify the `[formField]` binding that the value changed.
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };
    reader.readAsDataURL(file);
  }
}
