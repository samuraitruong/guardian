import { IMessageResponse } from 'interfaces';
import { MessageBrokerChannel } from 'common';

export abstract class ServiceRequestsBase {
    public channel: MessageBrokerChannel;
    constructor(public target: string) {}
    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel): void {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): MessageBrokerChannel {
        return this.channel;
    }

    /**
     * Request to guardian service method
     * @param entity
     * @param params
     * @param type
     */
    public async request<T>(entity: string, payload?: any): Promise<T> {
        try {
            const response = await this.channel.request<any, IMessageResponse<T>>(`${this.target}.${entity}`, {
                payload,
            });
            if (!response) {
                throw 'Server is not available';
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (e) {
            throw new Error(`Guardian (${entity}) send: ` + e);
        }
    }
}
