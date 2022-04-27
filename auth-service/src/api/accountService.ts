import { IAuthUser } from '@api/auth.interface';
import { sign, verify } from 'jsonwebtoken';
import { getMongoRepository } from 'typeorm';
import { User } from '@entity/user';
import * as util from 'util';
import crypto from 'crypto';
import { Logger } from 'logger-helper';
import { MessageBrokerChannel, MessageResponse, MessageError } from 'common';
import { AuthEvents, UserRole } from 'interfaces';

export class AccountService {
    constructor(
        private channel: MessageBrokerChannel
    ) {
        this.registerListeners();
    }

    registerListeners(): void {
        this.channel.response<any, any>(AuthEvents.GET_USER_BY_TOKEN, async (msg) => {
            const { token } = msg;

            try {
                const decryptedToken = await util.promisify<string, any, Object, IAuthUser>(verify)(token, process.env.ACCESS_TOKEN_SECRET, {});
                const user = await getMongoRepository(User).findOne({ username: decryptedToken.username });
                return (new MessageResponse(user));
            } catch (e) {
                return (new MessageError(e.message))
            }
        });

        this.channel.response<any, any>(AuthEvents.REGISTER_NEW_USER, async (msg) => {
            try {
                const userRepository = getMongoRepository(User);

                const { username, password, role } = msg;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const checkUserName = await userRepository.count({ username }) > 0;
                if (checkUserName) {
                    return (new MessageError('An account with the same name already exists.'));
                }

                const user = userRepository.create({
                    username: username,
                    password: passwordDigest,
                    role: role,
                    parent: null,
                    did: null
                });
                return (new MessageResponse(await getMongoRepository(User).save(user)));

            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message))
            }
        });

        this.channel.response<any, any>(AuthEvents.GENERATE_NEW_TOKEN, async (msg) => {
            try {
                const { username, password } = msg;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const user = await getMongoRepository(User).findOne({ username });
                if (user && passwordDigest === user.password) {
                    const accessToken = sign({
                        username: user.username,
                        did: user.did,
                        role: user.role
                    }, process.env.ACCESS_TOKEN_SECRET);
                    return (new MessageResponse({
                        username: user.username,
                        did: user.did,
                        role: user.role,
                        accessToken: accessToken
                    }))
                } else {
                    return (new MessageError('Bad user'));
                }

            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message))
            }
        });

        this.channel.response<any, any>(AuthEvents.GET_ALL_USER_ACCOUNTS, async (msg) => {
            try {
                const userAccounts = (await getMongoRepository(User).find({ role: UserRole.USER })).map((e) => ({
                    username: e.username,
                    parent: e.parent,
                    did: e.did
                }));
                return (new MessageResponse(userAccounts));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });

        this.channel.response<any, any>(AuthEvents.GET_ALL_ROOT_AUTHORITY_ACCOUNTS, async (msg) => {
            try {
                const userAccounts = (await getMongoRepository(User).find({ role: UserRole.ROOT_AUTHORITY })).map((e) => ({
                    username: e.username,
                    did: e.did
                }));
                return (new MessageResponse(userAccounts));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });


        this.channel.response<any, any>(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO, async (msg) => {
            try {
                const userAccounts = (await getMongoRepository(User).find()).map((e) => ({
                    parent: e.parent,
                    did: e.did,
                    username: e.username,
                    role: e.role
                }));
                return (new MessageResponse(userAccounts));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });

        this.channel.response<any, any>(AuthEvents.GET_USER, async (msg) => {
            const { username } = msg;

            try {
                return (new MessageResponse(await getMongoRepository(User).findOne({ username })));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });

        this.channel.response<any, any>(AuthEvents.GET_USER_BY_ID, async (msg) => {
            const { did } = msg;

            try {
                return (new MessageResponse(await getMongoRepository(User).findOne({ did })));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });

        this.channel.response<any, any>(AuthEvents.GET_USERS_BY_ID, async (msg) => {
            const { dids } = msg;

            try {
                return (new MessageResponse(await getMongoRepository(User).find({
                    where: {
                        did: { $in: dids }
                    }
                })));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });

        this.channel.response<any, any>(AuthEvents.GET_USERS_BY_ROLE, async (msg) => {
            const { role } = msg;

            try {
                return (new MessageResponse(await getMongoRepository(User).find({ role })));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });

        this.channel.response<any, any>(AuthEvents.UPDATE_USER, async (msg) => {
            const { username, item } = msg;

            try {
                return (new MessageResponse(await getMongoRepository(User).update({ username }, item)));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });

        this.channel.response<any, any>(AuthEvents.SAVE_USER, async (msg) => {
            const { user } = msg;

            try {
                return (new MessageResponse(await getMongoRepository(User).save(user)));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return (new MessageError(e.message));
            }
        });
    }
}
