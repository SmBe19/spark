import { Service } from '@angular/core';
import { Poll, PollQuestion } from '../model/poll';
import { QuestionReply } from '../model/replies';

@Service()
export class PollService {
  parsePoll(pollConfig: string): Poll {
    const lines = this.splitLines(pollConfig);
    const questions: PollQuestion[] = [];
    const pages: number[][] = [];

    if (lines.length === 0) {
      return { questions, pages };
    }

    let currentLine = 0;
    const globalFlagsMatch = lines[0].match(/^-\s+(!\w.*)$/);
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

  getActivePage(pages: number[][], activeQuestionIndex: number): number[] {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].includes(activeQuestionIndex)) {
        return pages[i];
      }
    }
    return [];
  }

  getNextPage(pages: number[][], activeQuestionIndex: number): number[] | null {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].includes(activeQuestionIndex)) {
        if (i + 1 < pages.length) {
          return pages[i + 1];
        } else {
          return null;
        }
      }
    }
    return null;
  }

  getPreviousPage(pages: number[][], activeQuestionIndex: number): number[] | null {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].includes(activeQuestionIndex)) {
        if (i - 1 >= 0) {
          return pages[i - 1];
        } else {
          return null;
        }
      }
    }
    return null;
  }

  groupRepliesByQuestion(replies: QuestionReply[]): Record<number, string[]> {
    const grouped: Record<number, string[]> = {};
    for (const reply of replies) {
      if (!grouped[reply.questionIndex]) {
        grouped[reply.questionIndex] = [];
      }
      grouped[reply.questionIndex].push(reply.reply);
    }
    return grouped;
  }

  getReplyDistributions(
    repliesByQuestion: Record<number, string[]>,
  ): Record<number, Record<number, number>> {
    const distributions: Record<number, Record<number, number>> = {};
    for (const questionIndex in repliesByQuestion) {
      const questionReplies = repliesByQuestion[questionIndex];
      const distribution: Record<number, number> = {};
      for (const reply of questionReplies) {
        const parts = reply.split(',');
        for (const part of parts) {
          const optionIndex = Number(part);
          if (!distribution[optionIndex]) {
            distribution[optionIndex] = 0;
          }
          distribution[optionIndex]++;
        }
      }
      distributions[Number(questionIndex)] = distribution;
    }
    return distributions;
  }

  private parseQuestion(index: number, lines: string[]): PollQuestion {
    const flags = this.parseFlags(lines[0]);
    const questionText = lines[0]
      .replace(/!\w.*$/, '')
      .replace(/^-/, '')
      .trim();

    const baseQuestion = {
      index,
      question: questionText,
      showReplies: !!flags['repl'] && !flags['norepl'],
      showSolution: !!flags['sol'] && !flags['nosol'],
      showCorrection: !!flags['corr'] || !flags['nocorr'],
      individualProgress: !!flags['open'],
      joinWithPrevious: !!flags['join'],
    };

    if (flags['rate']) {
      return {
        ...baseQuestion,
        pollType: 'rating',
        maxRating: this.flagNumber(flags['rate'], 5),
      };
    }
    if (flags['estimate'] || flags['est']) {
      return {
        ...baseQuestion,
        pollType: 'estimate',
        minValue: this.flagNumber(flags['min'], 0),
        maxValue: this.flagNumber(flags['max'], 100),
      };
    }
    if (flags['yn'] || flags['yny'] || flags['ynn']) {
      const translations: { [key: string]: { yes: string; no: string } } = {
        en: { yes: 'Yes', no: 'No' },
        de: { yes: 'Ja', no: 'Nein' },
        fr: { yes: 'Oui', no: 'Non' },
        es: { yes: 'Sí', no: 'No' },
        it: { yes: 'Sì', no: 'No' },
      };
      const flagValue = flags['yn'] || flags['yny'] || flags['ynn'];
      const language = flagValue === true ? 'en' : (flagValue as string);
      const translation = translations[language] || translations['en'];
      return {
        ...baseQuestion,
        pollType: 'options',
        options: [
          { index: 0, option: translation.yes, correct: !!flags['yny'] },
          { index: 1, option: translation.no, correct: !!flags['ynn'] },
        ],
        multiSelect: false,
      };
    }
    if (lines.length > 1) {
      const options = lines.slice(1).map((line, optionIndex) => {
        const optionFlags = this.parseFlags(line);
        return {
          index: optionIndex,
          option: line
            .replace(/!\w.*$/, '')
            .replace(/^\s*-/, '')
            .trim(),
          correct: !!(optionFlags['x'] || optionFlags['correct']),
        };
      });
      const correctOptions = options.filter((option) => option.correct);
      return {
        ...baseQuestion,
        pollType: 'options',
        options,
        multiSelect: !!flags['multi'] || correctOptions.length > 1,
      };
    }
    return {
      ...baseQuestion,
      pollType: 'text',
      maxLength: Number((flags['length'] || flags['len']) as string) || null,
    };
  }

  private flagNumber(flagValue: string | boolean | undefined, defaultValue: number): number {
    if (flagValue === undefined || flagValue === true) {
      return defaultValue;
    }
    const num = Number(flagValue);
    return isNaN(num) ? defaultValue : num;
  }

  private parseFlags(line: string): Flags {
    const flags: Flags = {};
    const flagMatches = line.match(/.+?(!\w.*)/);
    if (flagMatches) {
      const flagStrings = flagMatches[1].split(/\s+/);
      for (const flagString of flagStrings) {
        if (!flagString.startsWith('!')) {
          continue;
        }
        const parts = flagString.substring(1).split(':', 2);
        if (parts.length === 2) {
          flags[parts[0]] = parts[1];
        } else {
          flags[parts[0]] = true;
        }
      }
    }
    return flags;
  }

  private splitLines(text: string): string[] {
    const lines = text.split('\n');
    const result: string[] = [];
    let currentLine = '';
    for (const line of lines) {
      if (line.endsWith('  ')) {
        currentLine += line.slice(0, -2) + '\n';
      } else {
        currentLine += line;
        result.push(currentLine);
        currentLine = '';
      }
    }
    if (currentLine !== '') {
      result.push(currentLine);
    }
    return result;
  }
}

type Flags = { [key: string]: string | boolean };
