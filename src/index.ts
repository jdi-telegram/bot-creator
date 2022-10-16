import flow from './resources/screens-flow.json';
import 'dotenv/config';
import {BotCreator} from './bot-creator';
import {FlowBot} from './fb/flow-bot';
import {LogLevels} from './fb/utils/log-levels';

const flowBot = new FlowBot(process.env.BOT_TOKEN, flow, {
    adminIds: process.env.ADMIN_ID,
    logLevel: LogLevels.debug
});
new BotCreator(flowBot).start();
flowBot.start();
