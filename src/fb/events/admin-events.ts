import TelegramBot, {Message} from 'node-telegram-bot-api';
import fs from 'fs';
import {Queue} from 'queue-typescript';
import {FlowBot} from '../flow-bot';
import {logger} from '../utils/logger';
import {StateManager} from '../utils/state-manager';

export class AdminEvents {
    protected bot: TelegramBot;
    protected state: StateManager;
    protected fileNames: Map<number, Queue<string>> = new Map<number, Queue<string>>();

    constructor(protected flowBot: FlowBot) {
        this.bot = flowBot.bot;
        this.state = flowBot.state;
    }
    adminCommand = (ctx: Message, command: string): boolean => ctx.text === command && this.flowBot.isAdmin(ctx.chat.id);
    adminWait = (ctx: Message, waitCommand: string): boolean => this.state.get(ctx.chat.id) === waitCommand && this.flowBot.isAdmin(ctx.chat.id);

    register() {
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/admin')) {
                await this.bot.sendMessage(ctx.chat.id,
`/adm_update_flow - update bot flow
/adm_add_data - upload data file
/adm_list_data - list all filenames in data folder
/adm_screen_data - print current screen data
/adm_add_image - upload new image
/adm_list_images - list all filenames in images folder
/adm_stats - returns bot usage stats`);
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_update_flow')) {
                await this.bot.sendMessage(ctx.chat.id, 'Upload flow json file');
                this.state.set(ctx.chat.id, 'wait_update_flow');
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_add_data')) {
                await this.bot.sendMessage(ctx.chat.id, 'Upload data file');
                this.state.set(ctx.chat.id, 'wait_data_upload');
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_list_data')) {
                const files = fs.readdirSync(this.flowBot.dataFolder);
                await this.bot.sendMessage(ctx.chat.id, files.join('\n'));
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_screen_data')) {
                await this.bot.sendMessage(ctx.chat.id, JSON.stringify(this.flowBot.currentScreen.get(ctx.chat.id)));
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_update_text')) {
                await this.bot.sendMessage(ctx.chat.id, JSON.stringify(this.flowBot.currentScreen.get(ctx.chat.id)));
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_add_image')) {
                await this.bot.sendMessage(ctx.chat.id, 'Upload image file. Use caption as image name');
                this.state.set(ctx.chat.id, 'wait_image_upload');
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_list_images')) {
                const files = fs.readdirSync(this.flowBot.imagesFolder);
                await this.bot.sendMessage(ctx.chat.id, files.join('\n'));
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminCommand(ctx, '/adm_stats')) {
                const users = this.flowBot.stats.getAllUsers();
                const actionsCount = this.flowBot.stats.getActionsCount('start');
                await this.bot.sendMessage(ctx.chat.id, `User: ${JSON.stringify(users)}\r\nActions: ${actionsCount}`);
            }
        });

        // Wait actions
        this.bot.on('message', async ctx => {
            if (this.adminWait(ctx, 'wait_update_flow') && ctx.document) {
                await this.updateFlowEvent(ctx);
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminWait(ctx, 'wait_data_upload') && ctx.document) {
                await this.uploadDataEvent(ctx);
            }
        });
        this.bot.on('message', async ctx => {
            if (this.adminWait(ctx, 'wait_image_upload') && ctx.photo) {
                await this.uploadImageEvent(ctx);
            }
        });
    }

    async updateFlowEvent(ctx: Message) {
        logger.debug('updateFlowEvent');
        try {
            let filePath = this.flowBot.dataFolder + ctx.document.file_name;
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath);
            }
            filePath = await this.bot.downloadFile(ctx.document.file_id, this.flowBot.dataFolder);
            const { screens, events } = JSON.parse(fs.readFileSync(filePath).toString());
            await this.flowBot.restart(screens, events);
            await this.bot.sendMessage(ctx.chat.id, 'Flow update successful');
        } catch (ex: unknown | any) {
            await this.bot.sendMessage(ctx.chat.id, 'Flow update failed');
            logger.error('Failed to update flow\n' + ex?.message);
        }
        this.state.set(ctx.chat.id, '');

    }

    async uploadDataEvent(ctx: Message) {
        try {
            const filePath = this.flowBot.dataFolder + ctx.document.file_name;
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath);
            }
            await this.bot.downloadFile(ctx.document.file_id, this.flowBot.dataFolder);
            await this.bot.sendMessage(ctx.chat.id, 'Data upload successful');
            this.state.set(ctx.chat.id, '');
        } catch (ex: unknown | any) {
            await this.bot.sendMessage(ctx.chat.id, 'Data upload failed');
            logger.error('Failed to upload data\n' + ex?.message);
        }
    }

    async uploadImageEvent(ctx: Message) {
        try {
            const {filePath, fileName} = await this.getImageData(ctx);
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath);
            }
            fs.renameSync(filePath, 'images/' + fileName);
            await this.bot.sendMessage(ctx.chat.id, 'Image upload successful');
            this.state.set(ctx.chat.id, '');
        } catch (ex: unknown | any) {
            await this.bot.sendMessage(ctx.chat.id, 'Image upload failed');
            logger.error('Failed to upload image\n' + ex?.message);
        }
    }

    async getImageData(ctx: Message): Promise<{ filePath: string, fileName: string }> {
        const filePath = await this.bot.downloadFile(ctx.photo[ctx.photo.length - 1].file_id, 'images/');
        let fileName: string;
        if (ctx.media_group_id) {
            const mediaGroup = parseInt(ctx.media_group_id);
            if (ctx.caption) {
                this.fileNames.set(mediaGroup, new Queue<string>(...ctx.caption.split(';')));
            }
            const item = this.fileNames.get(mediaGroup).dequeue();
            fileName = this.getImageName(item);
        } else {
            fileName = this.getImageName(ctx.caption);
        }
        return { filePath, fileName };
    }

    getImageName(imageName: string): string {
        return imageName.includes('.')
            ? imageName
            : imageName + '.jpg'
    }
}
