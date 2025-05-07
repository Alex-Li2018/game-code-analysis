import { _decorator, Component, Label, Node } from 'cc';
import { BYTEDANCE } from 'cc/env';
import { ToolTS } from './ToolTS';
const { ccclass, property } = _decorator;

export const DY_Reward_Event = 'DY_Reward_Event';

@ccclass('DyGiftTS')
export class DyGiftTS extends Component {

    @property({ type: Node })
    giftBtn: Node | null = null //入口有礼按钮

    @property({ type: Node })
    giftAlert: Node | null = null //入口有礼对话框

    @property({ type: Label })
    confirmLabel: Label = null

    private _isFromSidebar = false //状态，表示是否从侧边栏进入
    private _tt: any = null;

    start() {
        // this.giftBtn.active = true
        // this.confirmLabel.string = '立即领奖'
        // this._isFromSidebar = true
        // return
        if (!BYTEDANCE) {
            this.node.active = false
            return
        }

        let showDyGift = ToolTS.detectionInterval(7 * 24, 'dyGift')
        if (!showDyGift) {
            this.node.active = false
            return
        }

        this._tt = window['tt']
        console.log(this._tt)
        this._tt?.onShow((res: any) => {
            //判断用户是否是从侧边栏进来的
            //如果是从侧边栏进来的，立即领奖,否则 去首页侧边栏（未完成）
            this._isFromSidebar = (res.launch_from == 'homepage' && res.location == 'sidebar_card')
            this.confirmLabel.string = this._isFromSidebar ? '立即领奖' : '去首页侧边栏'
        });
        //判断用户是否支持侧边栏进入功能，有些旧版的抖音没有侧边栏，这种情况就把入口有礼那个按钮给隐藏掉
        this._tt?.checkScene({
            scene: "sidebar",
            success: (res: any) => {
                console.log(res)
                this.giftBtn.active = true
            },
            fail: (res: any) => {
                console.log(res)
                this.giftBtn.active = false
            }
        });
    }

    //点击入口有礼按钮，显示对话框
    openAlert() {
        this.giftAlert.active = true
    }
    //关闭入口有礼对话框
    closeAlert() {
        this.giftAlert.active = false
    }

    //去侧边栏按钮的逻辑
    private _toSidebar() {
        this._tt?.navigateToScene({
            scene: "sidebar",
            success: (res: any) => {
                console.log("navigate to scene success");
            },
            fail: (res: any) => {
                console.log("navigate to scene fail: ", res);
                alert('跳转失败，请稍后再试！')
            },
        });
    }

    //领取奖励的逻辑，自己实现
    private _getAward() {
        //获取奖励的逻辑（记得控制领取次数，比如每天一次，因为侧边栏是可以无限进入的）
        this.node.active = false
        ToolTS.writeDetectionInterval('dyGift')
        this.node.emit(DY_Reward_Event);
    }

    onConfirm() {
        if (this._isFromSidebar) {
            this._getAward()
        }
        else {
            this._toSidebar()
        }
    }

    update(deltaTime: number) {

    }
}

