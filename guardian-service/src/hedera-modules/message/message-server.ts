import {
    AccountId,
    PrivateKey,
    TopicId,
} from '@hashgraph/sdk';
import { IPFS } from '@helpers/ipfs';
import { Message } from './message';
import { HederaSDKHelper } from '../hedera-sdk-helper';
import { MessageType } from './message-type';
import { VCMessage } from './vc-message';
import { DIDMessage } from './did-message';
import { Logger } from 'logger-helper';
import { PolicyMessage } from './policy-message';
import { SchemaMessage } from './schema-message';
import { MessageAction } from './message-action';
import { VPMessage } from './vp-message';

export class MessageServer {
    private client: HederaSDKHelper;

    private submitKey: PrivateKey | string;
    private topicId: TopicId | string;

    constructor(operatorId?: string | AccountId, operatorKey?: string | PrivateKey) {
        this.client = new HederaSDKHelper(operatorId, operatorKey);
    }

    public setTopicObject(topic: { topicId: string, key: string }): MessageServer {
        this.submitKey = topic.key;
        this.topicId = topic.topicId;
        return this;
    }

    public setTopic(topicId: TopicId | string, submitKey?: PrivateKey | string): MessageServer {
        this.submitKey = submitKey;
        this.topicId = topicId;
        return this;
    }

    private async sendIPFS<T extends Message>(message: T): Promise<T> {
        const buffers = await message.toDocuments();
        const urls = [];
        for (let i = 0; i < buffers.length; i++) {
            const buffer = buffers[i];
            const result = await IPFS.addFile(buffer);
            urls.push(result);
        }
        message.setUrls(urls);
        return message;
    }

    private async loadIPFS<T extends Message>(message: T): Promise<T> {
        const urls = message.getUrls();
        const documents = [];
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const document = await IPFS.getFile(url.cid, message.responseType);
            documents.push(document);
        }
        message = message.loadDocuments(documents) as T;
        return message;
    }

    private async sendHedera<T extends Message>(message: T): Promise<T> {
        if (!this.topicId) {
            throw 'Topic not set';
        }
        const buffer = message.toMessage();
        const id = await this.client.submitMessage(this.topicId, buffer, this.submitKey);
        message.setId(id);
        message.setTopicId(this.topicId);
        return message;
    }

    public static fromMessage(message: string): Message {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): Message {
        let message: Message;
        switch (json.type) {
            case MessageType.VCDocument:
                message = VCMessage.fromMessageObject(json);
                break;
            case MessageType.DIDDocument:
                message = DIDMessage.fromMessageObject(json);
                break;
            case MessageType.Schema:
                message = SchemaMessage.fromMessageObject(json);
                break;
            case MessageType.Policy:
                message = PolicyMessage.fromMessageObject(json);
                break;
            case MessageType.InstancePolicy:
                message = PolicyMessage.fromMessageObject(json);
                break;
            case MessageType.VPDocument:
                message = VPMessage.fromMessageObject(json);
                break;
            // Default schemes
            case 'schema-document':
                message = SchemaMessage.fromMessageObject(json);
                break;
            default:
                new Logger().error(`Invalid format message: ${json.type}`, ['GUARDIAN_SERVICE']);
                console.error(`Invalid format message: ${json.type}`);
                throw `Invalid format message: ${json.type}`;
        }
        if (!message.validate()) {
            new Logger().error(`Invalid json: ${json.type}`, ['GUARDIAN_SERVICE']);
            console.error(`Invalid json: ${json.type}`);
            throw `Invalid json: ${json.type}`;
        }
        return message;
    }


    private async getTopicMessage(timeStamp: string): Promise<Message> {
        const { topicId, message } = await this.client.getTopicMessage(timeStamp);
        new Logger().info(`getTopicMessage, ${timeStamp}, ${topicId}, ${message}`, ['GUARDIAN_SERVICE']);
        const result = MessageServer.fromMessage(message);
        result.setId(timeStamp);
        result.setTopicId(topicId);
        return result;
    }

    private async getTopicMessages(topicId: string | TopicId): Promise<Message[]> {
        const topic = topicId.toString();
        const messages = await this.client.getTopicMessages(topic);
        new Logger().info(`getTopicMessages, ${topic}`, ['GUARDIAN_SERVICE']);
        const result: Message[] = [];
        for (let i = 0; i < messages.length; i++) {
            try {
                const message = messages[i];
                const item = MessageServer.fromMessage(message.message);
                item.setId(message.id);
                item.setTopicId(topic);
                result.push(item);
            } catch (error) {
                continue;
            }
        }
        return result;
    }

    public async sendMessage<T extends Message>(message: T): Promise<T> {
        message = await this.sendIPFS(message);
        message = await this.sendHedera(message);
        return message;
    }

    public async getMessage<T extends Message>(id: string): Promise<T> {
        let message = await this.getTopicMessage(id);
        message = await this.loadIPFS(message);
        return message as T;
    }


    public async getMessages<T extends Message>(topicId: string | TopicId, type?: MessageType, action?: MessageAction): Promise<T[]> {
        let messages = await this.getTopicMessages(topicId);
        if (type) {
            messages = messages.filter(m => m.type == type);
        }
        if (action) {
            messages = messages.filter(m => m.action == action);
        }
        return messages as T[];
    }

    public async loadDocument<T extends Message>(message: T): Promise<T> {
        return await this.loadIPFS<T>(message);
    }

    public async findTopic(messageId:string): Promise<string> {
        try {
            console.log(messageId)
            if(messageId) {
                const { topicId, message } = await this.client.getTopicMessage(messageId);
                console.log(topicId)
                return topicId;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}
