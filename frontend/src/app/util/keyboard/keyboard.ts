export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const contentEditableAttribute = target.getAttribute('contenteditable');
  return (
    target.isContentEditable ||
    (contentEditableAttribute !== null && contentEditableAttribute !== 'false') ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

export function handleKeyboardEvent(
  event: KeyboardEvent,
  callback: (event: KeyboardEvent) => boolean,
): void {
  if (event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) {
    return;
  }
  const handled = callback(event);
  if (handled) {
    event.preventDefault();
  }
}
