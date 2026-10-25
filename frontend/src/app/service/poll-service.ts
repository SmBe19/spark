import { Service } from '@angular/core';
import { Poll, PollQuestion } from '../model/poll';

@Service()
export class PollService {
  parsePoll(pollConfig: string): Poll {
    const lines = pollConfig.split('\n');
    const questions: PollQuestion[] = [];
    const pages: number[][] = [];

    if (lines.length === 0) {
      return { questions, pages };
    }

    let currentLine = 0;
    const globalFlagsMatch = lines[0].match(/^-\s+(:.*)$/);
    let globalFlags = '';
    if (globalFlagsMatch) {
      globalFlags = globalFlagsMatch[1];
      currentLine++;
    }
    while (currentLine < lines.length) {
      if (!lines[currentLine].startsWith('-')) {
        currentLine++;
        continue;
      }
      const questionLines: string[] = [lines[currentLine] + ' ' + globalFlags];
      currentLine++;
      while (currentLine < lines.length && !lines[currentLine].startsWith('-')) {
        if (lines[currentLine].trim() !== '') {
          questionLines.push(lines[currentLine]);
        }
        currentLine++;
      }
      const question = this.parseQuestion(questions.length, questionLines);
      if (pages.length === 0 || !question.joinWithPrevious) {
        pages.push([]);
      }
      pages[pages.length - 1].push(question.index);
      questions.push(question);
    }

    return { questions, pages };
  }

  private parseQuestion(index: number, lines: string[]): PollQuestion {
    const flags = this.parseFlags(lines[0]);
    const questionText = lines[0]
      .replace(/:\S.*$/, '')
      .replace(/^-/, '')
      .trim();

    const baseQuestion = {
      index,
      question: questionText,
      showResults: !!(flags['show'] && !flags['hide']),
      individualProgress: !!flags['open'],
      joinWithPrevious: !!flags['join'],
    };

    if (flags['rate']) {
      return {
        ...baseQuestion,
        pollType: 'rating',
        maxRating: parseInt(flags['rate'] as string) || 5,
      };
    }
    if (flags['estimate'] || flags['est']) {
      return {
        ...baseQuestion,
        pollType: 'estimate',
        minValue: parseInt(flags['min'] as string) || 0,
        maxValue: parseInt(flags['max'] as string) || 100,
      };
    }
    if (lines.length > 1) {
      const options = lines.slice(1).map((line, optionIndex) => {
        const optionFlags = this.parseFlags(line);
        return {
          index: optionIndex,
          option: line
            .replace(/:\S.*$/, '')
            .replace(/^\s*-/, '')
            .trim(),
          correct: !!(optionFlags['x'] || optionFlags['correct']),
        };
      });
      return {
        ...baseQuestion,
        pollType: 'options',
        options,
        multiSelect: !!flags['multi'],
      };
    }
    return {
      ...baseQuestion,
      pollType: 'text',
      maxLength: parseInt(flags['length'] as string) || null,
    };
  }

  private parseFlags(line: string): Flags {
    const flags: Flags = {};
    const flagMatches = line.match(/.+?(:\S.*)/);
    if (flagMatches) {
      const flagStrings = flagMatches[1].split(/\s+/);
      for (const flagString of flagStrings) {
        if (!flagString.startsWith(':')) {
          continue;
        }
        const parts = flagString.substring(1).split(':');
        if (parts.length === 2) {
          flags[parts[0]] = parts[1];
        } else {
          flags[parts[0]] = true;
        }
      }
    }
    return flags;
  }
}

type Flags = { [key: string]: string | boolean };
