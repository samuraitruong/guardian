import { Singleton } from '@helpers/decorators/singleton';
import { ServiceRequestsBase } from '@helpers/serviceRequestsBase';
import { WalletEvents, IWalletAccount } from 'interfaces';

export enum KeyType {
    ID = 'ID',
    KEY = 'KEY'
}

/**
 * Wallet service
 */
@Singleton
export class Wallet extends ServiceRequestsBase {
    public target: string = 'auth-service'

    /**
     * Return key
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: KeyType, key: string): Promise<string> {
        const wallet = await this.request<IWalletAccount>(WalletEvents.GET_KEY, { token, type, key });
        return wallet.key;
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string) {
        await this.request<IWalletAccount>(WalletEvents.SET_KEY, { token, type, key, value });
    }
}
