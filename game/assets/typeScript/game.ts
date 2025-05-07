import { _decorator, assetManager, AudioClip, AudioSource, Color, EventTouch, input, Input, instantiate, Label, Node, NodePool, Prefab, resources, Sprite, sys, tween, UITransform, Vec2, Vec3 } from 'cc';
import { DY_Reward_Event, DyGiftTS } from '../resource/dyGift/DyGiftTS';
import { block } from './block';
import { gameData } from './gameData';
import { IPlatformInfo, IShareInfo } from './platform/IPlatformMgr';
import { PlatformMgr } from './platform/PlatformMgr';
import { RootScene } from './RootScene';
const { ccclass, property } = _decorator;

//设置是否是编辑模式
const EditMode = false;

@ccclass('game')
export class game extends RootScene {

    @property(Node)
    gameGroup: Node = null

    @property(Node)
    homeGroup: Node = null

    @property(Node)
    gamePause: Node = null

    @property(Prefab)
    blockPre: Prefab = null

    @property(Node)
    topBlocks: Node = null

    @property(Node)
    bottomBlocks: Node = null

    @property(Node)
    tipLabel: Node = null

    @property(Label)
    homeLevelLabel: Label = null

    @property(Label)
    labelLevel: Label = null

    @property(Node)
    gameOver: Node = null

    @property(Node)
    gamePass: Node = null

    @property(Node)
    propDetail: Node = null

    @property(Node)
    gameEdit: Node = null

    @property(Label)
    gameEditLabel: Label = null

    @property(Prefab)
    editBlockPre: Prefab = null

    @property(Label)
    propLabels: Label[] = []

    numTouchStart: number;
    numTouchEnd: number;
    gameData: gameData;
    numLevel: number;
    blockWidth: number;
    bottomStartX: number;
    bottomBlocksMoveY: number;
    gameType: number;
    numBlockTypeCount: number;
    numBlockType: number;
    numBlocksRandomCount: number;
    numBlocksAddCount: number;
    propArr: number[];
    didRevive = false;
    audioSource: AudioSource;
    isEditing: boolean;
    numTypeEdit: number;
    numBlockEditMove: number;
    numTypeRandom: number;
    numRandom: number;
    wx: any;
    propIndex: number;
    blockPool: NodePool;
    tipTween: any = undefined;
    audioDataList: any[];

    start() {
        //加载分享的logo
        resources.load('logo', (err, data) => {
            let logoUrl = (data && data.nativeUrl) || ""
            let platformInfo: IPlatformInfo = {
                //微信激励视频id
                videoId_wx: 'xxxxxxxxxxxx',
                //微信插屏广告id
                interstitialId_wx: 'xxxxxxxxxxxx',
                //抖音激励视频id
                videoId_dy: 'xxxxxxxxxxxx',
                //抖音插屏广告id
                interstitialId_dy: 'xxxxxxxxxxxx',
            }
            //分享信息设置
            const shareInfo: IShareInfo = {
                imageUrl: logoUrl,
                title: '超解压的休闲小游戏，你能闯到第几关？',
                desc: '快来玩!'
            }
            /**
             * PlatformMgr.instance为抖音和微信 分享、广告的控制器
             * 调用时控制器内部会自动区分平台处理
             * 尽量提前调用init函数来加载微信抖音的广告组件
             */
            PlatformMgr.instance.init(platformInfo, shareInfo)

            //调用分享的函数
            PlatformMgr.instance.showShare
            //调用插屏广告的函数
            PlatformMgr.instance.showInterstitialAd
            //调用激励视频广告的函数
            PlatformMgr.instance.showVideoAd
        })

        this.wx = window['wx']

        this.blockPool = new NodePool()
        this.numLevel = this.getLevel() //0：第一关
        this.numBlockTypeCount = 15 //随机关卡，种类的最少个数
        this.numBlockType = 0 //随机关卡，下一关比该关卡多几个种类
        this.numBlocksRandomCount = 99 //随机关卡，最少个块数 必须是3的倍数
        this.numBlocksAddCount = 6 //随机关卡，下一关比该关卡多几个块 必须是3的倍数
        this.propArr = [0, 0, 0]//每个道具状态 (下标: 0:移出道具，1：撤回道具 2：洗牌道具) 值: 0=未拥有  1=已拥有  2=已使用
        this.didRevive = false;
        this.propIndex = -1//当前操作的道具下标 
        this.isEditing = EditMode //是否是编辑模式
        this.numTypeEdit = 1//(0:减，1：加)
        this.numTypeRandom = 2 //随机模式下，用那种类型的坐标（0：随机的 1：规范的 2：有随机也有规范）
        this.numRandom = 200 //编辑模式下，随机按钮产生的块的个数

        if (EditMode) {
            this.homeGroup.active = false
            this.gameGroup.active = true
        }
        else {
            this.homeGroup.active = true
            this.gameGroup.active = false
        }
        this.gameEdit.active = EditMode

        this.audioSource = this.node.getComponent(AudioSource)
        this.loadAudio()

        this.bottomBlocksMoveY = 120//移出的y坐标
        this.blockWidth = 80
        this.bottomStartX = - 280 + 40
        this.gameData = this.node.getComponent(gameData)

        this.createBlocksEdit()

        this.init()

        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);

