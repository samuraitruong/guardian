import { CommonSettings, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { NFTStorage } from 'nft.storage';
import Blob from 'cross-blob';
import axios, { ResponseType } from 'axios';
import axiosRetry from 'axios-retry';
import { MongoRepository } from 'typeorm';
import { Settings } from '../entity/settings';
import { Logger, MessageBrokerChannel } from 'common';

export const IPFS_PUBLIC_GATEWAY = 'https://ipfs.io/ipfs';

/**
 * Connecting to the message broker methods of working with IPFS.
 *
 * @param channel - channel
 * @param node - IPFS client
 */
export const fileAPI = async function (
    channel: MessageBrokerChannel,
    client: NFTStorage,
    settingsRepository: MongoRepository<Settings>
): Promise<void> {
    /**
     * Add file and return hash
     *
     * @param {ArrayBuffer} [payload] - file to add
     *
     * @returns {string} - hash of added file
     */
    channel.response<any, any>(MessageAPI.IPFS_ADD_FILE, async (msg) => {
        try {
            const binaryData = Buffer.from(msg.content, 'base64');
            let blob = new Blob([binaryData]);
            const cid = await client.storeBlob(blob);
            const url = `${IPFS_PUBLIC_GATEWAY}/${cid}`;
            return new MessageResponse({ cid, url });
        } catch (e) {
            new Logger().error(e.toString(), ['IPFS_CLIENT']);
            return new MessageError(e.message);
        }
    });

    /**
     * Get file from IPFS.
     *
     * @param {string} [payload.cid] - File CID.
     * @param {string} [payload.responseType] - Response type
     *
     * @return {any} - File
     */
    channel.response<any, any>(MessageAPI.IPFS_GET_FILE, async (msg) => {
        try {
            axiosRetry(axios, {
                retries: 3,
                shouldResetTimeout: true,
                retryCondition: (error) =>
                    axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED',
                retryDelay: (retryCount) => 10000,
            });

            if (!msg || !msg.cid || !msg.responseType) {
                throw 'Invalid cid';
            }

            const fileRes = await axios.get(`${IPFS_PUBLIC_GATEWAY}/${msg.cid}`, {
                responseType: 'arraybuffer',
                timeout: 20000,
            });
            switch (msg.responseType) {
                case 'str':
                    return {
                        body: Buffer.from(fileRes.data, 'binary').toString(),
                    };
                case 'json':
                    return {
                        body: Buffer.from(fileRes.data, 'binary').toJSON(),
                    };
                default:
                    return { body: fileRes.data };
            }
        } catch (e) {
            new Logger().error(e.toString(), ['IPFS_CLIENT']);
            return { error: e.message };
        }
    });

    /**
     * Update settings.
     *
     * @param {CommonSettings} [payload] - Settings
     *
     */
    channel.response(MessageAPI.UPDATE_SETTINGS, async (msg) => {
        try {
            console.log('ipfs update settings', msg);
            const settings = msg as CommonSettings;
            const oldNftApiKey = await settingsRepository.findOne({
                name: 'NFT_API_KEY',
            });
            if (oldNftApiKey) {
                await settingsRepository.update(
                    {
                        name: 'NFT_API_KEY',
                    },
                    {
                        value: settings.nftApiKey,
                    }
                );
            } else {
                await settingsRepository.save({
                    name: 'NFT_API_KEY',
                    value: settings.nftApiKey,
                });
            }

            client = new NFTStorage({ token: settings.nftApiKey });
            return new MessageResponse({});
        } catch (e) {
            new Logger().error(e.toString(), ['IPFS_CLIENT']);
            console.log(e);
            return new MessageError(e.message);
        }
    });

    /**
     * Get settings.
     *
     * @return {any} - settings
     */
    channel.response(MessageAPI.GET_SETTINGS, async (msg) => {
        const nftApiKey = await settingsRepository.findOne({
            name: 'NFT_API_KEY',
        });
        return new MessageResponse({
            nftApiKey: nftApiKey?.value || process.env.NFT_API_KEY,
        });
    });
};
