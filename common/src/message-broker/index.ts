import { JSONCodec, Subscription, NatsConnection, StringCodec } from 'nats';
type ResponseType = 'json' | 'raw';
export class MessageBrokerChannel {
    constructor(private channel: NatsConnection, private channelName: string) {}

    private getTarget(eventType: string) {
        if (eventType.includes(this.channelName)) {
            return eventType;
        }
        return `${this.channelName}.${eventType}`;
    }
    public async response<TData, TResponse>(eventType: string, handleFunc: (data: TData) => Promise<TResponse>) {
        const target = this.getTarget(eventType);
        console.log('MQ subscribed: %s', target);
        const sub = this.channel.subscribe(target);
        const sc = JSONCodec<{ payload: TData }>();
        const responseSc = JSONCodec<TResponse>();
        (async (sub: Subscription) => {
            for await (const m of sub) {
                console.log('MQ response handle: %s', m.subject);
                const data = sc.decode(m.data);
                const response = await handleFunc(data.payload);
                console.log('MQ result: ', m.subject, typeof response);
                m.respond(responseSc.encode(response));
            }
        })(sub);
    }

    public async request<T, TResponse>(eventType: string, payload: T): Promise<TResponse> {
        const target = eventType; //this.getTarget(eventType);
        console.log('MQ request: %s', target, payload);

        const sc = payload && typeof payload === 'string' ? StringCodec() : JSONCodec<T>();
        const msg = await this.channel.request(eventType, sc.encode((payload as any) || {}), {
            timeout: 30000,
        });

        const responseSc = JSONCodec<TResponse>();
        return responseSc.decode(msg.data);
    }

    public publish(eventType: string, data: string) {
        const target = this.getTarget(eventType);
        console.log('MQ publish: %s', target);

        const sc = StringCodec();
        this.channel.publish(target, sc.encode(data));
    }
}
