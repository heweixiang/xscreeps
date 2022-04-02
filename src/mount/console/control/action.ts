import { avePrice, haveOrder, highestPrice } from "@/module/fun/funtion"
import room from "@/mount/room"
import { Colorful, compare, isInArray, unzipPosition, zipPosition } from "@/utils"

export default {
    /* 修墙 */
    repair:{
        set(roomName:string,rtype:'global'|'special',num:number,boost:null|ResourceConstant):string{
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == '墙体维护' && i.Data.RepairType == rtype)
            {
                return `[repair] 房间${roomName}已经存在类型为${rtype}的刷墙任务了`
            }
            var thisTask = thisRoom.public_repair(rtype,num,boost,false)
            if (thisRoom.AddMission(thisTask))
            return `[repair] 房间${roomName}挂载类型为${rtype}刷墙任务成功`
            return `[repair] 房间${roomName}挂载类型为${rtype}刷墙任务失败`
        },
        remove(roomName:string,Rtype:'global'|'special'):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == '墙体维护' && i.Data.RepairType == Rtype)
            {
                if (thisRoom.DeleteMission(i.id))
                return `[repair] 房间${roomName}删除类型为${Rtype}刷墙任务成功`
            }
            return `[repair] 房间${roomName}删除类型为${Rtype}刷墙任务失败!`
        },
    },
    /* 特殊计划 不在manual里显示 */
    plan:{
        // C计划
        C(roomName:string,disRoom:string,Cnum:number,Unum:number,shard:shardName = Game.shard.name as shardName):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[plan] 不存在房间${roomName}`
            let task = thisRoom.public_planC(disRoom,Cnum,Unum,shard)
            if (thisRoom.AddMission(task))
            return Colorful(`[plan] 房间${roomName}挂载C计划成功 -> ${disRoom}`,'green')
            return Colorful(`[plan] 房间${roomName}挂载C计划失败 -> ${disRoom}`,'red')
        },
        CC(roomName:string):string
        {
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[plan] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == 'C计划' )
            {
                if (thisRoom.DeleteMission(i.id))
                return Colorful(`[plan] 房间${roomName}删除C计划成功`,'green')
            }
            return Colorful(`[plan] 房间${roomName}删除C计划失败`,'red')
        },
        // Z计划 
        Z(roomName:string,disRoom:string,num:number):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[plan] 不存在房间${roomName}`
            var thisTask = thisRoom.Public_Send(disRoom,'Z',num)
            /* 查看资源是否足够 */
            var terminal_ = Game.getObjectById(thisRoom.memory.StructureIdData.terminalID) as StructureTerminal
            var storage_ = Game.getObjectById(thisRoom.memory.StructureIdData.storageID) as StructureStorage
            if (!terminal_ || !storage_) 
            {delete thisRoom.memory.StructureIdData.terminalID;delete thisRoom.memory.StructureIdData.storageID;return Colorful( `[terminal] 房间${roomName}不存在终端/仓房或记忆未更新！`,'red',true)}
            /* 查询其他资源传送任务中是否有一样的资源 */
            var Num = 0
            if (!thisRoom.memory.Misson['Structure']) thisRoom.memory.Misson['Structure'] = []
            for (var tM of thisRoom.memory.Misson['Structure'])
            {
                if (tM.name == '资源传送' && tM.Data.rType == 'Z')    Num += tM.Data.num
            }
            /* 计算资源是否满足 */
            if (terminal_.store.getUsedCapacity('Z') + storage_.store.getUsedCapacity('Z') - Num < num)
            return Colorful(`[plan] 房间${roomName} 资源${'Z'} 数量总合少于 ${num},Z计划挂载失败!`,'yellow',true)
            /* 计算路费 */
            var cost = Game.market.calcTransactionCost(num,roomName,disRoom)
            if (terminal_.store.getUsedCapacity('energy') + storage_.store.getUsedCapacity('energy') < cost || cost > 150000)
            return Colorful(`[plan] 房间${roomName}-->${disRoom}资源${'Z'}所需路费少于 ${cost}或大于150000，传送任务挂载失败！`,'yellow',true)
            if(thisRoom.AddMission(thisTask))
                return Colorful(`[plan] 房间${roomName}-->${disRoom}资源${'Z'}传送挂载成功！数量：${num}；路费：${cost}`,'green',true)
            return Colorful(`[plan] 房间${roomName}-->${disRoom}资源${'Z'}传送 不明原因挂载失败！`,'red',true)
        }
    },
    /* 扩张 */
    expand:{
        set(roomName:string,disRoom:string,shard:shardName,num:number,Cnum:number = 1):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[expand] 不存在房间${roomName}`
            let task = thisRoom.Public_expand(disRoom,shard,num,Cnum)
            if (thisRoom.AddMission(task))
            return Colorful(`[expand] 房间${roomName}挂载扩张援建计划成功 -(${shard})-> ${disRoom}`,'green')
            return Colorful(`[expand] 房间${roomName}挂载扩张援建计划失败 -(${shard})-> ${disRoom}`,'red')
        },
        remove(roomName:string,disRoom:string,shard:shardName):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[expand] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == '扩张援建' && i.Data.disRoom == disRoom )
            {
                if (thisRoom.DeleteMission(i.id))
                return Colorful(`[expand] 房间${roomName}删除去往${disRoom}(${shard})的扩张援建任务成功`,'green')
            }
            return Colorful(`[expand] 房间${roomName}删除去往${disRoom}(${shard})的扩张援建任务失败`,'red')
        },
    },
    /* 战争 */
    war:{
        dismantle(roomName:string,disRoom:string,shard:shardName,num:number,interval?:number,boost?:boolean,):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == '黄球拆迁' && i.Data.disRoom == disRoom && i.Data.shard == shard)
            {
                return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
            }
            let interval_ = interval?interval:1000
            let task = thisRoom.Public_dismantle(disRoom,shard,num,interval_,boost)
            if (thisRoom.AddMission(task))
            return Colorful(`[war] 房间${roomName}挂载拆迁任务成功 -> ${disRoom}`,'green')
            return Colorful(`[war] 房间${roomName}挂载拆迁任务失败 -> ${disRoom}`,'red')
        },
        Cdismantle(roomName:string,disRoom:string,shard:shardName = Game.shard.name as shardName):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            {
                if (i.name =='黄球拆迁' && i.Data.disRoom ==disRoom && i.Data.shard == shard)
                {
                    if (thisRoom.DeleteMission(i.id))
                    return Colorful(`[plan] 房间${roomName}删除拆迁任务成功`,'green')
                }
            }
            return Colorful(`[war] 房间${roomName}删除拆迁任务失败`,'red')
        },
        support(roomName:string,disRoom:string,shard:shardName,sType:'double'|'aio',num:number,interval:number = 1000,boost:boolean = true):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var oi of thisRoom.memory.Misson['Creep'])
            if (oi.name == '紧急支援' && oi.Data.disRoom == disRoom && oi.Data.shard == shard)
            {
                return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
            }
            let task = thisRoom.Public_support(disRoom,sType,shard,num,boost)
            if (task)
            {
                for (var i in task.CreepBind)
                    task.CreepBind[i].interval = interval
            }
            if (thisRoom.AddMission(task))
            return Colorful(`[war] 房间${roomName}挂载紧急支援任务成功 -(${shard})-> ${disRoom},类型为${sType},数量为${num},间隔时间${interval}`,'green')
            return Colorful(`[war] 房间${roomName}挂载紧急支援任务失败 -(${shard})-> ${disRoom}`,'red')
        },
        Csupport(roomName:string,disRoom:string,shard:shardName,rType:string):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            {
                if (i.name =='紧急支援' && i.Data.disRoom ==disRoom && i.Data.sType == rType && i.Data.shard == shard)
                {
                    if (thisRoom.DeleteMission(i.id))
                    return Colorful(`[war] 房间${roomName}-(${shard})->${disRoom}|[${rType}]紧急支援任务删除成功`,'green')
                }
            }
            return Colorful(`[war] 房间${roomName}-(${shard})->${disRoom}|[${rType}]紧急支援任务删除失败`,'red')
        },
        control(roomName:string,disRoom:string,shard:shardName = Game.shard.name as shardName,interval:number):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var oi of thisRoom.memory.Misson['Creep'])
            if (oi.name == '控制攻击' && oi.Data.disRoom == disRoom && oi.Data.shard == shard)
            {
                return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
            }
            let task = thisRoom.Public_control(disRoom,shard,interval)
            if (thisRoom.AddMission(task))
            return Colorful(`[war] 房间${roomName}挂载控制攻击任务成功 -> ${disRoom}`,'green')
            return Colorful(`[war] 房间${roomName}挂载控制攻击任务失败 -> ${disRoom}`,'red')
        },
        Ccontrol(roomName:string,disRoom:string,shard:shardName = Game.shard.name as shardName):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            {
                if (i.name =='控制攻击' && i.Data.disRoom ==disRoom && i.Data.shard == shard)
                {
                    if (thisRoom.DeleteMission(i.id))
                    return Colorful(`[war] 房间${roomName}控制攻击任务成功`,'green')
                }
            }
            return Colorful(`[war] 房间${roomName}控制攻击任务失败`,'red')
        },
        aio(roomName:string,disRoom:string,shard:shardName,CreepNum:number,time:number = 1000,boost:boolean = true,bodylevel:"T0" | "T0" | "T2" = "T0"):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[war] 未找到房间${roomName},请确认房间!`
            for (var oi of myRoom.memory.Misson['Creep'])
            if (oi.name == '攻防一体' && oi.Data.disRoom == disRoom && oi.Data.shard == shard)
            {
                return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
            }
            var thisTask = myRoom.Public_aio(disRoom,shard,CreepNum,time,boost,bodylevel)
            if (myRoom.AddMission(thisTask))
            return `[war] 攻防一体任务挂载成功! ${Game.shard.name}/${roomName} -> ${shard}/${disRoom} 体型等级:${bodylevel}`
            return `[war] 攻防一体挂载失败!`
        },
        Caio(roomName:string,disRoom:string,shard:shardName):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[support] 未找到房间${roomName},请确认房间!`
            for (var i of myRoom.memory.Misson['Creep'])
            {
                if (i.name == '攻防一体' && i.Data.disRoom == disRoom && i.Data.shard == shard)
                {
                    if (myRoom.DeleteMission(i.id))
                    return `[war] 删除去往${shard}/${disRoom}的攻防一体任务成功!`
                }
            }
            return `[war] 删除去往${shard}/${disRoom}的攻防一体任务失败!`
        },
        squad(roomName:string,disRoom:string,shard:shardName,mtype:'R'|'A'|'D'|'Aio'|'RA'|'DA'|'DR',time:number= 1000):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[war] 未找到房间${roomName},请确认房间!`
            for (var oi of myRoom.memory.Misson['Creep'])
            if (oi.name == '四人小队' && oi.Data.disRoom == disRoom && oi.Data.shard == shard && oi.Data.flag == mtype)
            {
                return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的<${mtype}>四人小队任务了!`
            }
            let thisTask:MissionModel
            if (mtype == 'R')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,2,0,0,2,0,mtype)
            }
            else if (mtype == 'A')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,2,0,2,0,mtype)
            }
            else if (mtype == 'D')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,0,2,2,0,mtype)
            }
            else if (mtype == 'Aio')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,0,0,0,4,mtype)
            }
            else if (mtype == 'RA')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,1,1,0,2,0,mtype)
            }
            else if (mtype == 'DA')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,0,1,1,2,0,mtype)
            }
            else if (mtype == 'DR')
            {
                thisTask = myRoom.public_squad(disRoom,shard,time,1,0,1,2,0,mtype)
            }
            if (myRoom.AddMission(thisTask))
            return `[war] 四人小队任务挂载成功! ${Game.shard.name}/${roomName} -> ${shard}/${disRoom}`
            return `[war] 四人小队挂载失败!`
        },
        Csquad(roomName:string,disRoom:string,shard:shardName,mtype:'R'|'A'|'D'|'Aio'|'RA'|'DA'|'DR'):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[war] 未找到房间${roomName},请确认房间!`
            for (var i of myRoom.memory.Misson['Creep'])
            {
                if (i.name == '四人小队' && i.Data.disRoom == disRoom && i.Data.shard == shard && i.Data.flag == mtype)
                {
                    if (myRoom.DeleteMission(i.id))
                    return `[war] 删除去往${shard}/${disRoom}的四人小队任务成功!`
                }
            }
            return `[war] 删除去往${shard}/${disRoom}的四人小队任务失败!`
        },
        double(roomName:string,disRoom:string,shard:shardName = Game.shard.name as shardName,mType:'dismantle' | 'attack',num:number,interval:number):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var oi of thisRoom.memory.Misson['Creep'])
            if (oi.name == '双人小队' && oi.Data.disRoom == disRoom && oi.Data.shard == shard)
            {
                return `[war] 房间${roomName}已经存在去往${disRoom}(${shard})的该类型任务了!`
            }
            var thisTask = thisRoom.Public_Double(disRoom,shard,num,mType,interval)
            thisTask.maxTime = 2
            if(thisRoom.AddMission(thisTask)) return `[war] 双人小队 ${roomName} -> ${disRoom} 的 ${mType}任务挂载成功！`
            return `[war] 双人小队 ${roomName} -(${shard})-> ${disRoom} 的 ${mType}任务挂载失败！`
        },
        Cdouble(roomName:string,disRoom:string,shard:shardName,mType:'dismantle'|'attack'):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[war] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            {
                if (i.name == "双人小队" && i.Data.disRoom == disRoom && i.Data.teamType == mType && i.Data.shard == shard)
                {
                    if (thisRoom.DeleteMission(i.id)) return `[war] 双人小队 ${roomName} -(${shard})-> ${disRoom} 的 ${mType}任务删除成功！`
                }
            }
            return `[war] 双人小队 ${roomName} -(${shard})-> ${disRoom} 的 ${mType}任务删除失败！`
        },
    },
    /* 升级 */
    upgrade:{
        quick(roomName:string,num:number,boostType:null| ResourceConstant):string{
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[upgrade] 不存在房间${roomName}`
            var thisTask = thisRoom.Public_quick(num,boostType)
            if (thisTask && thisRoom.AddMission(thisTask))
            return `[upgrade] 房间${roomName}挂载急速冲级任务成功`
            return `[upgrade] 房间${roomName}挂载急速冲级任务失败`
        },
        Cquick(roomName:string):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == '急速冲级')
            {
                if (thisRoom.DeleteMission(i.id))
                return `[upgrade] 房间${roomName}删除急速冲级任务成功`
            }
            return `[upgrade] 房间${roomName}删除急速冲级任务失败!`
        },
        Nquick(roomName:string,num:number):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[repair] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == '急速冲级')
            {
                i.CreepBind['rush'].num = num
                return `[upgrade] 房间${roomName}急速冲级任务数量修改为${num}`
            }
            return `[upgrade] 房间${roomName}修改急速冲级任务数量失败!`
        },
    },
    /* 搬运 */
    carry:{
        special(roomName:string,res:ResourceConstant,sP:RoomPosition,dP:RoomPosition,CreepNum?:number,ResNum?:number):string{
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[carry] 不存在房间${roomName}`
            let time = 99999
            if (!ResNum) time = 30000
            var thisTask = thisRoom.Public_Carry({'truck':{num:CreepNum?CreepNum:1,bind:[]}},time,sP.roomName,sP.x,sP.y,dP.roomName,dP.x,dP.y,res,ResNum?ResNum:undefined)
            if (thisRoom.AddMission(thisTask)) return `[carry] 房间${roomName}挂载special搬运任务成功`
            return `[carry] 房间${roomName}挂载special搬运任务失败`
        },
        Cspecial(roomName:string):string{
            let thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[carry] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            if (i.name == '物流运输' && i.CreepBind['truck'] && i.Data.rType)
            {
                if(thisRoom.DeleteMission(i.id))
                return `[carry] 房间${roomName}删除special搬运任务成功`
            }
            return `[carry] 房间${roomName}删除special搬运任务失败`
        },
    },
    /* 支援 */
    support:{
        // 紧急援建
        build(roomName:string,disRoom:string,shard:shardName = Game.shard.name as shardName,num:number,interval:number,):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            let task = thisRoom.Public_helpBuild(disRoom,num,shard,interval)
            if (thisRoom.AddMission(task))
            return Colorful(`[support] 房间${roomName}挂载紧急援建任务成功 -> ${disRoom}`,'green')
            return Colorful(`[support] 房间${roomName}挂载紧急援建任务失败 -> ${disRoom}`,'red')
        },
        Cbuild(roomName:string,disRoom:string,shard:shardName = Game.shard.name as shardName):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[support] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            {
                if (i.name =='紧急援建' && i.Data.disRoom ==disRoom && i.Data.shard == shard)
                {
                    if (thisRoom.DeleteMission(i.id))
                    return Colorful(`[support] 房间${roomName}紧急援建任务成功`,'green')
                }
            }
            return Colorful(`[support] 房间${roomName}紧急援建任务失败`,'red')
        },
    },
    /* 核弹相关 */
    nuke:{
        /* 发射核弹 */
        launch(roomName:string,disRoom:string,x_:number,y_:number):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[nuke]房间错误，请确认房间${roomName}！`
            var nuke_ = Game.getObjectById(myRoom.memory.StructureIdData.NukerID as string) as StructureNuker
            if (!nuke_) return `[nuke]核弹查询错误!`
            if (nuke_.launchNuke(new RoomPosition(x_,y_,disRoom)) == OK)
                return Colorful(`[nuke]${roomName}->${disRoom}的核弹发射成功!预计---500000---ticks后着陆!`,'yellow',true)
            else
                return Colorful(`[nuke]${roomName}->${disRoom}的核弹发射失败!`,'yellow',true)
        },
        /* 自动填充核弹开关 */
        switch(roomName:string):string{
            var myRoom = Game.rooms[roomName]
            if (!myRoom) return `[nuke]房间错误，请确认房间${roomName}！`
            if (myRoom.memory.switch.StopFillNuker) myRoom.memory.switch.StopFillNuker = false
            else myRoom.memory.switch.StopFillNuker = true
            if (myRoom.memory.switch.StopFillNuker) return `[nuke] 房间${roomName}停止自动核弹填充!`
            return `[nuke] 房间${roomName}开启自动核弹填充!`
        }
    },
    /* 斥候 签名 侦察 */
    scout:{
        sign(roomName:string,disRoom:string,shard:shardName,str:string):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[scout] 不存在房间${roomName}`
            let task = thisRoom.Public_Sign(disRoom,shard,str)
            if (!task) return '[scout] 任务对象生成失败'
            if (thisRoom.AddMission(task))
            return Colorful(`[scout] 房间${roomName}挂载房间签名任务成功 -> ${disRoom}`,'green')
            return Colorful(`[scout] 房间${roomName}挂载房间签名任务失败 -> ${disRoom}`,'red')
        },
        Csign(roomName:string,disRoom:string,shard:shardName):string{
            var thisRoom = Game.rooms[roomName]
            if (!thisRoom) return `[scout] 不存在房间${roomName}`
            for (var i of thisRoom.memory.Misson['Creep'])
            {
                if (i.name =='房间签名' && i.Data.disRoom ==disRoom && i.Data.shard == shard)
                {
                    if (thisRoom.DeleteMission(i.id))
                    return Colorful(`[scout] 房间${roomName}房间签名任务成功`,'green')
                }
            }
            return Colorful(`[scout] 房间${roomName}房间签名任务失败`,'red')
        },
    },

}