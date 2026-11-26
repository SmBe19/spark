import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkdownLibraries } from '../markdown-libs';
import { SparkMarkdown } from './spark-markdown';

const diagram = '~~~ mermaid\ngraph TD; A-->B\n~~~';

describe('SparkMarkdown', () => {
  let fixture: ComponentFixture<SparkMarkdown>;
  const renderDiagram = vi.fn();
  const loadEmoji = vi.fn<() => Promise<void>>();
  const loadMermaid = vi.fn<() => Promise<void>>();

  beforeEach(() => {
    vi.resetAllMocks();
    loadEmoji.mockImplementation(async () => {
      vi.stubGlobal('joypixels', {
        shortnameToUnicode: (text: string) => text.replace(':smile:', '😄'),
      });
    });
    loadMermaid.mockImplementation(async () => {
      vi.stubGlobal('mermaid', { initialize: vi.fn(), run: renderDiagram });
    });
    TestBed.configureTestingModule({
      imports: [SparkMarkdown],
      providers: [{ provide: MarkdownLibraries, useValue: { loadEmoji, loadMermaid } }],
    });
    fixture = TestBed.createComponent(SparkMarkdown);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function render(data: string) {
    fixture.componentRef.setInput('data', data);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders plain markdown and math without starting either optional import', async () => {
    const view = await render('[Link](https://example.com)\n\n$x^2$');
    expect(view.querySelector('a')?.target).toBe('_blank');
    expect(view.querySelector('.katex')).not.toBeNull();
    expect(loadEmoji).not.toHaveBeenCalled();
    expect(loadMermaid).not.toHaveBeenCalled();
  });

  it('loads the required plugins independently as slides change', async () => {
    const view = await render('Plain slide');
    await render('Welcome :smile:');
    expect(view.textContent).toContain('Welcome 😄');
    expect(loadEmoji).toHaveBeenCalledTimes(1);
    expect(loadMermaid).not.toHaveBeenCalled();

    await render(diagram);
    expect(view.querySelector('.mermaid')?.textContent).toContain('graph TD');
    expect(renderDiagram).toHaveBeenCalledTimes(1);
    expect(loadMermaid).toHaveBeenCalledTimes(1);
    expect(loadEmoji).toHaveBeenCalledTimes(1);
  });

  it('does not wait for a pending diagram import after switching to plain content', async () => {
    let finish!: () => void;
    loadMermaid.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    fixture.componentRef.setInput('data', diagram);
    fixture.detectChanges();
    expect(loadMermaid).toHaveBeenCalledTimes(1);
    // Markdown stays visible while the optional diagram library is still loading.
    expect(fixture.nativeElement.querySelector('markdown')).not.toBeNull();

    const view = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('data', 'Next slide');
    // whenStable() also waits for the outstanding dynamic import.
    await vi.waitFor(() => expect(view.textContent).toContain('Next slide'));
    finish();
    await fixture.whenStable();
    expect(view.querySelector('.mermaid')).toBeNull();
    expect(view.textContent).toContain('Next slide');
  });

  it('falls back to plain markdown if an optional import fails', async () => {
    loadEmoji.mockRejectedValue(new Error('Chunk unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await render('Welcome :smile:');
    expect(view.textContent).toContain('Welcome :smile:');
    expect(warn).toHaveBeenCalled();
  });
});
