import { PolicyBlockStateData } from '@policy-engine/interfaces';
import { IAuthUser } from '@auth/auth.interface';

/**
 * Block state update method decorator
 */
export function BlockStateUpdate() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const oldValue = descriptor.value;
        descriptor.value = async function (state: PolicyBlockStateData<any>, user: IAuthUser) {
            const stateFromHandler = (await oldValue.call(this, state, user)) || state;
            // await PolicyComponentsUtils.SetBlockState(this.uuid, stateFromHandler, user, this.tag);
        };
    };
}
