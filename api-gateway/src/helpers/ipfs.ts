import { CommonSettings, MessageAPI } from 'interfaces';
import { Singleton } from './decorators/singleton';
import { ServiceRequestsBase } from './serviceRequestsBase';

/**
 * IPFS service
 */
@Singleton
export class IPFS extends ServiceRequestsBase {
    constructor() {
        super('ipfs-client');
    }
    /**
     * Return hash of added file
     * @param {ArrayBuffer} file file to upload on IPFS
     *
     * @returns {{ cid: string, url: string }} - hash
     */
    public async addFile(file: ArrayBuffer): Promise<{ cid: string; url: string }> {
        const res = await this.rawRequest(MessageAPI.IPFS_ADD_FILE, file);
        console.log('addFile addFile addFile ', res);
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(`IPFS: ${res.error}`);
        }
        return res.body;
    }

    /**
     * Returns file by IPFS CID
     * @param cid IPFS CID
     * @param responseType Response type
     * @returns File
     */
    public async getFile(cid: string, responseType: 'json' | 'raw' | 'str'): Promise<any> {
        const res = await this.request<any>(MessageAPI.IPFS_GET_FILE, {
            cid,
            responseType,
        });
        console.log('get ipfs response', res);
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return responseType === 'raw' ? res.body.data : res.body;
    }

    /**
     * Update settings
     * @param settings Settings to update
     */
    public async updateSettings(settings: CommonSettings): Promise<void> {
        const res = await this.request<any>(MessageAPI.UPDATE_SETTINGS, settings);
        console.log('updateSettings result ', res);
        if (!res) {
            throw new Error('Invalid IPFS response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
    }

    /**
     * Get settings
     * @returns Settings
     */
    public async getSettings(): Promise<any> {
        return await this.request<any>(MessageAPI.GET_SETTINGS, {});
    }
}
