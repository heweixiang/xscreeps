import { checkBuy, checkDispatch, checkSend, DispatchNum, resourceMap } from "@/module/fun/funtion"
import { Colorful, isInArray } from "@/utils"

/* 房间原型拓展   --任务  --基本功能 */
export default class RoomMissonBehaviourExtension extends Room {
    // 搬运基本任务
    public Task_Carry(misson:MissionModel):void{
        /* 搬运任务需求 sourcePosX,Y sourceRoom targetPosX,Y targetRoom num  rType  */
        // 没有任务数据 或者数据不全就取消任务
        if (!misson.Data) this.DeleteMission(misson.id)
        if (!misson.CreepBind) this.DeleteMission(misson.id)
    }

    // 建造任务
    public Constru_Build():void{
        if (Game.time % 51) return
        if (this.controller.level < 5) return
        var myConstrusion = new RoomPosition(Memory.RoomControlData[this.name].center[0],Memory.RoomControlData[this.name].center[1],this.name).findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
        if (myConstrusion)
        {
            /* 添加一个进孵化队列 */
            this.NumSpawn('build',1)
        }
        else
        {
            delete this.memory.SpawnConfig['build']
        }
    }

    // 资源link资源转移至centerlink中
    public Task_CenterLink():void{
        if ((global.Gtime[this.name]- Game.time) % 13) return
        if (!this.memory.StructureIdData.source_links) this.memory.StructureIdData.source_links = []
        if (!this.memory.StructureIdData.center_link || this.memory.StructureIdData.source_links.length <= 0) return
        let center_link = Game.getObjectById(this.memory.StructureIdData.center_link) as StructureLink
        if (!center_link){delete this.memory.StructureIdData.center_link;return}
        else {if (center_link.store.getUsedCapacity('energy') > 750)return}
        for (let id of this.memory.StructureIdData.source_links )
        {
            let source_link = Game.getObjectById(id) as StructureLink
            if (!source_link)
            {
                let index = this.memory.StructureIdData.source_links.indexOf(id)
                this.memory.StructureIdData.source_links.splice(index,1)
                return
            }
            if (source_link.store.getUsedCapacity('energy') >= 600 && this.Check_Link(source_link.pos,center_link.pos))
            {
                var thisTask = this.Public_link([source_link.id],center_link.id,10)
                this.AddMission(thisTask)
                return
            }
        }
    }

    // 消费link请求资源 例如升级Link
    public Task_ComsumeLink():void{
        if ((global.Gtime[this.name]- Game.time) % 7) return
        if (!this.memory.StructureIdData.center_link) return
        let center_link = Game.getObjectById(this.memory.StructureIdData.center_link) as StructureLink
        if (!center_link){delete this.memory.StructureIdData.center_link;return}
        if (this.memory.StructureIdData.upgrade_link)
        {
            let upgrade_link = Game.getObjectById(this.memory.StructureIdData.upgrade_link) as StructureLink
            if (!upgrade_link){delete this.memory.StructureIdData.upgrade_link;return}
            if (upgrade_link.store.getUsedCapacity('energy') < 400)
            {
                var thisTask = this.Public_link([center_link.id],upgrade_link.id,25)
                this.AddMission(thisTask)
                return
            }
            if (this.memory.StructureIdData.comsume_link.length > 0)
            {
                for (var i of this.memory.StructureIdData.comsume_link)
                {
                    let l = Game.getObjectById(i) as StructureLink
                    if (!l){
                        let index = this.memory.StructureIdData.comsume_link.indexOf(i)
                        this.memory.StructureIdData.comsume_link.splice(index,1)
                        return
                    }
                    if (l.store.getUsedCapacity('energy') < 500)
                    {
                        var thisTask = this.Public_link([center_link.id],l.id,35)
                        this.AddMission(thisTask)
                        return
                    }
                }
            }
        }
    }
    
