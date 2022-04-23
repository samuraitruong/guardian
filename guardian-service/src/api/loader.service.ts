import { MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { HcsDidRootKey } from '@hashgraph/did-sdk-js';
import { Schema } from '@entity/schema';
import { MongoRepository } from 'typeorm';
import { DidDocument } from '@entity/did-document';
import { Logger, MessageBrokerChannel } from 'common';

/**
 * Connect to the message broker methods of working with Documents Loader.
 *
 * @param channel - channel
 * @param didDocumentLoader - DID Documents Loader
 * @param schemaDocumentLoader - Schema Documents Loader
 */
export const loaderAPI = async function (
    channel: MessageBrokerChannel,
    didDocumentRepository: MongoRepository<DidDocument>,
    schemaRepository: MongoRepository<Schema>
): Promise<void> {
    /**
     * Return DID Document
     *
     * @param {Object} payload - filters
     * @param {string} payload.did - DID
     *
     * @returns {any} - DID Document
     */
    channel.response<any, any>(MessageAPI.LOAD_DID_DOCUMENT, async (msg) => {
        try {
            const iri = msg.did;
            const did = HcsDidRootKey.fromId(iri).getController();
            const reqObj = { where: { did: { $eq: did } } };
            const didDocuments = await didDocumentRepository.findOne(reqObj);
            if (didDocuments) {
                return new MessageResponse(didDocuments.document);
            }
            return new MessageError('Document not found');
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            return new MessageError(error.message);
        }
    });

    /**
     * Load schema document
     * @param {string} [payload.url] Document URL
     *
     * @returns Schema document
     */
    channel.response(MessageAPI.LOAD_SCHEMA_DOCUMENT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Document not found');
            }

            if (Array.isArray(msg)) {
                const schema = await schemaRepository.find({
                    where: { documentURL: { $in: msg } },
                });
                return new MessageResponse(schema);
            } else {
                const schema = await schemaRepository.findOne({
                    where: { documentURL: { $eq: msg } },
                });
                return new MessageResponse(schema);
            }
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            return new MessageError(error.message);
        }
    });

    /**
     * Get schema context
     * @param {string} [payload.url] Context URL
     *
     * @returns Schema context
     */
    channel.response(MessageAPI.LOAD_SCHEMA_CONTEXT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Document not found');
                return;
            }
            if (Array.isArray(msg)) {
                const schema = await schemaRepository.find({
                    where: { contextURL: { $in: msg } },
                });
                return new MessageResponse(schema);
            } else {
                const schema = await schemaRepository.findOne({
                    where: { contextURL: { $eq: msg } },
                });
                return new MessageResponse(schema);
            }
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            return new MessageError(error.message);
        }
    });
};
