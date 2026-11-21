import { isEditableTarget } from './keyboard';

describe('isEditableTarget', () => {
  it('should detect form elements as editable', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
  });

  it('should detect content editable elements', () => {
    const element = document.createElement('div');
    element.setAttribute('contenteditable', 'true');

    expect(isEditableTarget(element)).toBe(true);
  });

  it('should not treat other targets as editable', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(document.body)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(window)).toBe(false);
  });
});
