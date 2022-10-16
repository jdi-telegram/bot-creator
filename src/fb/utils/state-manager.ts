import {logger} from './logger';

export class StateManager {
    states: Map<number, string> = new Map<number, string>();
    set(id: number, state: string) {
        logger.debug('STATE: ' + state);
        this.states.set(id, state);
    }

    get(id: number) {
        return this.states.get(id);
    }
}
