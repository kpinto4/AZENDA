import { Pipe, PipeTransform } from '@angular/core';
import { formatCop } from './format-currency';

@Pipe({ name: 'formatCop', standalone: true })
export class FormatCopPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || Number.isNaN(Number(value))) {
      return '—';
    }
    return formatCop(Number(value));
  }
}
