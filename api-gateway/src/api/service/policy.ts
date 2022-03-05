import {Response, Router} from 'express';
import {AuthenticatedRequest} from '@auth/auth.interface';
import {getMongoRepository} from 'typeorm';
import {User} from '@entity/user';
import {Policy} from '@entity/policy';
import {ModelHelper, SchemaEntity, SchemaHelper, SchemaStatus, UserRole} from 'interfaces';
import yaml, { JSON_SCHEMA } from 'js-yaml';
import {PolicyEngine} from '@helpers/policyEngine';

export const policyAPI = Router();

policyAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const user = await getMongoRepository(User).findOne({ where: { username: { $eq: req.user.username } } });
        let result: any;
        if (user.role === UserRole.ROOT_AUTHORITY) {
            result = await engineService.getPolicies({ owner: user.did });
        } else {
            result = await engineService.getPolicies({ status: 'PUBLISH' });
        }
        res.json(result.map(item => {
            delete item.registeredUsers;
            return item;
        }));
    } catch (e) {
        res.status(500).send({ code: 500, message: 'Server error' });
    }
});

policyAPI.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const policies = await engineService.createPolicy(req.body, req.user)
        res.json(policies);
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

policyAPI.get('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const model = (await engineService.getPolicy(req.params.policyId)) as Policy;
        delete model.registeredUsers;
        res.send(model);
    } catch (e) {
        res.status(500).send({ code: 500, message: e.message });
    }
});

policyAPI.put('/:policyId', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        const model = await engineService.getPolicy(req.params.policyId) as Policy;
        const policy = req.body;

        model.config = policy.config;
        model.name = policy.name;
        model.version = policy.version;
        model.description = policy.description;
        model.topicDescription = policy.topicDescription;
        model.policyRoles = policy.policyRoles;
        delete model.registeredUsers;

        const result = await engineService.savePolicy(model, req.user, req.params.policyId);

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error' });
    }
});
//
policyAPI.put('/:policyId/publish', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.json(await engineService.publishPolicy(req.body, req.user, req.params.policyId));
    } catch (error) {
        res.status(500).send({ code: 500, message: error.message || error });
    }
});

policyAPI.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.validatePolicy(req.body, req.user));
    } catch (e) {
        console.log(e);
        res.status(500).send({ code: 500, message: e.message });
    }
});
//
policyAPI.get('/:policyId/blocks', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.getPolicyBlocks(req.user, req.params.policyId));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.getBlockData(req.user, req.params.policyId, req.params.uuid));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/:policyId/blocks/:uuid', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.setBlockData(req.user, req.params.policyId, req.params.uuid, req.body));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/tag/:tagName', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.getBlockByTagName(req.user, req.params.policyId, req.params.tagName));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/blocks/:uuid/parents', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.getBlockParents(req.user, req.params.policyId, req.params.uuid));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/to-yaml', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.body || !req.body.json) {
        res.status(500).send({ code: 500, message: 'Bad json' });
    }
    try {
        const yml = yaml.dump(req.body.json, {
            indent: 4,
            lineWidth: -1,
            noRefs: false,
            noCompatMode: true,
            schema: JSON_SCHEMA
        });
        res.json({ yml });
    } catch (error) {
        res.status(500).send({ code: 500, message: 'Bad json' });
    }
});

policyAPI.post('/from-yaml', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.body || !req.body.yaml) {
        res.status(500).send({ code: 500, message: 'Bad yaml' });
    }
    try {
        const json = yaml.load(req.body.yaml, {
            schema: JSON_SCHEMA,
            json: true
        });
        res.json({ json });
    } catch (error) {
        res.status(500).send({ code: 500, message: 'Bad yaml' });
    }
});

policyAPI.get('/:policyId/export/file', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.exportFile(req.user, req.params.policyId));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.get('/:policyId/export/message', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.exportMessage(req.user, req.params.policyId));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/message', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.importMessage(req.user, req.body.messageId));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/file', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.importFile(req.user, req.body));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/message/preview', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.importMessagePreview(req.user, req.body.messageId));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});

policyAPI.post('/import/file/preview', async (req: AuthenticatedRequest, res: Response) => {
    const engineService = new PolicyEngine();

    try {
        res.send(await engineService.importFilePreview(req.user, req.body));
    } catch (e) {
        console.error(e);
        res.status(500).send({ code: 500, message: 'Unknown error: ' + e.message });
    }
});