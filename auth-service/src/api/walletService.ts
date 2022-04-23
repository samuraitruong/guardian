import { AuthEvents, MessageError, MessageResponse, WalletEvents } from 'interfaces';
import util from 'util';
import { IAuthUser } from '@api/auth.interface';
import { verify } from 'jsonwebtoken';
import { getMongoRepository } from 'typeorm';
import { User } from '@entity/user';
import { WalletAccount } from '@entity/wallet-account';
import { Logger } from 'common';

export class WalletService {
    constructor(private channel) {
        this.registerListeners();
    }

    registerListeners(): void {
        this.channel.response(WalletEvents.GET_KEY, async (msg) => {
            const { token, type, key } = msg;

            try {
                return new MessageResponse(
                    await getMongoRepository(WalletAccount).findOne({
                        token,
                        type: type + '|' + key,
                    })
                );
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return new MessageError(e.message);
            }
        });

        this.channel.response(WalletEvents.SET_KEY, async (msg) => {
            const { token, type, key, value } = msg;

            try {
                const walletAcc = getMongoRepository(WalletAccount).create({
                    token: token,
                    type: type + '|' + key,
                    key: value,
                });
                return new MessageResponse(await getMongoRepository(WalletAccount).save(walletAcc));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return new MessageError(e.message);
            }
        });
    }
}
