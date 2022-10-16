import TelegramBot, {Message} from 'node-telegram-bot-api';
import {FlowBot} from './fb/flow-bot';
import {BotScreen} from './fb/interfaces/bot-screen';
import {BotEvent} from './fb/interfaces/bot-event';
import 'dotenv/config';
import defaultFlow from'./resources/default-flow.json';
import fs from 'fs';

export class BotCreator {
    readonly bot: TelegramBot;
    token: Map<number, string> = new Map<number, string>();
    bots: string[] = [];
    constructor(readonly flowBot: FlowBot) {
        this.bot = this.flowBot.bot
    }

    start() {
        this.bot.on('message', async ctx => {
            if (this.flowBot.state.get(ctx.chat.id) === 'event:create_flow_bot') {
                if (this.bots.includes(ctx.text)) {
                    await this.bot.sendMessage(ctx.chat.id, 'Bot with this id is already on fly.\nPlease enter another BOT_TOKEN')
                } else {
                    this.token.set(ctx.chat.id, ctx.text);
                    this.flowBot.state.set(ctx.chat.id, 'event:create_flow_bot:done');
                }
            }
        });

        this.bot.on('callback_query', async ctx => {
            if (ctx.data !== 'create_default_bot') return;
            await this.createFlowBot(ctx.message, defaultFlow);
        })
        let state = 'Unknown';
        this.bot.on('message', async ctx => {
            if (this.flowBot.state.get(ctx.chat.id) === 'event:create_setup_bot' && ctx.document) {
                const flow = await this.getScreenFlow(ctx);
                await this.createFlowBot(ctx, flow);
                this.flowBot.state.set(ctx.chat.id, 'event:create_setup_bot:done');
            }
        })
    }

    async createFlowBot(ctx: Message, screens: { screens: BotScreen[] }) {
        const token = this.token.get(ctx.chat.id);
        if (this.bots.includes(token)) {
            await this.bot.sendMessage(ctx.chat.id,'Bot with this token is already on fly');
        } else {
            new FlowBot(token, screens, { adminIds: [parseInt(process.env.ADMIN_ID), ctx.from.id]}).start();
            await this.bot.sendMessage(ctx.chat.id,'Bot successfully started');
            this.bots.push(token);
        }
        const screen = this.flowBot.screens.find(sc => sc.command === '/start');
        await this.flowBot.sendMessage(screen, ctx,screen.command);
    }

    async getScreenFlow(ctx: Message): Promise<{ screens: BotScreen[], events: BotEvent[]}> {
        try {
            let filePath = this.flowBot.dataFolder + ctx.document.file_name;
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath);
            }
            const oldPath = await this.bot.downloadFile(ctx.document.file_id, this.flowBot.dataFolder);
            fs.renameSync(oldPath, filePath);
            await this.bot.sendMessage(ctx.chat.id, 'Flow update successful');
            return JSON.parse(fs.readFileSync(filePath).toString());
        } catch (ex: unknown | any) {
            await this.bot.sendMessage(ctx.chat.id, 'Flow update failed');
            console.error('Flow update failed\n' + ex?.message);
        }
    }
}
