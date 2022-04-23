import { DidDocument } from '@entity/did-document';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import { DidMethodOperation, HcsVcOperation } from '@hashgraph/did-sdk-js';
import {
    DidDocumentStatus,
    DocumentSignature,
    DocumentStatus,
    IDidDocument,
    IVCDocument,
    IVPDocument,
    MessageAPI,
    MessageError,
    MessageResponse,
} from 'interfaces';
import { MongoRepository } from 'typeorm';
import { VCHelper } from 'vc-modules';
import { VcHelper } from '@helpers/vcHelper';
import { MessageBrokerChannel } from 'common';

/**
 * Connect to the message broker methods of working with VC, VP and DID Documents
 *
 * @param channel - channel
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 * @param vpDocumentRepository - table with VP Documents
 * @param vc - verification methods VC and VP Documents
 */
export const documentsAPI = async function (
    channel: MessageBrokerChannel,
    didDocumentRepository: MongoRepository<DidDocument>,
    vcDocumentRepository: MongoRepository<VcDocument>,
    vpDocumentRepository: MongoRepository<VpDocument>
): Promise<void> {
    const vc = new VcHelper();
    const getDIDOperation = function (operation: DidMethodOperation | DidDocumentStatus) {
        switch (operation) {
            case DidMethodOperation.CREATE:
                return DidDocumentStatus.CREATE;
            case DidMethodOperation.DELETE:
                return DidDocumentStatus.DELETE;
            case DidMethodOperation.UPDATE:
                return DidDocumentStatus.UPDATE;
            case DidDocumentStatus.CREATE:
                return DidDocumentStatus.CREATE;
            case DidDocumentStatus.DELETE:
                return DidDocumentStatus.DELETE;
            case DidDocumentStatus.FAILED:
                return DidDocumentStatus.FAILED;
            case DidDocumentStatus.UPDATE:
                return DidDocumentStatus.UPDATE;
            default:
                return DidDocumentStatus.NEW;
        }
    };

    const getVCOperation = function (operation: HcsVcOperation) {
        switch (operation) {
            case HcsVcOperation.ISSUE:
                return DocumentStatus.ISSUE;
            case HcsVcOperation.RESUME:
                return DocumentStatus.RESUME;
            case HcsVcOperation.REVOKE:
                return DocumentStatus.REVOKE;
            case HcsVcOperation.SUSPEND:
                return DocumentStatus.SUSPEND;
            default:
                return DocumentStatus.NEW;
        }
    };

    /**
     * Return DID Documents by DID
     *
     * @param {Object} payload - filters
     * @param {string} payload.did - DID
     *
     * @returns {IDidDocument[]} - DID Documents
     */
    channel.response<any, any>(MessageAPI.GET_DID_DOCUMENTS, async (msg) => {
        const reqObj = { where: { did: { $eq: msg.did } } };
        const didDocuments: IDidDocument[] = await didDocumentRepository.find(reqObj);
        return new MessageResponse(didDocuments);
    });

    /**
     * Return VC Documents
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.id] - filter by id
     * @param {string} [payload.type] - filter by type
     * @param {string} [payload.owner] - filter by owner
     * @param {string} [payload.issuer] - filter by issuer
     * @param {string} [payload.hash] - filter by hash
     * @param {string} [payload.policyId] - filter by policy id
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    channel.response<any, any>(MessageAPI.GET_VC_DOCUMENTS, async (msg) => {
        try {
            if (msg) {
                const reqObj: any = { where: {} };
                const { owner, assign, issuer, id, hash, policyId, schema, ...otherArgs } = msg;
                if (owner) {
                    reqObj.where['owner'] = { $eq: owner };
                }
                if (assign) {
                    reqObj.where['assign'] = { $eq: assign };
                }
                if (issuer) {
                    reqObj.where['document.issuer'] = { $eq: issuer };
                }
                if (id) {
                    reqObj.where['document.id'] = { $eq: id };
                }
                if (hash) {
                    reqObj.where['hash'] = { $eq: hash };
                }
                if (policyId) {
                    reqObj.where['policyId'] = { $eq: policyId };
                }
                if (schema) {
                    reqObj.where['schema'] = { $eq: schema };
                }
                if (typeof reqObj.where !== 'object') {
                    reqObj.where = {};
                }
                Object.assign(reqObj.where, otherArgs);
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.find(reqObj);
                return new MessageResponse(vcDocuments);
            } else {
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.find();
                return new MessageResponse(vcDocuments);
            }
        } catch (e) {
            return new MessageError(e.message);
        }
    });

    /**
     * Create or update DID Documents
     *
     * @param {IDidDocument} payload - document
     * @param {string} [payload.did] - did
     * @param {string} [payload.operation] - document status
     *
     * @returns {IDidDocument} - new DID Document
     */
    channel.response<any, any>(MessageAPI.SET_DID_DOCUMENT, async (msg) => {
        if (msg.did && msg.operation) {
            const did = msg.did;
            const operation = msg.operation;
            const item = await didDocumentRepository.findOne({
                where: { did: { $eq: did } },
            });
            if (item) {
                item.status = getDIDOperation(operation);
                const result: IDidDocument = await didDocumentRepository.save(item);
                return new MessageResponse(result);
            } else {
                return new MessageError('Document not found');
            }
        } else {
            const didDocumentObject = didDocumentRepository.create(msg);
            const result: IDidDocument[] = await didDocumentRepository.save(didDocumentObject);
            return new MessageResponse(result);
        }
    });

    /**
     * Create or update VC Documents
     *
     * @param {IVCDocument} payload - document
     * @param {string} [payload.hash] - hash
     * @param {string} [payload.operation] - document status
     *
     * @returns {IVCDocument} - new VC Document
     */
    channel.response<any, any>(MessageAPI.SET_VC_DOCUMENT, async (msg) => {
        let result: IVCDocument;

        const hash = msg.hash;
        if (hash) {
            result = await vcDocumentRepository.findOne({
                where: { hash: { $eq: hash } },
            });
        }

        if (result) {
            const operation = msg.operation;
            if (operation) {
                result.hederaStatus = getVCOperation(operation);
            }

            const assign = msg.assign;
            if (assign) {
                result.assign = assign;
            }

            const type = msg.type;
            if (type) {
                result.type = type;
            }

            const option = msg.option;
            if (option) {
                result.option = option;
            }
        }

        if (!result) {
            if (msg.document) {
                result = vcDocumentRepository.create(msg as VcDocument);
            } else {
                return new MessageError('Invalid document');
                return;
            }
        }

        let verify: boolean;
        try {
            const res = await vc.verifySchema(result.document);
            verify = res.ok;
            if (verify) {
                verify = await vc.verifyVC(result.document);
            }
        } catch (error) {
            verify = false;
        }
        result.signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;

        result = await vcDocumentRepository.save(result);
        return new MessageResponse(result);
    });

    /**
     * Create new VP Document
     *
     * @param {IVPDocument} payload - document
     *
     * @returns {IVPDocument} - new VP Document
     */
    channel.response(MessageAPI.SET_VP_DOCUMENT, async (msg) => {
        const vpDocumentObject = vpDocumentRepository.create(msg);
        const result: any = await vpDocumentRepository.save(vpDocumentObject);
        return new MessageResponse(result);
    });

    /**
     * Return VP Documents
     *
     * @param {Object} [payload] - filters
     *
     * @returns {IVPDocument[]} - VP Documents
     */
    channel.response(MessageAPI.GET_VP_DOCUMENTS, async (msg) => {
        if (msg) {
            const document: IVPDocument[] = await vpDocumentRepository.find(msg);
            return new MessageResponse(document);
        } else {
            const documents: IVPDocument[] = await vpDocumentRepository.find();
            return new MessageResponse(documents);
        }
    });
};
