import FastMQ from 'fastmq';
import { Logger, MessageBrokerChannel } from 'common';
import { NFTStorage } from 'nft.storage';
import { createConnection } from 'typeorm';
import { fileAPI } from './api/file.service';
import { Settings } from './entity/settings';
import { connect } from 'nats';

const PORT = process.env.PORT || 3006;

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
    connect({ servers: [process.env.MQ_ADDRESS], name: 'IPFS_CLIENT' }),
]).then(async (values) => {
    const [db, nc] = values;

    const settingsRepository = db.getMongoRepository(Settings);
    const nftApiKey = await settingsRepository.findOne({
        name: 'NFT_API_KEY',
    });
    const channel = new MessageBrokerChannel(nc, 'ipfs-client');
    new Logger().setChannel(new MessageBrokerChannel(nc, 'logger-service'));
    await fileAPI(channel, new NFTStorage({ token: nftApiKey?.value || process.env.NFT_API_KEY }), settingsRepository);

    new Logger().info('ipfs-client service started', ['IPFS_CLIENT']);
    console.log('ipfs-client service started');
});
