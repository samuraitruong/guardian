import { ApplicationStates } from 'interfaces';
import { Logger } from 'logger-helper';
import { NFTStorage } from 'nft.storage';
import { createConnection } from 'typeorm';
import { MessageBrokerChannel, ApplicationState } from 'common';
import { fileAPI } from './api/file.service';
import { Settings } from './entity/settings';

const PORT = process.env.PORT || 3006;

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: true,
        useUnifiedTopology: true,
        entities: [
            'dist/entity/*.js'
        ],
        cli: {
            entitiesDir: 'dist/entity'
        }
    }),
    MessageBrokerChannel.connect("IPFS_CLIENT")
]).then(async values => {
    const [db, cn] = values;
    const state = new ApplicationState('IPFS_CLIENT');
    const channel = new MessageBrokerChannel(cn, 'ipfs-client');

    state.setChannel(channel);
    state.updateState(ApplicationStates.STARTED);
    const settingsRepository = db.getMongoRepository(Settings);
    const nftApiKey = await settingsRepository.findOne({
        name: "NFT_API_KEY"
    });

    new Logger().setChannel(channel);
    state.updateState(ApplicationStates.INITIALIZING);
    await fileAPI(channel, new NFTStorage({ token: nftApiKey?.value || process.env.NFT_API_KEY }), settingsRepository);

    state.updateState(ApplicationStates.READY);
    new Logger().info('ipfs-client service started', ['IPFS_CLIENT']);
    console.log('ipfs-client service started');
})
