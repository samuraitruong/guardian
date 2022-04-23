import { ILog, IPageParameters, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { Log } from '@entity/log';
import { MessageBrokerChannel } from 'common';
export const loggerAPI = async function (
    channel: MessageBrokerChannel,
    logRepository: MongoRepository<Log>
): Promise<void> {
    /**
     * Add log message
     *
     * @param {Message} [payload] - Log message
     *
     */
    channel.response<ILog, MessageResponse<any> | MessageError<any>>(MessageAPI.WRITE_LOG, async (message) => {
        console.log('write log', message);
        try {
            if (!message) {
                throw new Error('Log message is empty');
            }
            await logRepository.save(message);
            return new MessageResponse(null);
        } catch (e) {
            return new MessageError(e);
        }
    });

    /**
     * Get logs.
     *
     * @param {any} [payload.filters] - Response type
     * @param {IPageParameters} [payload.pageParameters] - Page parameters
     *
     * @return {any} - Logs
     */
    channel.response<any, MessageResponse<any> | MessageError<any>>(MessageAPI.GET_LOGS, async (payload) => {
        try {
            const filters = (payload && payload.filters) || {};
            if (filters.datetime && filters.datetime.$gte && filters.datetime.$lt) {
                filters.datetime.$gte = new Date(filters.datetime.$gte);
                filters.datetime.$lt = new Date(filters.datetime.$lt);
            }
            const pageParameters = (payload && payload.pageParameters) || {};
            const allFilters = {
                where: filters,
                order: {
                    datetime: (payload.sortDirection && payload.sortDirection.toUpperCase()) || 'DESC',
                },
                ...pageParameters,
            };
            let logs = await logRepository.find(allFilters);
            let totalCount = await logRepository.count(filters);
            return new MessageResponse({ logs, totalCount });
        } catch (e) {
            return new MessageError(e.toString());
        }
    });

    /**
     * Get attributes.
     *
     * @param {any} [payload.name] - Name to filter
     *
     * @return {any} - Attributes
     */
    channel.response<any, MessageResponse<any> | MessageError<any>>(MessageAPI.GET_ATTRIBUTES, async (payload) => {
        try {
            const nameFilter = `.*${payload.name || ''}.*`;
            let attrCursor = await logRepository.aggregate([
                { $project: { attributes: '$attributes' } },
                { $unwind: { path: '$attributes' } },
                {
                    $match: {
                        attributes: { $regex: nameFilter, $options: 'i' },
                    },
                },
                {
                    $group: {
                        _id: null,
                        uniqueValues: { $addToSet: '$attributes' },
                    },
                },
                { $unwind: { path: '$uniqueValues' } },
                { $limit: 20 },
                {
                    $group: {
                        _id: null,
                        uniqueValues: { $addToSet: '$uniqueValues' },
                    },
                },
            ]);
            const attrObject = await attrCursor.next();
            attrCursor.close();
            return new MessageResponse(attrObject?.uniqueValues?.sort() || []);
        } catch (e) {
            return new MessageError(e.toString());
        }
    });
};
