import { SourceAddon, StateField } from '@policy-engine/helpers/decorators';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicySourceBlock } from '@policy-engine/policy-engine.interface';

@SourceAddon({
    blockType: 'paginationAddon'
})
export class PaginationAddon {

    @StateField()
    private state;

    constructor() {
        if (!this.state) {
            this.state = {}
        }
    }

    public async getState(user: IAuthUser):Promise<any> {
        if (!this.state[user.did]) {
            this.state[user.did] = {
                size: 20,
                itemsPerPage: 10,
                page: 0
            }
        }
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const totalCount = (await (ref.parent as IPolicySourceBlock).getSources(user)).length;

        if (this.state[user.did].size !== totalCount) {
            this.state[user.did].size = totalCount;
        }

        return this.state[user.did]
    }

    public async getData(user: IAuthUser): Promise<any> {
        return this.getState(user);
    }

    public async setData(user: IAuthUser, data: any): Promise<void> {
        const oldState = this.state;
        oldState[user.did] = data;
        this.state = oldState;

        const ref = PolicyComponentsUtils.GetBlockRef(this);
        PolicyComponentsUtils.BlockUpdateFn(ref.parent.uuid, {}, user, ref.tag);
    }
}