    // lab合成任务 （底层）
    public Task_Compound(misson:MissionModel):void{
        if (Game.time % 5) return
        if (!this.memory.StructureIdData.labInspect || Object.keys(this.memory.StructureIdData.labInspect).length < 3) return
        let storage_ = global.Stru[this.name]['storage'] as StructureStorage
        let terminal_ = global.Stru[this.name]['terminal'] as StructureTerminal
        if (misson.Data.num <= 0 || !storage_ || !terminal_)
        {
            // delete this.memory.ResourceLimit[misson.Data.raw1]
            // delete this.memory.ResourceLimit[misson.Data.raw2]
            this.DeleteMission(misson.id)
            return
        }
        let raw1 = Game.getObjectById(this.memory.StructureIdData.labInspect.raw1) as StructureLab
        let raw2 = Game.getObjectById(this.memory.StructureIdData.labInspect.raw2) as StructureLab
        let re = false
        // if (!this.memory.ResourceLimit[misson.Data.raw1])
        // this.memory.ResourceLimit[misson.Data.raw1] = misson.Data.num
        // else if (this.memory.ResourceLimit[misson.Data.raw1] < misson.Data.num)
        // this.memory.ResourceLimit[misson.Data.raw1] = misson.Data.num
        // if (!this.memory.ResourceLimit[misson.Data.raw2])
        // this.memory.ResourceLimit[misson.Data.raw2] = misson.Data.num
        // else if (this.memory.ResourceLimit[misson.Data.raw2] < misson.Data.num)
        // this.memory.ResourceLimit[misson.Data.raw2] = misson.Data.num
        for (let i of misson.Data.comData)
        {
            var thisLab = Game.getObjectById(i) as StructureLab
            if (!thisLab) continue
            if (thisLab.cooldown) continue
            let comNum = 5
            if (thisLab.effects && thisLab.effects.length > 0)
            {
                for (var effect_ of thisLab.effects)
                {
                    if (effect_.effect == PWR_OPERATE_LAB)
                    {
                        var level = effect_.level
                        comNum += level*2
                    }
                }
            }
            if (thisLab.runReaction(raw1,raw2) == OK) {misson.Data.num -= comNum}
            if (thisLab.mineralType && thisLab.store.getUsedCapacity(thisLab.mineralType) >= 2500 && this.RoleMissionNum('transport','物流运输') < 2 && this.Check_Carry('transport',thisLab.pos,storage_.pos,thisLab.mineralType))
            {
                /* 资源快满了就要搬运 */
                re = true
                var thisTask = this.Public_Carry({'transport':{num:1,bind:[]}},30,this.name,thisLab.pos.x,thisLab.pos.y,this.name,storage_.pos.x,storage_.pos.y,thisLab.mineralType,thisLab.store.getUsedCapacity(thisLab.mineralType))
                this.AddMission(thisTask)
                continue
            }
        }
        if (re) return
        /* 源lab缺资源就运 */
        if (storage_.store.getUsedCapacity(misson.Data.raw1) > 0)
        if (raw1.store.getUsedCapacity(misson.Data.raw1) < 500 && this.RoleMissionNum('transport','物流运输') < 2 && this.Check_Carry('transport',storage_.pos,raw1.pos,misson.Data.raw1))
        {
            var thisTask = this.Public_Carry({'transport':{num:1,bind:[]}},30,this.name,storage_.pos.x,storage_.pos.y,this.name,raw1.pos.x,raw1.pos.y,misson.Data.raw1,storage_.store.getUsedCapacity(misson.Data.raw1)>=1000?1000:storage_.store.getUsedCapacity(misson.Data.raw1))
            this.AddMission(thisTask)
        }
        if (storage_.store.getUsedCapacity(misson.Data.raw2) > 0)
        if (raw2.store.getUsedCapacity(misson.Data.raw2) < 500 && this.RoleMissionNum('transport','物流运输') < 2 && this.Check_Carry('transport',storage_.pos,raw2.pos,misson.Data.raw2))
        {
            var thisTask = this.Public_Carry({'transport':{num:1,bind:[]}},30,this.name,storage_.pos.x,storage_.pos.y,this.name,raw2.pos.x,raw2.pos.y,misson.Data.raw2,storage_.store.getUsedCapacity(misson.Data.raw2)>=1000?1000:storage_.store.getUsedCapacity(misson.Data.raw2))
            this.AddMission(thisTask)
        }
        /* 资源调度 */
        var needResource:ResourceConstant[] = [misson.Data.raw1,misson.Data.raw2]
        if (this.MissionNum('Structure','资源购买') > 0) return // 存在资源购买任务的情况下，不执行资源调度
        if (DispatchNum(this.name) >= 2) return // 资源调度数量过多则不执行资源调度
        for (var resource_ of needResource)
        {
            // 原矿 资源调用
            if(storage_.store.getUsedCapacity(resource_) + terminal_.store.getUsedCapacity(resource_) < 10000 && isInArray(['H','O','K','L','X','U','Z'],resource_))
            {
                if (checkDispatch(this.name,resource_)) continue  // 已经存在调用信息的情况
                if (checkSend(this.name,resource_)) continue  // 已经存在其它房间的传送信息的情况
                console.log(Colorful(`[资源调度] 房间${this.name}没有足够的资源[${resource_}],将执行资源调度!`,'yellow'))
                let dispatchTask:RDData = {
                    sourceRoom:this.name,
                    rType:resource_,
                    num:10000,
                    delayTick:200,
                    conditionTick:35,
                    buy:true,
                    mtype:'deal'
                }
                Memory.ResourceDispatchData.push(dispatchTask)
                return
            }
            // 其他中间物 资源调用
            else if (storage_.store.getUsedCapacity(resource_)+ terminal_.store.getUsedCapacity(resource_) <  500 && !isInArray(['H','O','K','L','X','U','Z'],resource_))
            {
                if (checkDispatch(this.name,resource_)) continue  // 已经存在调用信息的情况
                if (checkSend(this.name,resource_)) continue  // 已经存在其它房间的传送信息的情况
                console.log(Colorful(`[资源调度] 房间${this.name}没有足够的资源[${resource_}],将执行资源调度!`,'yellow'))
                let dispatchTask:RDData = {
                    sourceRoom:this.name,
                    rType:resource_,
                    num:1000,
                    delayTick:100,
                    conditionTick:25,
                    buy:true,
                    mtype:'deal'
                }
                Memory.ResourceDispatchData.push(dispatchTask)
                return
            }
        }
    }