        this.getComponentInChildren(DyGiftTS).node.on(DY_Reward_Event, () => {
            this.showTip('刷新 + 1');
            this.propArr[2] = 1
            this.reloadProps()
        });

    }

    wantUseProp(index: number) {
        this.propIndex = index
        const state = this.propArr[index]
        if (state == 0) {
            this.showPropDetail()
        }
        else if (state == 1) {
            this.userProp(index)
        }
        else {
            this.showTip('每关只能使用一次!')
        }
    }

    userProp(index: number) {
        var success: boolean
        if (index == 0) {
            success = this.clickRemoveThreeBtn()
        }
        else if (index == 1) {
            success = this.clickBackBtn()
        }
        else if (index == 2) {
            success = this.clickRandomBtn()
        }
        if (success) {
            this.propArr[index] = 2
            this.reloadProps()
        }
    }

    //分享给好友
    shareFirend(call: Function) {
        PlatformMgr.instance.showShare(err => {
            if (!err) {
                call && call();
            }
            else {
                this.showTip(err)
            }
        })
    }

    //播放激励视频广告
    showJiLiShiPin(call: Function) {
        PlatformMgr.instance.showVideoAd(err => {
            if (!err) {
                call && call();
            }
            else {
                this.showTip(err)
            }
        })
    }

    init() {
        this.gameType = 0 //（-1：游戏失败，0：正常游戏，1：游戏通关）
        this.numTouchStart = -1
        this.numTouchEnd = -1

        for (let i = 0; i < this.propArr.length; i++) {
            if (this.propArr[i] === 2) {
                this.propArr[i] = 0;
            }
        }
        this.didRevive = false;

        this.gameOver.active = false
        this.gamePass.active = false
        this.tipLabel.scale = new Vec3(0, 0, 0)

        this.reloadLevelInfo()
        this.reloadProps()

        if (this.isEditing) {
            let children = this.topBlocks.children
            for (let i = 0; i < children.length; i++) {
                let ts_block = children[i].getComponent(block)
                let num_type_random = Math.floor(Math.random() * 15)
                ts_block.init(num_type_random)
            }
        } else {
            let children = this.topBlocks.children
            for (let i = children.length - 1; i >= 0; i--) {
                this.onBlockKilled(children[i])
            }
            this.createBlocks()
        }

        this.bottomBlocks.removeAllChildren()

        this.checkTouchEnable()
        this.clickRandomBtn()
    }

    createBlocksEdit() {
        //调整编辑模式的布局
        let i_num = 15 //行
        let j_num = 12 //列
        let itemW = 40
        let itemH = 45
        let leftMargin = - (i_num - 1) * itemW / 2
        let topMargin = -(j_num - 1) * itemH / 2 + 110

        for (let i = 0; i < i_num; i++) {
            for (let j = 0; j < j_num; j++) {
                let node_block_edit = instantiate(this.editBlockPre)
                node_block_edit.parent = this.gameEdit
                node_block_edit.setPosition(i * itemW + leftMargin, j * itemH + topMargin, 0)
                if (i % 2 == 0) {
                    node_block_edit.getComponent(Sprite).color = new Color(0, 0, 0, 100)
                } else {
                    node_block_edit.getComponent(Sprite).color = new Color(0, 0, 0, 200)
                }

            }
        }
    }

    showTip(str: string) {
        this.tipLabel.getChildByName('Label').getComponent(Label).string = str
        if (this.tipTween) {
            this.tipTween.stop()
        }
        this.tipTween = tween(this.tipLabel)
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .delay(1)
            .to(0.1, { scale: new Vec3(0, 0, 0) })
            .call(() => {
                this.tipTween = undefined
            })
            .start()
    }

    reloadProps() {
        for (let i = 0; i < this.propLabels.length; i++) {
            const state = this.propArr[i]
            if (state == 0) {
                this.propLabels[i].string = '+'
            }
            else if (state == 1) {
                this.propLabels[i].string = '1'
            }
            else {
                this.propLabels[i].string = '0'
            }
        }
    }

    reloadLevelInfo() {
        let num_level = this.numLevel + 1
        this.labelLevel.string = '第 ' + num_level + ' 关'
        this.homeLevelLabel.string = this.labelLevel.string

        if (this.isEditing) {
            if (this.numTypeEdit == 1) {
                this.labelLevel.string = '添加块模式'
            } else {
                this.labelLevel.string = '删除块模式'
            }

            let children = this.topBlocks.children
            let blockCount = children.length

            if (blockCount % 3 == 0) {
                this.gameEditLabel.string = '总共有' + blockCount + '个块，是3的倍数'
                this.gameEditLabel.color = new Color(255, 255, 255)
            } else {
                this.gameEditLabel.string = '总共有' + blockCount + '个块，不是3的倍数'
                this.gameEditLabel.color = new Color(255, 0, 0)
            }

        }
    }

    onBlockKilled(node: Node) {
        // enemy 应该是一个 cc.Node
        this.blockPool.put(node); // 和初始化时的方法一样，将节点放进对象池，这个方法会同时调用节点的 removeFromParent
    }

    createBlocks() {
        let blockCount = -1
        let num_type = this.numBlockTypeCount + this.numLevel * this.numBlockType
        if (this.gameData.arrTypeLevel[this.numLevel]) {
            num_type = this.gameData.arrTypeLevel[this.numLevel]
        }

        if (num_type > 15) {
            num_type = 15
        }

        let num_type_random = Math.floor(Math.random() * num_type)//5


        if (!this.gameData.arrPosLevel[this.numLevel]) {//随机生成
            let num_block_geShu = this.numBlocksRandomCount + this.numLevel * this.numBlocksAddCount

            let arr_v3_block_edit = []
            let children = this.gameEdit.children
            for (let i = 0; i < children.length; i++) {
                if (children[i].name == 'blockEdit') {
                    arr_v3_block_edit.push(children[i].getPosition())
                }
            }

            for (let i = 0; i < num_block_geShu; i++) {
                blockCount++ //0,1,2,3

                let node_block = this.getBlock();

                let xx = -250 + Math.random() * 500
                let yy = -60 + Math.random() * 510

                if (this.numTypeRandom == 1) {
                    let i_v3_random = Math.floor(Math.random() * arr_v3_block_edit.length)
                    xx = arr_v3_block_edit[i_v3_random].x
                    yy = arr_v3_block_edit[i_v3_random].y
                } else if (this.numTypeRandom == 2 && Math.random() > 0.5) {
                    let i_v3_random = Math.floor(Math.random() * arr_v3_block_edit.length)
                    xx = arr_v3_block_edit[i_v3_random].x
                    yy = arr_v3_block_edit[i_v3_random].y
                }

                node_block.setPosition(xx, yy, 0)
                node_block.parent = this.topBlocks
                let ts_block = node_block.getComponent(block)

                if (blockCount % 3 == 0) {
                    num_type_random = Math.floor(Math.random() * num_type)//6,7
                }
                ts_block.init(num_type_random)//6,6,6,7,7,7
            }

            return
        }

        for (let i = 0; i < this.gameData.arrPosLevel[this.numLevel].length; i++) {
            blockCount++ //0,1,2,3
            let node_block = this.getBlock();
            let xx = this.gameData.arrPosLevel[this.numLevel][i].x
            let yy = this.gameData.arrPosLevel[this.numLevel][i].y
            node_block.setPosition(xx, yy, 0)
            node_block.parent = this.topBlocks
            let ts_block = node_block.getComponent(block)

            if (blockCount % 3 == 0) {
                num_type_random = Math.floor(Math.random() * num_type)//6,7
            }
            ts_block.init(num_type_random)//6,6,6,7,7,7
        }
    }

    //在底部生成元素块
    createBlockToBottomBlocks(b_type: number, v3_block_start: Vec3) {
        let node_block = this.getBlock();
        node_block.parent = this.bottomBlocks

        let ts_block = node_block.getComponent(block)
        ts_block.initWithBottom(b_type)

        let index = this.getIndexWithBottomBlocks()
        this.reloadBottomBlocks(node_block)

        let xx = this.bottomStartX + this.blockWidth * index
        //node_block.setPosition(xx,0,0)

        let v3_world = this.topBlocks.getComponent(UITransform).convertToWorldSpaceAR(v3_block_start)
        let v3_node_di = this.bottomBlocks.getComponent(UITransform).convertToNodeSpaceAR(v3_world)

        node_block.setPosition(v3_node_di)
        ts_block.oldPosition = v3_node_di

        tween(node_block)
            .to(0.1, { position: new Vec3(xx, 0, 0) })
            .call(() => {
                this.checkThreeBlockEquals(node_block)
            })
            .start()

    }

    //判断是否可以消除
    checkThreeBlockEquals(node_block: Node) {
        let ts_block = node_block.getComponent(block)
        ts_block.isMoving = false
        let num_di_block = ts_block.bottomIndex
        let children = this.bottomBlocks.children
        let arr_blockType = []
        for (let i = 0; i < children.length; i++) {
            let ts_block_2 = children[i].getComponent(block)
            if (ts_block.blockType == ts_block_2.blockType && ts_block_2.isXiaoChu == false) {
                arr_blockType.push(children[i])
            }
        }

        let is_xiaoChu = false
        if (arr_blockType.length == 3) {
            for (let i = arr_blockType.length - 1; i >= 0; i--) {
                arr_blockType[i].getComponent(block).isXiaoChu = true
                tween(arr_blockType[i])
                    .delay(0.05)
                    .to(0.1, { scale: new Vec3(0, 0,) })
                    .removeSelf()
                    .start()
                //arr_blockType[i].removeFromParent()
                is_xiaoChu = true
            }
        }

        if (is_xiaoChu) {
            this.playAudio('sound_e_clean')
            let children_2 = this.bottomBlocks.children
            for (let i = 0; i < children_2.length; i++) {
                let ts_block_2 = children_2[i].getComponent(block)
                if (ts_block_2.bottomIndex > num_di_block) {
                    ts_block_2.bottomIndex = ts_block_2.bottomIndex - 3
                    let xx = this.bottomStartX + this.blockWidth * ts_block_2.bottomIndex
                    //children_2[i].setPosition(xx,0,0)
                    tween(children_2[i])
                        .delay(0.05)
                        .to(0.08, { position: new Vec3(xx, 0, 0) })
                        .start()
                }
            }
        }

        let num_xiaoChu_geShu = 0
        let children_2 = this.bottomBlocks.children
        for (let i = 0; i < children_2.length; i++) {
            let ts_block = children_2[i].getComponent(block)
            if (ts_block.isXiaoChu) {
                num_xiaoChu_geShu++
            }
        }

        if (children_2.length - num_xiaoChu_geShu >= 7) {
            this.gameType = -1
            this.playAudio('sound_lose')
            //console.log('游戏通关失败');

            this.gameOver.getChildByName('btn_fh').active = !this.didRevive;

            this.scheduleOnce(function () {
                this.gameOver.active = true
            }, 0.3)
        }

    }

    //得到在底部的位置
    getIndexWithBottomBlocks() {
        let children = this.bottomBlocks.children
        let block_end = children[children.length - 1]
        let ts_block_end = block_end.getComponent(block)
        let num_xiaoChu = 0

        for (let i = 0; i < children.length; i++) {
            let ts_block = children[i].getComponent(block)
            if (ts_block.isXiaoChu) {
                num_xiaoChu++
            }
        }

        if (children.length - num_xiaoChu == 1) {
            ts_block_end.bottomIndex = 0
        }

        for (let i = children.length - 2; i >= 0; i--) {
            let ts_block_2 = children[i].getComponent(block)
            if (ts_block_end.blockType == ts_block_2.blockType && ts_block_2.isXiaoChu == false) {
                ts_block_end.bottomIndex = ts_block_2.bottomIndex + 1
                return ts_block_end.bottomIndex
            }
        }

        ts_block_end.bottomIndex = children.length - 1 - num_xiaoChu

        return ts_block_end.bottomIndex
    }

    //刷新在底部的位置
    reloadBottomBlocks(node_block: Node) {
        let num_di = node_block.getComponent(block).bottomIndex
        let children = this.bottomBlocks.children
        for (let i = 0; i < children.length; i++) {
            let ts_block = children[i].getComponent(block)
            if (node_block.uuid == children[i].uuid || ts_block.isXiaoChu) {
                continue
            }
            if (ts_block.bottomIndex >= num_di) {
                ts_block.bottomIndex++
                let xx = this.bottomStartX + this.blockWidth * ts_block.bottomIndex
                tween(children[i])
                    .to(0.1, { position: new Vec3(xx, 0, 0) })
                    .start()
            }
        }
    }

    //判断叠加
    checkTouchEnable() {
        let children = this.topBlocks.children
        for (let i = 0; i < children.length; i++) {
            let ts_block_1 = children[i].getComponent(block)
            let rect_1 = ts_block_1.getBoundingBox()
            ts_block_1.touch = true
            for (let j = i + 1; j < children.length; j++) {
                let ts_block_2 = children[j].getComponent(block)
                let rect_2 = ts_block_2.getBoundingBox()

                if (rect_1.intersects(rect_2)) {
                    ts_block_1.touch = false
                    break
                }
            }
        }
    }

    onTouchStart(event: EventTouch) {

        if (this.gameType != 0) {
            return
        }

        if (this.checkHasBlockIsMoving()) {
            return
        }

        this.numTouchStart = -1
        let v2_touchStart = event.getUILocation()
        let v3_touchStart = this.topBlocks.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(v2_touchStart.x, v2_touchStart.y, 0))
        let v3_touchStart_edit = this.gameEdit.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(v2_touchStart.x, v2_touchStart.y, 0))

        if (this.isEditing) {
            if (this.numTypeEdit == 1) {
                let children = this.gameEdit.children
                for (let i = children.length - 1; i >= 0; i--) {

                    let node_UITransform = children[i].getComponent(UITransform)
                    if (node_UITransform.getBoundingBox().contains(new Vec2(v3_touchStart_edit.x, v3_touchStart_edit.y))) {
                        this.numBlockEditMove = i
                        let node_block = this.getBlock();
                        node_block.parent = this.topBlocks
                        node_block.setPosition(children[i].getPosition())
                        let ts_block = node_block.getComponent(block)
                        let num_type_random = Math.floor(Math.random() * 15)
                        ts_block.init(num_type_random)
                        this.reloadLevelInfo()
                        this.checkTouchEnable()
                        break
                    }
                }
            } else if (this.numTypeEdit == 0) {
                let children = this.topBlocks.children
                for (let i = children.length - 1; i >= 0; i--) {
                    let node_UITransform = children[i].getComponent(UITransform)
                    if (node_UITransform.getBoundingBox().contains(new Vec2(v3_touchStart.x, v3_touchStart.y))) {
                        //console.log('点中了：'+i);
                        this.onBlockKilled(children[i])
                        this.reloadLevelInfo()
                        this.checkTouchEnable()
                        break
                    }
                }
            }

            return
        }

        let children = this.topBlocks.children
        for (let i = children.length - 1; i >= 0; i--) {
            let ts_block = children[i].getComponent(block)
            if (ts_block.touch === false) {
                continue
            }

            let node_UITransform = children[i].getComponent(UITransform)
            if (node_UITransform.getBoundingBox().contains(new Vec2(v3_touchStart.x, v3_touchStart.y))) {
                this.playAudio('sound_click')
                this.numTouchStart = i
                //console.log('点中了：'+i);
                tween(children[i])
                    .to(0.1, { scale: new Vec3(1.2, 1.2, 1.2) })
                    .start()
                break
            }
        }

    }

    onTouchMove(event: EventTouch) {
    }

    onTouchEnd(event: EventTouch) {

        if (this.isEditing) {
            return
        }

        if (this.gameType != 0) {
            return
        }

        if (this.checkHasBlockIsMoving()) {
            return
        }

        let v2_touchStart = event.getUILocation()
        let v3_touchStart = this.topBlocks.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(v2_touchStart.x, v2_touchStart.y, 0))

        let children = this.topBlocks.children
        for (let i = children.length - 1; i >= 0; i--) {
            let ts_block = children[i].getComponent(block)
            if (ts_block.touch === false) {
                continue
            }

            let node_UITransform = children[i].getComponent(UITransform)
            if (node_UITransform.getBoundingBox().contains(new Vec2(v3_touchStart.x, v3_touchStart.y))) {
                this.numTouchEnd = i
                //console.log('确认点中了：'+i);
                if (this.numTouchStart == this.numTouchEnd) {
                    let ts_block_1 = children[i].getComponent(block)
                    let block_type = ts_block_1.blockType
                    this.createBlockToBottomBlocks(block_type, children[i].getPosition())
                    this.onBlockKilled(children[i])
                    this.checkTouchEnable()
                    break
                }
            }
        }

        if (this.numTouchStart != -1) {
            tween(children[this.numTouchStart])
                .to(0.1, { scale: new Vec3(1., 1, 1) })
                .start()
        }

        let children_1 = this.topBlocks.children
        if (children_1.length == 0) {
            this.gameType = 1
            this.playAudio('sound_win')
            //console.log('游戏通关');
            this.numLevel++

            this.setLevel()

            this.scheduleOnce(function () {
                this.gamePass.active = true
            }, 0.5)

        }

    }

    checkHasBlockIsMoving() {
        let is_moving = false
        let children = this.bottomBlocks.children
        if (children.length > 0) {
            let ts_block = children[children.length - 1].getComponent(block)
            is_moving = ts_block.isMoving
        }
        return is_moving
    }

    //按钮回调
    callBackBtn(event: Event, str: string) {
        if (str == 'btn_1') {//出去3个块
            this.wantUseProp(0)
        } else if (str == 'btn_2') {//撤回
            this.wantUseProp(1)
        } else if (str == 'btn_3') {//洗牌按钮
            this.wantUseProp(2)
        } else if (str == 'btn_fh') {
            //复活
            this.showJiLiShiPin(() => {
                this.clickRemoveThreeBtn()

                this.didRevive = true

                this.gameType = 0
                this.gameOver.active = false
            })
        } else if (str == 'btn_cw') {
            this.init()
        } else if (str == 'btn_shuChu') {
            this.outputAllBlock()
        } else if (str == 'btn_yin') {
            let children = this.gameEdit.children
            for (let i = 0; i < children.length; i++) {
                if (children[i].name == 'blockEdit') {
                    children[i].active = !children[i].active
                }
            }
        } else if (str == 'btn_qingKong') {
            this.topBlocks.removeAllChildren()
            this.reloadLevelInfo()
        } else if (str == 'btn_jia') {
            this.numTypeEdit = 1
            this.reloadLevelInfo()
        } else if (str == 'btn_jian') {
            this.numTypeEdit = 0
            this.reloadLevelInfo()
        } else if (str == 'btn_Random') {

            let arr_v3_block_edit = []
            let children = this.gameEdit.children
            for (let i = 0; i < children.length; i++) {
                if (children[i].name == 'blockEdit') {
                    arr_v3_block_edit.push(children[i].getPosition())
                }
            }

            for (let i = 0; i < this.numRandom; i++) {
                let node_block = this.getBlock();
                node_block.parent = this.topBlocks
                let i_v3_random = Math.floor(Math.random() * arr_v3_block_edit.length)
                node_block.setPosition(arr_v3_block_edit[i_v3_random])
                let ts_block = node_block.getComponent(block)
                ts_block.init(Math.floor(Math.random() * 15))
            }

            this.reloadLevelInfo()
            this.checkTouchEnable()
        }
        else if (str == 'playFromHome') {
            this.homeGroup.active = false
            this.gameGroup.active = true
        } else if (str == 'pauseFromGame') {
            this.gamePause.active = true
        } else if (str == 'parseGroupToContinue') {
            this.gamePause.active = false
        } else if (str == 'parseGroupToRestart') {
            this.gamePause.active = false
            this.init()
        } else if (str == 'parseGroupToExit') {
            this.gamePause.active = false
            this.homeGroup.active = true
            this.gameGroup.active = false
            this.init()
        } else if (str == 'btn_passToNext') {
            this.init()
        }
        else if (str == 'btn_getProp') {
            this.propDetail.active = false
            this.showJiLiShiPin(() => {
                this.propArr[this.propIndex] = 1
                this.reloadProps()
            })
        }
        else if (str == 'btn_noGetProp') {
            this.propDetail.active = false
        }
        else if (str == 'btn_lastLevel') {
            this.numLevel--
            this.init()
        }
        else if (str == 'btn_nextLevel') {
            this.numLevel++
            this.init()
        }

    }

    showPropDetail() {
        this.propDetail.active = true
        var title = ''
        var detail = ''
        if (this.propIndex == 0) {
            title = '移出'
            detail = '将三张已选牌移到旁边'
        }
        else if (this.propIndex == 1) {
            title = '撤回'
            detail = '将最近的已选牌移回原处'
        }
        else if (this.propIndex == 2) {
            title = '刷新'
            detail = '将所有未选牌随机打乱'
        }
        this.propDetail.getChildByName('titleLabel').getComponent(Label).string = title
        this.propDetail.getChildByName('detailLabel').getComponent(Label).string = detail
    }

    //撤回
    clickBackBtn() {
        let children = this.bottomBlocks.children
        let i_end = -1
        for (let i = children.length - 1; i >= 0; i--) {
            let ts_block = children[i].getComponent(block)
            if (ts_block.isXiaoChu) {
                continue
            }
            i_end = i
            break
        }

        let num_di_cheHui = -1

        if (i_end != -1) {
            let ts_block = children[i_end].getComponent(block)
            num_di_cheHui = ts_block.bottomIndex
            ts_block.isXiaoChu = true

            let v3_old = ts_block.oldPosition
            let v3_world = this.bottomBlocks.getComponent(UITransform).convertToWorldSpaceAR(v3_old)
            let v3_block = this.topBlocks.getComponent(UITransform).convertToNodeSpaceAR(v3_world)

            tween(children[i_end])
                .to(0.1, { position: v3_old })
                .call(() => {
                    let node_block = this.getBlock();
                    node_block.parent = this.topBlocks
                    node_block.setPosition(v3_block)
                    node_block.getComponent(block).init(ts_block.blockType)
                    this.checkTouchEnable()
                })
                .removeSelf()
                .start()
        }

        if (num_di_cheHui == -1) {
            this.showTip('当前不可用该道具')
            return false
        }

        let children_di_2 = this.bottomBlocks.children
        for (let i = 0; i < children_di_2.length; i++) {

            let ts_block = children_di_2[i].getComponent(block)
            if (ts_block.isXiaoChu) {
                continue
            }
            if (ts_block.bottomIndex > num_di_cheHui && num_di_cheHui != -1) {
                ts_block.bottomIndex = ts_block.bottomIndex - 1
                let xx = this.bottomStartX + this.blockWidth * ts_block.bottomIndex
                tween(children_di_2[i])
                    .to(0.08, { position: new Vec3(xx, 0, 0) })
                    .start()
            }

        }
        return true
    }

    //出去3个块
    clickRemoveThreeBtn() {
        let arr_block_di = []
        let children_di_1 = this.bottomBlocks.children
        for (let i = 0; i < children_di_1.length; i++) {
            let ts_block = children_di_1[i].getComponent(block)
            if (ts_block.bottomIndex < 3 && ts_block.isXiaoChu == false) {
                arr_block_di.push(children_di_1[i])
            }
        }

        let blockCount = arr_block_di.length

        if (blockCount == 0) {
            this.showTip('当前不可用该道具')
            return false
        }

        for (let i = arr_block_di.length - 1; i >= 0; i--) {

            let ts_block = arr_block_di[i].getComponent(block)

            let v3_block_di = new Vec3(-this.blockWidth + ts_block.bottomIndex * this.blockWidth, this.bottomBlocksMoveY, 0)
            let v3_world = this.bottomBlocks.getComponent(UITransform).convertToWorldSpaceAR(v3_block_di)
            let v3_block = this.topBlocks.getComponent(UITransform).convertToNodeSpaceAR(v3_world)

            ts_block.isXiaoChu = true
            tween(arr_block_di[i])
                .to(0.1, { position: v3_block_di })
                .call(() => {
                    let node_block = this.getBlock();
                    node_block.parent = this.topBlocks
                    node_block.setPosition(v3_block)
                    node_block.getComponent(block).init(ts_block.blockType)
                    this.checkTouchEnable()
                    //console.log('v3_block:'+v3_block);
                })
                .removeSelf()
                .start()

            //arr_block_di[i].removeFromParent()
        }

        let children_di_2 = this.bottomBlocks.children
        for (let i = 0; i < children_di_2.length; i++) {

            let ts_block = children_di_2[i].getComponent(block)
            if (ts_block.isXiaoChu) {
                continue
            }
            ts_block.bottomIndex = ts_block.bottomIndex - blockCount
            let xx = this.bottomStartX + this.blockWidth * ts_block.bottomIndex
            tween(children_di_2[i])
                .to(0.08, { position: new Vec3(xx, 0, 0) })
                .start()

        }

        return true
    }

    //洗牌功能
    clickRandomBtn() {
        let children = this.topBlocks.children
        let types: number[] = []
        for (const node of children) {
            types.push(node.getComponent(block).blockType);
        }
        types.sort((a, b) => Math.random() < 0.5 ? -1 : 1);
        for (let i = 0; i < children.length; i++) {
            let ts = children[i].getComponent(block)
            ts.changeType(types[i])
        }
        return true
    }

    getBlock(): Node {
        let node_block = null;
        if (this.blockPool.size() > 0) { // 通过 size 接口判断对象池中是否有空闲的对象
            node_block = this.blockPool.get();
        } else { // 如果没有空闲对象，也就是对象池中备用对象不够时，我们就用 cc.instantiate 重新创建
            node_block = instantiate(this.blockPre);
            console.log('加载了一个')
        }
        return node_block
    }

    //输出所有元素块的坐标
    outputAllBlock() {
        let str_pos = ''
        let children = this.topBlocks.children
        for (let i = 0; i < children.length; i++) {
            let v3_block = children[i].getPosition()
            str_pos = str_pos + '{x:' + v3_block.x + ',y:' + v3_block.y + '},'
        }
        if (children.length % 3 == 0) {
            if (children.length > 0) {
                //console.log(str_pos);
                this.copyToClipBoard(str_pos)
            } else {
                console.log('块的个数为0，无效');
                this.showTip('块的个数为0，无效')
            }
        } else {
            console.log('块的个数不是3的倍数，无效');
            this.showTip('块的个数不是3的倍数，无效')
        }

    }

    copyToClipBoard(str: string): boolean {
        if (sys.isNative) {
            //原生自己实现
        } else if (sys.isBrowser) {
            navigator.clipboard.writeText(str).then(() => {
                console.log('复制数据成功')
            })
            return true
        }
    }

    getLevel() {
        var levelString = sys.localStorage.getItem('PassLevel')
        if (!levelString) {
            levelString = '0'
        }
        return parseInt(levelString)
    }

    setLevel() {
        const levelString = '' + this.numLevel
        sys.localStorage.setItem('PassLevel', levelString)
        if (this.wx) {
            const levelNum = this.numLevel + 1
            let passRankData = {
                wxgame: {
                    score: levelNum,
                    update_time: new Date().getTime(),
                },
                cost_ms: 36500
            }
            let userKVData = {
                key: "PassRank",
                value: JSON.stringify(passRankData),
            }
            this.wx.setUserCloudStorage({
                KVDataList: [userKVData],
                success: function (res) {
                    console.log('--success res:', res);
                },
                fail: function (res) {
                    console.log('--fail res:', res);
                },
                complete: function (res) {
                    console.log('--complete res:', res);
                },
            });
        }
    }

    loadAudio() {
        assetManager.loadBundle('GameSound', (err, bundle) => {
            bundle.loadDir('/', AudioClip, (err, datas) => {
                this.audioDataList = datas
                this.playAudio('music_bg', true)
            });
        });
    }

    playAudio(name: string, loop = false) {
        //music_bg sound_win sound_lose sound_e_clean sound_click
        if (this.audioDataList) {
            for (const audio of this.audioDataList) {
                if (audio._name == name) {
                    if (loop) {
                        this.audioSource.clip = audio
                        this.audioSource.play()
                    }
                    else {
                        this.audioSource.playOneShot(audio, 1)
                    }
                    return
                }
            }
        }
    }


}

