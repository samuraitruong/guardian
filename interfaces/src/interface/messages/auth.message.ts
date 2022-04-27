export interface IGetKeyMessage {
    token: string;
    type: string;
    key: string
}
export interface ISetKeyMessage extends IGetKeyMessage {
    value: string;
}