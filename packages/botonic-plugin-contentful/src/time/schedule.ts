import momentTz from 'moment-timezone';
import { MomentZone } from 'moment-timezone/moment-timezone';

/**
 * Manages ranges of hour/minutes for each day of a week.
 * The hour/minutes refer to the specified timezone.
 * TODO consider using everywhere Date.toLocaleTimeString() to remove moment-timezone dependency
 */
export class Schedule {
  static TZ_CET = 'Europe/Madrid';
  private readonly zone: MomentZone;
  private readonly scheduleByDay = new Map<WeekDay, DaySchedule>();

  constructor(tzName: string) {
    let zone = momentTz.tz.zone(tzName);
    if (!zone) {
      throw new Error(`${tzName} is not a valid timezone name`);
    }
    this.zone = zone;
  }

  createHourAndMinute(hour: number, minute: number = 0): HourAndMinute {
    return new HourAndMinute(this.zone, hour, minute);
  }

  addDaySchedule(weekday: WeekDay, daySchedule: DaySchedule): Schedule {
    this.scheduleByDay.set(weekday, daySchedule);
    return this;
  }

  /**
   * Formats the specified date using the {@link Schedule}'s timezone.
   * @param locales don't confuse with timezone. This is just to format the date
   */
  timeInThisTimezone(
    locales?: string | string[],
    date: Date = new Date()
  ): string {
    var options: Intl.DateTimeFormatOptions = {
      timeZone: this.zone.name,
      hour12: false
    };
    return date.toLocaleTimeString(locales, options);
  }

  contains(date: Date): boolean {
    let weekDay = date.getDay() as WeekDay;
    let schedule = this.scheduleByDay.get(weekDay);
    if (!schedule) {
      return false;
    }
    return schedule.contains(date);
  }
}

export class DaySchedule {
  constructor(readonly ranges: TimeRange[]) {}

  contains(date: Date): boolean {
    for (let range of this.ranges) {
      if (range.contains(date)) {
        return true;
      }
    }
    return false;
  }
}

export enum WeekDay {
  SUNDAY = 0, // compatible with Date getDay
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}
export class TimeRange {
  /**
   * @param from inclusive
   * @param to exclusive
   */
  constructor(readonly from: HourAndMinute, readonly to: HourAndMinute) {
    if (from.compare(to) >= 0) {
      throw new Error(`${from.toString()} should be before ${to.toString()}`);
    }
  }
  contains(date: Date): boolean {
    if (this.from.compareToDate(date) > 0) {
      return false;
    }
    return this.to.compareToDate(date) > 0;
  }
}

export class HourAndMinute {
  constructor(
    readonly zone: MomentZone,
    readonly hour: number,
    readonly minute: number = 0
  ) {}

  compareToDate(date: Date): number {
    let hourAndMinuteOffset = this.zone.utcOffset(date.getTime());
    let hourAndMinuteUtc = this.toMinutes() + hourAndMinuteOffset;
    let dateUtc = date.getUTCHours() * 60 + date.getUTCMinutes();

    return HourAndMinute.compareNumber(hourAndMinuteUtc, dateUtc);
  }

  private static compareNumber(first: number, second: number): number {
    if (first === second) {
      return 0;
    }
    if (first < second) {
      return -1;
    }
    return 1;
  }

  compare(other: HourAndMinute): number {
    if (this.zone != other.zone) {
      throw new Error('Cannot compare HourAndMinute of different timezones');
    }
    return HourAndMinute.compareNumber(this.toMinutes(), other.toMinutes());
  }

  private toMinutes(): number {
    return this.hour * 60 + this.minute;
  }

  toString(): string {
    let str = this.hour.toString();
    if (this.minute != 0) {
      str += ':' + this.minute.toString();
    }
    return str + 'h';
  }
}