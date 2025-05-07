import { BYTEDANCE, WECHAT } from 'cc/env';
import { PlatformDY } from '../platform-handles/Platform-dy';
import { PlatformWX } from '../platform-handles/Platform-wx';
import { IPlatformHandle, IPlatformInfo, IShareInfo, TShareCallback, TVideoAdCallback } from './IPlatformMgr';

export class PlatformMgr {

    platformInfo: IPlatformInfo
    shareInfo: IShareInfo

    private _handle: IPlatformHandle

    private static _instance: PlatformMgr
    static get instance() {
        if (!this._instance) {
            this._instance = new PlatformMgr()
        }
        return this._instance
    }

    init(platformInfo: IPlatformInfo, shareInfo: IShareInfo) {
        this.platformInfo = platformInfo
        this.shareInfo = shareInfo

        this.setHandle(new PlatformWX(), WECHAT)
        this.setHandle(new PlatformDY(), BYTEDANCE)
    }

    //在load场景就要加载好
    setHandle(handle: IPlatformHandle, b: boolean) {
        if (b) {
            handle.init(this.platformInfo, this.shareInfo)
            this._handle = handle
        }
    }

    showShare(call: TShareCallback): void {
        if (!!this._handle && !!this._handle.showShare) {
            this._handle.showShare(call)
        }
        else {
            call(null)
        }
    }

    showInterstitialAd(): void {
        if (!!this._handle && !!this._handle.showInterstitialAd) {
            this._handle.showInterstitialAd()
        }
    }

    showVideoAd(call: TVideoAdCallback): void {
        if (!!this._handle && !!this._handle.showVideoAd) {
            this._handle.showVideoAd(call)
        }
        else {
            call(null)
        }
    }

}
