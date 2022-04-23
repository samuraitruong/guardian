import { createConnection } from 'typeorm';
import { loggerAPI } from '@api/logger.service';
import { Log } from '@entity/log';
import { MessageBrokerChannel } from 'common';
import { connect } from 'nats';

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: true,
        useUnifiedTopology: true,
        entities: ['dist/entity/*.js'],
        cli: {
            entitiesDir: 'dist/entity',
        },
    }),
    connect({ servers: [process.env.MQ_ADDRESS], name: 'LOG_SERVICE' }),
]).then(async (values) => {
    const [db, nc] = values;
    const channel = new MessageBrokerChannel(nc, 'logger-service');
    channel.publish('service.ready', 'LOG_SERVICE');

    const logRepository = db.getMongoRepository(Log);

    await loggerAPI(channel, logRepository);

    console.log('logger service started');
});
