import { BotTextImage } from '../interfaces/bot-text-image';
import fs from 'fs';
import {logger} from './logger';
import {Order} from '../interfaces/bot-screen';

export class ScreensDataReader {
    previousData: Map<number, string[]> = new Map<number, string[]>([]);
    constructor(protected chatId: number) { }

    prev() {
        return this.previousData.get(this.chatId) ?? [];
    }

    readData(dataPath: string, filter: string, order: string/*Order*/ = 'random'): BotTextImage {
        logger.debug('readData: ' + order);
        const data: BotTextImage[] = JSON.parse(fs.readFileSync(dataPath).toString());
        if (data.length === 0) {
            logger.error('Failed to load resource: ' + dataPath);
            return ;
        }
        let filtered: BotTextImage[] = filter
            ? this.filterAll(data, filter)
            : [...data];
        if (filtered.length > 1 && this.prev().length > 0) {
            if (filtered.length === this.prev().length) {
                this.previousData.set(this.chatId, []);
            } else {
                filtered = filtered.filter(d => !this.prev().includes(d.text));
            }
        }
        const result = order === 'ordered'
            ? filtered[0]
            : filtered[Math.floor(Math.random() * filtered.length)];
        if (!result.text) {
            logger.error(`${JSON.stringify(filtered)}\n ${order}`);
        }
        const newExclude: string[] = order === 'random' || this.prev().length === 0
            ? [result.text]
            : [...this.prev(), result.text];
        this.previousData.set(this.chatId, newExclude);
        return result;
    }

    filterAll(data: BotTextImage[], filter: string): BotTextImage[] {
        logger.debug('Filter: ' + filter);
        const conditions: string[] = filter.includes('&')
            ? filter.split('&')
            : [filter];
        let filtered: BotTextImage[] = [...data];
        for(let condition of conditions) {
            filtered = this.filter(filtered, condition);
        }
        return filtered;
    }

    filter(data: BotTextImage[], filter: string): BotTextImage[]  {
        try {
            if (filter.includes('=')) {
                return this.filterEqual(data, filter);
            }
            if (filter.includes('>')) {
                return this.filterMore(data, filter);
            }
            if (filter.includes('<')) {
                return this.filterLess(data, filter);
            }
            return [];
        } catch (ex: unknown | any) {
            logger.error('Filter Error\n' + ex.message);
            return [];
        }
    }

    filterEqual(data: BotTextImage[], filter: string): BotTextImage[] {
        const split = filter.split('=');
        logger.debug('filterEqual: ' + JSON.stringify(split));
        // @ts-ignore
        return data.filter(r => this.compare(r[split[0]], split[1]));
    }
    filterMore(data: BotTextImage[], filter: string): BotTextImage[] {
        const split = filter.split('>');
        logger.debug('filterMore: ' + JSON.stringify(split));
        // @ts-ignore
        return data.filter(r => r[split[0]] > parseInt(split[1]));
    }
    filterLess(data: BotTextImage[], filter: string): BotTextImage[] {
        const split = filter.split('<');
        logger.debug('filterLess: ' + JSON.stringify(split));
        // @ts-ignore
        return data.filter(r => r[split[0]] < parseInt(split[1]));
    }

    compare(obj: any, str: string): boolean {
        if (!obj) return false;
        if (typeof obj === 'string') {
            return obj === str;
        }
        if (typeof obj === 'number') {
            return obj === parseInt(str);
        }
        if (typeof obj === 'boolean') {
            return obj === (str === 'true');
        }
    }
}
