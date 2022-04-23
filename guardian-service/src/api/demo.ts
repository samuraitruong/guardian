import { MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger, MessageBrokerChannel } from 'common';
import { HederaHelper } from 'vc-modules';

export const demoAPI = async function (channel: MessageBrokerChannel): Promise<void> {
    channel.response(MessageAPI.GENERATE_DEMO_KEY, async (msg) => {
        try {
            const OPERATOR_ID = process.env.OPERATOR_ID;
            const OPERATOR_KEY = process.env.OPERATOR_KEY;
            const treasury = await HederaHelper.setOperator(OPERATOR_ID, OPERATOR_KEY).SDK.newAccount(30);
            return new MessageResponse({
                id: treasury.id.toString(),
                key: treasury.key.toString(),
            });
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
};
