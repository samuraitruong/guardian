import { Token } from '@entity/token';
import { IToken, MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger, MessageBrokerChannel } from 'common';
import { MongoRepository } from 'typeorm';

/**
 * Connect to the message broker methods of working with tokens.
 *
 * @param channel - channel
 * @param tokenRepository - table with tokens
 */
export const tokenAPI = async function (
    channel: MessageBrokerChannel,
    tokenRepository: MongoRepository<Token>
): Promise<void> {
    /**
     * Create new token
     *
     * @param {IToken} payload - token
     *
     * @returns {IToken[]} - all tokens
     */
    channel.response(MessageAPI.SET_TOKEN, async (msg) => {
        const tokenObject = tokenRepository.create(msg);
        const result = await tokenRepository.save(tokenObject);
        const tokens = await tokenRepository.find();
        return new MessageResponse(tokens);
    });

    /**
     * Return tokens
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.tokenId] - token id
     *
     * @returns {IToken[]} - tokens
     */
    channel.response<any, any>(MessageAPI.GET_TOKENS, async (msg) => {
        if (msg) {
            if (msg.tokenId) {
                const reqObj: any = { where: {} };
                reqObj.where['tokenId'] = { $eq: msg.tokenId };
                const tokens: IToken[] = await tokenRepository.find(reqObj);
                return new MessageResponse(tokens);
                return;
            }
            if (msg.ids) {
                const reqObj: any = { where: {} };
                reqObj.where['tokenId'] = { $in: msg.ids };
                const tokens: IToken[] = await tokenRepository.find(reqObj);
                return new MessageResponse(tokens);
                return;
            }
        }
        const tokens: IToken[] = await tokenRepository.find();
        return new MessageResponse(tokens);
    });

    /**
     * Import tokens
     *
     * @param {IToken[]} payload - tokens
     *
     * @returns {IToken[]} - all tokens
     */
    channel.response<any, any>(MessageAPI.IMPORT_TOKENS, async (msg) => {
        try {
            let items: IToken[] = msg;
            if (!Array.isArray(items)) {
                items = [items];
            }
            const existingTokens = await tokenRepository.find();
            const existingTokensMap = {};
            for (let i = 0; i < existingTokens.length; i++) {
                existingTokensMap[existingTokens[i].tokenId] = true;
            }
            items = items.filter((token: any) => !existingTokensMap[token.tokenId]);
            const tokenObject = tokenRepository.create(items);
            const result = await tokenRepository.save(tokenObject);
            const tokens = await tokenRepository.find();
            return new MessageResponse(tokens);
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error.message);
        }
    });
};
