import { _decorator, Component, Node, rect, Sprite, SpriteFrame, tween, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('block')
export class block extends Component {

    @property(Node)
    maskNode = null

    @property(Sprite)
    sprite = null

    @property(SpriteFrame)
    spriteFrames = []

    blockType: any;
    bottomIndex: number;
    isXiaoChu: boolean;
    isMoving: boolean;
    oldPosition: Vec3;

    private _rect = rect();

    init(type: number) {
        this.node.scale = new Vec3(1, 1, 1)
        this.blockType = type
        this.touch = true
        this.sprite.spriteFrame = this.spriteFrames[this.blockType]
    }

    initWithBottom(type: number) {
        this.node.scale = new Vec3(1, 1, 1)
        this.oldPosition = new Vec3(0, 0, 0)
        this.isMoving = true
        this.isXiaoChu = false
        this.bottomIndex = -1
        this.blockType = type
        this.touch = false
        this.sprite.spriteFrame = this.spriteFrames[this.blockType]
        this.maskNode.active = false
    }

    changeType(type: number) {
        this.blockType = type
        const scale = 0.9
        tween(this.sprite.node)
            .to(0.1, { scale: new Vec3(0, 0, 0) })
            .call(() => {
                this.sprite.spriteFrame = this.spriteFrames[this.blockType]
            })
            .to(0.1, { scale: new Vec3(scale, scale, scale) })
            .start()
    }

    get touch(): boolean {
        return !this.maskNode.active
    }
    set touch(value: boolean) {
        this.maskNode.active = !value
    }

    getBoundingBox() {
        let padding = 5
        let uiTransform = this.node.getComponent(UITransform)
        let pos = this.node.position
        let width = uiTransform.width
        let height = uiTransform.height
        this._rect.set(pos.x - width / 2 + padding, pos.y - height / 2 + padding, width - padding * 2, height - padding * 2)
        return this._rect
    }

}

