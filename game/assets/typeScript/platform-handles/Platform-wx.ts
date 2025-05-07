import { IPlatformHandle, IPlatformInfo, IShareInfo, TShareCallback, TVideoAdCallback } from "../platform/IPlatformMgr";

export class PlatformWX implements IPlatformHandle {

    private _videoId: string
    private _interstitialId: string
    private _shareInfo: IShareInfo;

    private _interstitialAd: any
    private _videoAd: any

    get app() {
        return window['wx']
    }

    init(platformInfo: IPlatformInfo, shareInfo: IShareInfo) {
        this._videoId = platformInfo.videoId_wx
        this._interstitialId = platformInfo.interstitialId_wx
        this._shareInfo = shareInfo

        this.app.showShareMenu({
            withShareTicket: true,
            menus: ['shareAppMessage', 'shareTimeline']
        })
        this.app.onShareAppMessage(() => {
            return {
                title: this._shareInfo.title,
                imageUrl: this._shareInfo.imageUrl
            }
        })
        this.app.onShareTimeline(() => {
            return {
                title: this._shareInfo.title,
                imageUrl: this._shareInfo.imageUrl
            }
        })

        this._interstitialAd = this.app.createInterstitialAd({ adUnitId: this._interstitialId })
        this._interstitialAd.onLoad(() => {
            console.log('插屏 广告加载成功')
            this.showInterstitialAd()
        })

        this._videoAd = this.app.createRewardedVideoAd({
            adUnitId: this._videoId
        })
        this._videoAd.onLoad(() => {
            console.log('激励视频 广告加载成功')
        })
        this._videoAd.onError((err: any) => {
            console.log(err)
        })
    }

    showShare(call: TShareCallback): void {
        this.app.shareAppMessage({
            title: this._shareInfo.title,
            imageUrl: this._shareInfo.imageUrl
        })
        setTimeout(() => {
            call && call(null)
        }, 500);
    }

    showInterstitialAd(): void {
        this._interstitialAd.show().catch((err) => {
            console.error(err)
        })
    }

    showVideoAd(call: TVideoAdCallback): void {
        if (!this._videoAd) {
            call && call('加载失败')
            return
        }
        this._videoAd.onClose((res: any) => {
            if (res && res.isEnded || res === undefined) {
                call && call(null);
            }
            else {
                call && call('未观看完整广告，不予奖励')
            }
        })
        this._videoAd.show().catch(() => {
            this._videoAd.load()
                .then(() => this._videoAd.show())
                .catch((err: any) => {
                    call && call('加载失败,请稍后再试')
                })
        })
    }

}