import { _decorator, Component, Node, sys, EventTouch, UITransform, Vec3, Vec2, Tween, tween, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ToolTS')
export class ToolTS {

    static tweenWithNodeFadeIn(node: Node): Tween<UIOpacity> {
        let uiOpacity = this.getUIOpacityWithNode(node)
        uiOpacity.opacity = 0
        return tween(uiOpacity).to(0.2, {
            opacity: 255
        })
    }

    static tweenWithNodeFadeOut(node: Node): Tween<UIOpacity> {
        let uiOpacity = this.getUIOpacityWithNode(node)
        return tween(uiOpacity).to(0.2, {
            opacity: 0
        })
    }

    static getUIOpacityWithNode(node: Node): UIOpacity {
        let uiOpacity = node.getComponent(UIOpacity)
        if (!uiOpacity) {
            uiOpacity = node.addComponent(UIOpacity)
        }
        return uiOpacity
    }

    /** 从event中获取点击的node */
    static getNodeInEvent(event: EventTouch): Node {
        const children = event.currentTarget.children
        const eventLocation = event.getLocation()
        for (let i = 0; i < children.length; i++) {
            const block = children[i];
            const isContains = block.getComponent(UITransform).hitTest(eventLocation)
            if (isContains) {
                return block
            }
        }
        return undefined
    }

    /** 在世界坐标不变的情况下修改parent */
    static nodeSetNewParent(node: Node, parentNode: Node) {
        node.setPosition(this.getNodePositionOnOtherNode(node, parentNode))
        node.parent = parentNode
    }

    /** 获取position基于另一个node的本地坐标 */
    static getNodePositionOnOtherNode(node: Node, otherNode: Node): Vec3 {
        let worldPos = node.getComponent(UITransform).convertToWorldSpaceAR(Vec3.ZERO)
        return otherNode.getComponent(UITransform).convertToNodeSpaceAR(worldPos)
    }

    /** 获取随机数 */
    static getRandomNumber(min = 0, max = 1): number {
        if (min == max) {
            return min
        }
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    /** 复制到剪切板 */
    static copyToClipBoard(string: string) {
        navigator.clipboard.writeText(string).then(() => {
            console.log('复制数据成功')
        })
    }

    static getRandomIndexArray(length: number): number[] {
        let arr = []
        for (let i = 0; i < length; i++) {
            arr.push(i)
        }
        arr.sort((a, b) => {
            return Math.random() > 0.5 ? -1 : 1;
        })
        return arr
    }

    /** 是否是编辑器 */
    static isEditor(): boolean {
        return sys.platform === sys.Platform.EDITOR_PAGE
    }

    /** 检测间隔时间,只查询,配合writeDetectionInterval使用,单位小时,比如2天 2*24 */
    static detectionInterval(interval: number, key: string): boolean {
        let cacheKey = "detectionInterval_" + key
        let lastCalledTime: number = Number(this.getCache(cacheKey) || '0')
        const now = Date.now();
        const timeSinceLastCall = now - lastCalledTime;

        if (timeSinceLastCall >= (interval * 60 * 60 * 1000)) {
            return true
        }
        return false
    }

    /** 强行写入间隔时间,拉长间隔 */
    static writeDetectionInterval(key: string) {
        let cacheKey = "detectionInterval_" + key
        const now = Date.now();
        this.setCache(cacheKey, now.toString())
    }

    static caches: { [key: string]: any } = {}
    static getCache(k: string): any {
        let v = this.caches[k]
        if (!v) {
            v = sys.localStorage.getItem(k)
            this.caches[k] = v
        }
        return v
    }

    static setCache(k: string, v: any) {
        this.caches[k] = v
        sys.localStorage.setItem(k, v)
    }

}

