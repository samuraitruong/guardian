import { Settings } from '@entity/settings';
import { Topic } from '@entity/topic';
import { Logger } from 'logger-helper';
import { MongoRepository } from 'typeorm';
import { ApiResponse } from '@api/api-response';
import { MessageBrokerChannel, MessageResponse, MessageError } from 'common';
import { MessageAPI, CommonSettings } from 'interfaces';

/**
 * Connecting to the message broker methods of working with root address book.
 * 
 * @param channel - channel
 * @param approvalDocumentRepository - table with approve documents
 */
export const configAPI = async function (
    channel: MessageBrokerChannel,
    settingsRepository: MongoRepository<Settings>,
    topicRepository: MongoRepository<Topic>,
): Promise<void> {
    ApiResponse(channel, MessageAPI.GET_TOPIC, async (msg) => {
        const topic = await topicRepository.findOne(msg);
        return (new MessageResponse(topic));
    });

    /**
     * Update settings
     * 
     */
    ApiResponse(channel, MessageAPI.UPDATE_SETTINGS, async (msg) => {
        try {
            const settings = msg as CommonSettings;
            const oldOperatorId = await settingsRepository.findOne({
                name: 'OPERATOR_ID'
            });
            if (oldOperatorId) {
                await settingsRepository.update({
                    name: 'OPERATOR_ID'
                }, {
                    value: settings.operatorId
                });
            }
            else {
                await settingsRepository.save({
                    name: 'OPERATOR_ID',
                    value: settings.operatorId
                });
            }

            const oldOperatorKey = await settingsRepository.findOne({
                name: 'OPERATOR_KEY'
            });
            if (oldOperatorKey) {
                await settingsRepository.update({
                    name: 'OPERATOR_KEY'
                }, {
                    value: settings.operatorKey
                });
            }
            else {
                await settingsRepository.save({
                    name: 'OPERATOR_KEY',
                    value: settings.operatorKey
                });
            }
            return (new MessageResponse(null));
        }
        catch (e) {
            new Logger().error(e.message, ['GUARDIAN_SERVICE']);
            return (new MessageError(e))
        }
    });

    /**
     * Get settings
     * 
     */
    ApiResponse(channel, MessageAPI.GET_SETTINGS, async (msg) => {
        try {
            const operatorId = await settingsRepository.findOne({
                name: 'OPERATOR_ID'
            });
            const operatorKey = await settingsRepository.findOne({
                name: 'OPERATOR_KEY'
            });
            return (new MessageResponse({
                operatorId: operatorId?.value || process.env.OPERATOR_ID,
                operatorKey: operatorKey?.value || process.env.OPERATOR_KEY
            }));
        }
        catch (e) {
            new Logger().error(e.message, ['GUARDIAN_SERVICE']);
            return (new MessageError(e))
        }
    });
}
