import { createConnection } from 'typeorm';
import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/accountService';
import { WalletService } from '@api/walletService';
import { Logger, MessageBrokerChannel } from 'common';
import { connect } from 'nats';

const PORT = process.env.PORT || 3002;

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: process.env.ENVIRONMENT !== 'production',
        useUnifiedTopology: true,
        entities: ['dist/entity/*.js'],
        cli: {
            entitiesDir: 'dist/entity',
        },
    }),
    connect({ servers: [process.env.MQ_ADDRESS], name: 'AUTH_SERVICE' }),
]).then(async ([db, nc]) => {
    await fixtures();
    const channel = new MessageBrokerChannel(nc, 'auth-service');
    channel.publish('service.ready', 'AUTH_SERVICE');

    new Logger().setChannel(new MessageBrokerChannel(nc, 'logger-service'));
    new AccountService(channel);
    new WalletService(channel);

    new Logger().info('Auth service started', ['AUTH_SERVICE']);
    console.log('Auth service started');
});
