export type TShareCallback = (err: string | null) => void;
export type TVideoAdCallback = (err: string | null) => void;

export interface IPlatformHandle {
    init(platformInfo: IPlatformInfo, shareInfo: IShareInfo): void;

    /**
     * 分享
     * @param call 
     */
    showShare?(call: TShareCallback): void;

    /**
     * 插屏广告
     */
    showInterstitialAd(): void;

    /**
     * 激励广告
     * @param call 
     */
    showVideoAd?(call: TVideoAdCallback): void;

}

export interface IShareInfo {
    title: string,
    imageUrl: string,
    desc?: string
}

export interface IPlatformInfo {
    videoId_wx: string,
    interstitialId_wx: string,

    videoId_dy: string,
    interstitialId_dy: string,
}
