import { IPlatformHandle, IPlatformInfo, IShareInfo, TShareCallback, TVideoAdCallback } from "../platform/IPlatformMgr";

export class PlatformDY implements IPlatformHandle {

    private _videoId: string
    private _interstitialId: string
    private _shareInfo: IShareInfo;

    private _interstitialAd: any
    private _videoAd: any

    get app() {
        return window['tt']
    }

    init(platformInfo: IPlatformInfo, shareInfo: IShareInfo) {
        this._videoId = platformInfo.videoId_dy
        this._interstitialId = platformInfo.interstitialId_dy
        this._shareInfo = shareInfo

        this.app.onShareAppMessage(() => {
            return {
                title: this._shareInfo.title,
                imageUrl: this._shareInfo.imageUrl,
                desc: this._shareInfo.desc
            }
        })

        this._interstitialAd = this.app.createInterstitialAd({
            adUnitId: this._interstitialId
        });
        this._interstitialAd.load()
            .then(() => {
                this.showInterstitialAd();
            })
            .catch((err) => {
                console.log(err);
            });

        this._videoAd = this.app.createRewardedVideoAd({
            adUnitId: this._videoId,
        })
        this._videoAd.onLoad(() => {
            console.log('激励视频 广告加载成功')
        })
        this._videoAd.onError((errMsg: string, errCode: number) => {
            console.log(errMsg)
        })

    }

    showShare(call: TShareCallback): void {
        this.app.shareAppMessage({
            title: this._shareInfo.title,
            imageUrl: this._shareInfo.imageUrl,
            desc: this._shareInfo.desc,
            success: () => {
                call && call(null)
            },
            fail: () => {
                call && call('分享失败')
            },
        })
    }

    showInterstitialAd(): void {
        this._interstitialAd.show().then(() => {
            console.log("插屏广告展示成功");
        });
    }

    showVideoAd(call: TVideoAdCallback): void {
        if (!this._videoAd) {
            call && call('加载失败')
            return
        }
        this._videoAd.onClose((data: any) => {
            if (data && data.isEnded) {
                call && call(null);
            }
            else {
                call && call('未观看完整广告，不予奖励')
            }
        })
        this._videoAd.show().catch((err) => {
            this._videoAd.show()
                .then(() => this._videoAd.show())
                .catch((err: any) => {
                    call && call('加载失败,请稍后再试')
                })
        });
    }

}