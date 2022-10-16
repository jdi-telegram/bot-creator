export interface BotEvent {
    name: string;
    command: string;
    feedback?: BotEventFeedback;
}
