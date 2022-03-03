/* 资源调度模块 */

import { t1, t2, t3 } from "@/constant/ResourceConstant"
import { Colorful, isInArray } from "@/utils"
import { avePrice, haveOrder, highestPrice } from "../fun/funtion"


// 主调度函数
export function ResourceDispatch(thisRoom:Room):void{
    if ((Game.time - global.Gtime[thisRoom.name]) % 15) return
    // 处理订单前检查
    let storage_ = global.Stru[thisRoom.name]['storage'] as StructureStorage
    let terminal_ = global.Stru[thisRoom.name]['terminal'] as StructureTerminal
    if (thisRoom.controller.level < 6 || !storage_ || !terminal_ ) return
    if (thisRoom.MissionNum('Structure','资源传送') >= 1) return    // 如果房间有资源传送任务，则不执行
    for (let i of Memory.ResourceDispatchData)
    {
        // 执行资源调度
        if (i.sourceRoom == thisRoom.name)
        {
            // 执行买操作
            if (i.conditionTick <= 0 && i.buy)
            {
                if (i.mtype == 'order')
                {
                    /**
                     *       1.获取近两天的平均价格
                     *       2.拉取平均价格+10以内价格最高的订单
                     *       3.发布订单的价格比最高的订单的价格多0.01
                    */
                    console.log(`[资源调度] 房间${thisRoom.name}需求资源[${i.rType}]无法调度,将进行购买! 购买方式为${i.mtype}`)
                    let ave = avePrice(i.rType,2)
                    if (!haveOrder(thisRoom.name,i.rType,'buy',ave))
                    {
                        let highest = highestPrice(i.rType,'buy',ave+10)
                        let result = Game.market.createOrder({
                            type: ORDER_BUY,
                            resourceType: 'energy',
                            price: highest + 0.01,
                            totalAmount: i.num,
                            roomName: thisRoom.name   
                        });
                        if (result != OK){console.log("[资源调度]创建能量订单出错,房间",thisRoom.name);continue}
                        console.log(Colorful(`房间${thisRoom.name}创建${i.rType}订单,价格:${highest + 0.01};数量:${i.num}`,'green',true))
                        i.delayTick = 0
                    }
                    continue
                }
                else if (i.mtype == 'deal')
                {
                    if (thisRoom.Check_Buy(i.rType) || thisRoom.MissionNum('Structure','资源购买') >= 2) continue
                    // 在一定范围内寻找最便宜的订单deal 例如平均价格20 范围 10 最高价格31 便只能接受30以下的价格 （根据资源不同选择不同参数）
                    console.log(`[资源调度] 房间${thisRoom.name}需求资源[${i.rType}]无法调度,将进行购买! 购买方式为${i.mtype}`)
                    // 能量 ops
                    if (isInArray(['ops','energy'],i.rType)){let task = thisRoom.Public_Buy(i.rType,i.num,5,10);
                        if (task) {thisRoom.AddMission(task);i.delayTick = 0};continue}
                    // 原矿 中间化合物
                    else if (isInArray(['X','L','H','O','Z','K','U','G','OH','ZK','UL'],i.rType)){let task = thisRoom.Public_Buy(i.rType,i.num,10,30);
                        if (task) {thisRoom.AddMission(task);i.delayTick = 0};continue}
                    // t3
                    else if (isInArray(t3,i.rType)){let task = thisRoom.Public_Buy(i.rType,i.num,50,150);
                        if (task) {thisRoom.AddMission(task);i.delayTick = 0};continue}
                    // power
                    else if (i.rType == 'power') {let task = thisRoom.Public_Buy(i.rType,i.num,20,70);
                        if (task) {thisRoom.AddMission(task);i.delayTick = 0};continue}
                    // t1 t2
                    else if (isInArray(t2,i.rType) || isInArray(t1,i.rType)){let task = thisRoom.Public_Buy(i.rType,i.num,20,65);
                        if (task) {thisRoom.AddMission(task);i.delayTick = 0};continue}
                    // 其他商品类资源 bar类资源
                    else{let task = thisRoom.Public_Buy(i.rType,i.num,50,200);
                        if (task) {thisRoom.AddMission(task);i.delayTick = 0};continue}
                }
                else
                {
                    // 未定义i.mtype 便按照默认的执行
                    if (i.rType == 'energy') i.mtype = 'order'
                    else i.mtype = 'deal'
                    continue
                }
            }
        }
        else
        {
            if(i.dealRoom) continue
            if (storage_.store.getUsedCapacity(i.rType))
            var limitNum = thisRoom.memory.ResourceLimit[i.rType]?thisRoom.memory.ResourceLimit[i.rType]:0
            if (storage_.store.getUsedCapacity(i.rType) <= 0) continue  // 没有就删除
            // storage里资源大于等于调度所需资源
            if ((storage_.store.getUsedCapacity(i.rType) + limitNum) >= i.num)
            {
                var SendNum = i.num > 50000?50000:i.num
                let task = thisRoom.Public_Send(i.sourceRoom,i.rType,SendNum)
                if (task && thisRoom.AddMission(task))
                {
                    if (i.num <= 50000) i.dealRoom = thisRoom.name // 如果调度数量大于50k 则只减少num数量
                    console.log(`房间${thisRoom.name}接取房间${i.sourceRoom}的资源调度申请,资源:${i.rType},数量:${SendNum}`)
                    i.num -= SendNum
                    return
                }
            }
            // sotrage里资源小于调度所需资源
            if (storage_.store.getUsedCapacity(i.rType)-limitNum > 0 && storage_.store.getUsedCapacity(i.rType)-limitNum < i.num)
            {
                let SendNum = storage_.store.getUsedCapacity(i.rType)-limitNum
                let task = thisRoom.Public_Send(i.sourceRoom,i.rType,SendNum)
                if (task && thisRoom.AddMission(task))
                {
                    console.log(`房间${thisRoom.name}接取房间${i.sourceRoom}的资源调度申请,资源:${i.rType},数量:${SendNum}`)
                    i.num -= SendNum
                    return
                }
            }
        }
    }
}


// 调度信息超时管理器
export function ResourceDispatchTick():void{
    for (let i of Memory.ResourceDispatchData)
    {
        // 超时将删除调度信息
        if (!i.delayTick || i.delayTick <=0 || i.num <= 0 || !i.rType)
        {
            console.log(`[资源调度]房间${i.sourceRoom}的[${i.rType}]资源调度删除!原因:调度任务已部署|超时|无效调度`)
            let index = Memory.ResourceDispatchData.indexOf(i)
            Memory.ResourceDispatchData.splice(index,1)
        }
        if (i.delayTick > 0)
        i.delayTick --
        if (i.conditionTick > 0)
        i.conditionTick --
    }
}