    // 合成规划     (中层)    目标化合物 --> 安排一系列合成
    public Task_CompoundDispatch():void{
        if ((Game.time - global.Gtime[this.name]) % 50) return
        if (Object.keys(this.memory.ComDispatchData).length <=0) return //  没有合成规划情况
        if (this.MissionNum('Room','资源合成') > 0) return  // 有合成任务情况
        var storage_ = global.Stru[this.name]['storage'] as StructureStorage
        if (!storage_) return
        var terminal_ = global.Stru[this.name]['terminal'] as StructureTerminal
        if (!terminal_) return
        /* 没有房间合成实验室数据，不进行合成 */
        if (!this.memory.StructureIdData.labInspect.raw1){console.log(`房间${this.name}不存在合成实验室数据！`);return}
        /* 查看合成实验室的被占用状态 */
        if (this.memory.RoomLabBind[this.memory.StructureIdData.labInspect.raw1] || this.memory.RoomLabBind[this.memory.StructureIdData.labInspect.raw2])
        {console.log(`房间${this.name}的源lab被占用!`);return}
        var comLabs = []
        for (var otLab of this.memory.StructureIdData.labInspect.com)
        {
            if (!this.memory.RoomLabBind[otLab]) comLabs.push(otLab)
        }
        if (comLabs.length <=0) {console.log(`房间${this.name}的合成lab全被占用!`);return}
        /* 确认所有目标lab里都没有其他资源 */
        for (var i of this.memory.StructureIdData.labs)
        {
            var thisLab = Game.getObjectById(i) as StructureLab
            if (!thisLab) continue
            if (thisLab.mineralType && !this.memory.RoomLabBind[i]) return
        }
        /**
         * 正式开始合成规划
         *  */ 
        var data = this.memory.ComDispatchData
        LoopA:
        for (var disType in data)
        {
            let storeNum = storage_.store.getUsedCapacity(disType as ResourceConstant)
            let dispatchNum = this.memory.ComDispatchData[disType].dispatch_num
            // 不是最终目标资源的情况下
            if (Object.keys(data)[Object.keys(data).length - 1] != disType)
            if (storeNum < dispatchNum)
            {
                let diff = dispatchNum - storeNum
                 /* 先判定一下是否已经覆盖，如果已经覆盖就不合成 例如：ZK 和 G的关系，只要G数量满足了就不考虑 */
                var mapResource = resourceMap(disType as ResourceConstant,Object.keys(data)[Object.keys(data).length - 1] as ResourceConstant)
                if (mapResource.length > 0)
                {
                    for (var mR of mapResource)
                    {
                        if (storage_.store.getUsedCapacity(mR) >= data[disType].dispatch_num)
                            continue LoopA 
                    }
                }
                // 下达合成命令
                var thisTask = this.public_Compound(diff,disType as ResourceConstant,comLabs)
                if (this.AddMission(thisTask))
                {
                    data[disType].ok = true
                }
                return
            }
            // 是最终目标资源的情况下
            if (Object.keys(data)[Object.keys(data).length - 1] == disType)
            {
                // 下达合成命令
                var thisTask = this.public_Compound(data[disType].dispatch_num,disType as ResourceConstant,comLabs)
                if (this.AddMission(thisTask)) this.memory.ComDispatchData = {}
                return
            }
            
        }
    }
}