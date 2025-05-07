import * as cc from 'cc';
import { EDITOR } from 'cc/env';

@cc._decorator.ccclass
export class RootScene extends cc.Component {

    protected start(): void {
        if (!EDITOR) {
            let viewSize = cc.view.getVisibleSize();
            let designSize = cc.view.getDesignResolutionSize();
            if (viewSize.height / viewSize.width < designSize.height / designSize.width) {
                cc.view.setResolutionPolicy(cc.ResolutionPolicy.SHOW_ALL);
                let canvasFn = cc.Canvas.prototype.onEnable;
                cc.Canvas.prototype.onEnable = function () {
                    canvasFn && canvasFn.call(this);
                    let self = this as cc.Canvas;
                    self.getComponent(cc.Mask) ?? self.addComponent(cc.Mask);
                };
            }
        }
    }

}