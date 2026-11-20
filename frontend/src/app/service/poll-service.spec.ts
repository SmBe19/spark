import { TestBed } from '@angular/core/testing';
import { PollService } from './poll-service';

describe('PollService', () => {
  let service: PollService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PollService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse the list format', () => {
    const poll = service.parsePoll(
      ['- Question 1', '  - Option A', '  - Option B', '- Question 2', '  - Option C'].join('\n'),
    );

    expect(poll.questions.map((question) => question.question)).toEqual([
      'Question 1',
      'Question 2',
    ]);
    const firstQuestion = poll.questions[0];
    expect(firstQuestion.pollType).toBe('options');
    if (firstQuestion.pollType === 'options') {
      expect(firstQuestion.options.map((option) => option.option)).toEqual([
        'Option A',
        'Option B',
      ]);
    }
  });

  it('should parse the alternative format without an outer list', () => {
    const poll = service.parsePoll(
      [
        'Question 1',
        '- Option A',
        '- Option B',
        '',
        'Question 2',
        '  - Option C',
        '  - Option D',
        '',
      ].join('\n'),
    );

    expect(poll.questions.map((question) => question.question)).toEqual([
      'Question 1',
      'Question 2',
    ]);
    expect(poll.presentationPages).toEqual([[0], [1]]);
    expect(poll.clientPages).toEqual([[0, 1]]);
    const secondQuestion = poll.questions[1];
    expect(secondQuestion.pollType).toBe('options');
    if (secondQuestion.pollType === 'options') {
      expect(secondQuestion.options.map((option) => option.option)).toEqual([
        'Option C',
        'Option D',
      ]);
    }
  });

  it('should support global flags and options after a blank line in the alternative format', () => {
    const poll = service.parsePoll(
      [
        '!wait',
        '',
        'Question 1',
        '',
        '  - Option A',
        '  - Option B',
        '',
        'Question 2',
        '  - Option C',
      ].join('\n'),
    );

    expect(poll.questions).toHaveLength(2);
    expect(poll.questions.map((question) => question.question)).toEqual([
      'Question 1',
      'Question 2',
    ]);
    expect(poll.questions.every((question) => !question.individualProgress)).toBe(true);
    const firstQuestion = poll.questions[0];
    if (firstQuestion.pollType === 'options') {
      expect(firstQuestion.options.map((option) => option.option)).toEqual([
        'Option A',
        'Option B',
      ]);
    }
  });

  it('should treat everything before an explicit option list as question text', () => {
    const poll = service.parsePoll(
      [
        'Question text',
        'with another line',
        '```ts',
        'const value = 1;',
        'console.log(value);',
        '```',
        '- Option A',
        '- Option B',
      ].join('\n'),
    );

    expect(poll.questions).toHaveLength(1);
    expect(poll.questions[0].question).toBe(
      [
        'Question text',
        'with another line',
        '```ts',
        'const value = 1;',
        'console.log(value);',
        '```',
      ].join('\n'),
    );
    if (poll.questions[0].pollType === 'options') {
      expect(poll.questions[0].options.map((option) => option.option)).toEqual([
        'Option A',
        'Option B',
      ]);
    }
  });
});
