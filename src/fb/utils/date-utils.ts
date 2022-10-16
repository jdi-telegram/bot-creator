import {Periods} from './periods';

export const today = { date: new Date() };

export const dateTimeToDate = (dateTime: string): Date => {
    const date = dateTime.split(', ')[0].split('/');
    const time = dateTime.split(', ')[1].split(' ')[0];
    return new Date(date[1] + '/' + date[0] + '/' + date[2] + ', ' + time);
};

export const fullDateToDate = (fullDate: string): Date => {
    return new Date(Date.parse(fullDate));
};

export const getDate = (shift: Periods): Date => {
    const date = new Date();
    if (shift.day) {
        date.setDate(date.getDate() + shift.day);
    }
    if (shift.week) {
        date.setDate(date.getDate() + 7 * shift.week);
    }
    if (shift.month) {
        const beforeDate = new Date(date);
        date.setMonth(date.getMonth() + shift.month);
        correctDate(beforeDate, date);
    }
    if (shift.year) {
        const beforeDate = new Date(date);
        date.setFullYear(date.getFullYear() + shift.year);
        correctDate(beforeDate, date);
    }
    return date;
};

const correctDate = (beforeDate: Date, date: Date) => {
    if (beforeDate.getDate() === date.getDate()) return;
    date.setMonth(date.getMonth() - 1);
    date.setDate(beforeDate.getDate() - date.getDate());
};

export const changeDate = (day: number, month: number, year: number): Date => {
    const date: Date = today.date;
    return new Date(
        date.getFullYear() + year,
        date.getMonth() + month,
        date.getDay() + day,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
    );
};
