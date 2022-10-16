import {StatRecord} from './stat-record';
import {getDate} from '../utils/date-utils';
import {Periods} from '../utils/periods';
import fs from 'fs';

export class StatsHandler {
    constructor (readonly filePath: string) { }

    writeStats(stat: StatRecord) {
        const date = stat.date.toISOString().split('T')[0];
        fs.appendFile(this.filePath, `${stat.id},${stat.screen},${date}\r\n`, () => {});
    }

    readStats(): StatRecord[] {
        const csv: string[] = fs.readFileSync(this.filePath, 'utf-8').split(/\r?\n/);
        const result: StatRecord[] = [];
        for (let line of csv) {
            const stat: StatRecord = this.readLine(line);
            if (stat) {
                result.push(stat);
            }
        }
        return result;
    }

    readLine(line: string): StatRecord {
        if (line === '') return undefined;
        try {
            const data = line.split(',');
            if (data.length !== 3) return undefined;
            const date = new Date(data[2]);
            if (date.toString() === 'Invalid Date') return undefined;
            return {id: data[0], screen: data[1], date: new Date(data[2])};
        } catch (ex: unknown | any) {
            console.error('ERROR\n' + ex?.message);
            return undefined;
        }
    }

    getAllUsers(stats: StatRecord[] = this.readStats()): string[] {
        const users: string[] = [];
        for (let stat of stats) {
            if (!users.includes(stat.id)) {
                users.push(stat.id);
            }
        }
        return users;
    }

    getUsersCount(stats: StatRecord[] = this.readStats()): number {
        return this.getAllUsers(stats).length;
    }

    getUsersCountInRange(from: Date, to: Date): number {
        return this.getUsersCount(this.readStats().filter(stat => stat.date > from && stat.date < to));
    }

    getUsersCountWithShift(shift: Periods): number {
        return this.getUsersCountInRange(new Date(), getDate(shift));
    }

    getUsersLastWeek(): number {
        return this.getUsersCountWithShift({ week: -1});
    }

    getUsersLastMonth(): number {
        return this.getUsersCountWithShift({ month: -1});
    }

    getNewUsersCount(shift: Periods): number {
        const oldUsers: string[] = this.getAllUsers(this.readStats().filter(stat => stat.date < getDate(shift)));
        const newUsers: string[] = this.getAllUsers(this.readStats().filter(stat => stat.date >= getDate(shift)));
        return newUsers.filter(user => !oldUsers.includes(user)).length;
    }

    getNewUsersLastWeek(): number {
        return this.getNewUsersCount({ week: -1 })
    }

    getNewUsersLastMonth(): number {
        return this.getNewUsersCount({ month: -1 })
    }

    getActionsCount(action: string, shift: Periods = {}): number {
        return this.readStats().filter(stat => stat.screen === action && stat.date >= getDate(shift)).length;
    }

    getActionsLastWeek(action: string) {
        return this.getActionsCount(action, { week: -1 });
    }

    getActionsLastMonth(action: string) {
        return this.getActionsCount(action, { month: -1 });
    }
}
