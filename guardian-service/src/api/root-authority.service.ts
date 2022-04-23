import { DidDocument } from '@entity/did-document';
import { RootConfig } from '@entity/root-config';
import { VcDocument } from '@entity/vc-document';
import { MessageBrokerChannel } from 'common';
import { IAddressBookConfig, IRootConfig, MessageAPI, MessageError, MessageResponse, SchemaEntity } from 'interfaces';
import { MongoRepository } from 'typeorm';

/**
 * Connect to the message broker methods of working with Address books.
 *
 * @param channel - channel
 * @param configRepository - table with Address books
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 */
export const rootAuthorityAPI = async function (
    channel: MessageBrokerChannel,
    configRepository: MongoRepository<RootConfig>
) {
    /**
     * Return Address books, VC Document and DID Document
     *
     * @param {string} payload - DID
     *
     * @returns {IFullConfig} - approve documents
     */
    channel.response(MessageAPI.GET_ROOT_CONFIG, async (msg) => {
        const rootConfig = await configRepository.findOne({
            where: { did: { $eq: msg } },
        });
        if (!rootConfig) {
            return new MessageResponse(null);
        }
        return new MessageResponse(rootConfig);
    });

    /**
     * Create Address book
     *
     * @param {Object} payload - Address book config
     *
     * @returns {IRootConfig} - Address book config
     */
    channel.response(MessageAPI.SET_ROOT_CONFIG, async (msg) => {
        const rootObject = configRepository.create(msg as RootConfig);
        const result: IRootConfig = await configRepository.save(rootObject);
        return new MessageResponse(result);
    });

    /**
     * Return Address book
     *
     * @param {Object} payload - filters
     * @param {string} payload.owner - owner DID
     *
     * @returns {IAddressBookConfig} - Address book
     */
    channel.response<any, any>(MessageAPI.GET_ADDRESS_BOOK, async (msg) => {
        if (!msg) {
            return new MessageError('Address book not found');
        }

        const rootConfig = await configRepository.findOne({
            where: { did: { $eq: msg.owner } },
        });
        if (!rootConfig) {
            return new MessageResponse(null);
        }
        const config: IAddressBookConfig = {
            owner: rootConfig.did,
            addressBook: rootConfig.addressBook,
            vcTopic: rootConfig.vcTopic,
            didTopic: rootConfig.didTopic,
        };
        return new MessageResponse(config);
    });
};
