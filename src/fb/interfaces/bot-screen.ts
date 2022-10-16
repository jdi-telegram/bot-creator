import {BotButton} from './bot-button';

export type Order = 'random' | 'ordered' | 'random-exclude';

export interface BotScreen {
    command: string;
    description?: string;
    text?: string;
    image?: string | string[];
    data?: string;
    order?: string;//Order;
    filter?: string;
    buttons?: BotButton[][];
    handler?: string;
    event?: string;
}
