import { filter_structure, isInArray, LeastHit } from "@/utils"
import { CheckExcludeRampart } from "@/module/war/war"



/* 房间原型拓展   --方法  --寻找 */
export default class RoomFunctionFindExtension extends Room {
    /* 获取指定structureType的建筑列表 */
    public getStructure(sc: StructureConstant): Structure[] {
        // global.getStructure[this.name]
        if (Object.keys(global.getStructure[this.name]).length < 1) {
            let find_list = this.find(FIND_MY_STRUCTURES)
            for (let structure of find_list) {
                // let structure = find_list[i];
                // if (!isInArray([STRUCTURE_RAMPART], structure.structureType)) {
                if (!global.getStructure[this.name][structure.structureType]) global.getStructure[this.name][structure.structureType] = []
                global.getStructure[this.name][structure.structureType].push(structure)
                // }
            }
        }
        return global.getStructure[this.name][sc] ? global.getStructure[this.name][sc] : [];
    }


    public getStructureData(sc: StructureConstant, key: string, id: string[]) {
        if (!global.getStructureData[this.name][key]) {
            global.getStructureData[this.name][key] = [];
            let _getStructure = this.getStructure(sc)
            for (let Structure of _getStructure) {
                if (isInArray(id, Structure.id)) {
                    global.getStructureData[this.name][key].push(Structure)
                }
            }
        }
        return global.getStructureData[this.name][key] ? global.getStructureData[this.name][key] : [];
    }

    // /* 任务lab绑定数据生成便捷函数 */
    // public Bind_Lab(rTypes: ResourceConstant[]): MissonLabBind | null {
    //     var result: MissonLabBind = {}
    //     var tempList = []
    //     LoopA:
    //     for (var i of rTypes) {
    //         /* 计算是否已经存在相关lab */
    //         for (var occ_lab_id in this.memory.RoomLabBind) {
    //             if (this.memory.RoomLabBind[occ_lab_id].rType == i && !this.memory.RoomLabBind[occ_lab_id].occ) {
    //                 result[occ_lab_id] = i
    //                 continue LoopA
    //             }
    //         }
    //         LoopB:
    //         for (var all_lab_id of this.memory.StructureIdData.labs) {
    //             var occ_lab = Object.keys(this.memory.RoomLabBind)
    //             if (!isInArray(occ_lab, all_lab_id) && !isInArray(tempList, all_lab_id)) {
    //                 var thisLab = Game.getObjectById(all_lab_id) as StructureLab
    //                 if (!thisLab) {
    //                     var index = this.memory.StructureIdData.labs.indexOf(all_lab_id)
    //                     this.memory.StructureIdData.labs.splice(index, 1)
    //                     continue LoopB
    //                 }
    //                 if (thisLab.store) {
    //                     if (Object.keys(thisLab.store).length <= 1) {
    //                         result[all_lab_id] = i
    //                         tempList.push(all_lab_id)
    //                         continue LoopA
    //                     }
    //                     else if (Object.keys(thisLab.store).length == 1) {
    //                         if (thisLab.store['energy'] > 0) {
    //                             result[all_lab_id] = i
    //                             tempList.push(all_lab_id)
    //                             continue LoopA
    //                         }
    //                         continue LoopB
    //                     }
    //                     else if (Object.keys(thisLab.store).length > 1)
    //                         continue LoopB
    //                 }
    //             }
    //         }
    //         return null
    //     }
    //     return result
    // }

    /* -----------------------lab优化区----------------------------(测试中) */

    /* 任务过程中，实时更新占用lab 例如有lab被占用了或者其他情况  */
    public Update_Lab(): void {
        for (let index in this.memory.Misson) {
            LoopB:
            for (let missObj of this.memory.Misson[index]) {
                if (!missObj.LabMessage) continue LoopB
                if (!missObj.LabBind) missObj.LabBind = {}
                /*检查任务是否处于挂起状态*/
                if (missObj.Data.hangstate) continue
                // 检测lab状态
                LoopC:
                for (let rType in missObj.LabMessage) {
                    let state = this.Check_Occupy(missObj, rType as ResourceConstant)
                    if (state == 'normal') continue LoopC
                    else if (state == 'unbind') {
                        let id = this.Allot_Occupy(missObj, rType as ResourceConstant)
                        if (!id) {
                            // if ((Game.time - global.Gtime[this.name]) % 5 == 0) {
                            //     console.log(`房间${this.name}的lab分配存在问题,找不到合适的lab!材料为:${rType}`);
                            //     return
                            // }
                            return
                        } // 说明没lab了直接截止整个函数
                        if (_.isArray(id)) {
                            for (var str_ of id) {
                                missObj.LabBind[str_ as string] = rType
                            }
                            for (let str of id) {
                                if (!this.memory.RoomLabBind[str as string]) {
                                    this.memory.RoomLabBind[str as string] = { missonID: [missObj.id], rType: rType as ResourceConstant, occ: isInArray(['com', 'raw'], missObj.LabMessage[rType]) ? true : false, type: missObj.LabMessage[rType] }
                                }
                                else {
                                    if (this.memory.RoomLabBind[str as string].rType == rType) {

                                        if (!isInArray(this.memory.RoomLabBind[str as string].missonID, missObj.id)) this.memory.RoomLabBind[str as string].missonID.push(missObj.id as string)
                                        this.memory.RoomLabBind[str as string].type = missObj.LabMessage[rType]
                                        this.memory.RoomLabBind[str as string].occ = false
                                    }
                                    else {
                                        /* 被强制占用的 */
                                        this.memory.RoomLabBind[str as string] = { missonID: [missObj.id], rType: rType as ResourceConstant, occ: isInArray(['com', 'raw'], missObj.LabMessage[rType]) ? true : false, type: missObj.LabMessage[rType] }
                                    }
                                }
                            }
                            continue LoopC
                        }
                        missObj.LabBind[id as string] = rType
                        if (!this.memory.RoomLabBind[id as string]) {
                            this.memory.RoomLabBind[id as string] = { missonID: [missObj.id], rType: rType as ResourceConstant, occ: isInArray(['com', 'raw'], missObj.LabMessage[rType]) ? true : false, type: missObj.LabMessage[rType] }
                        }
                        else {
                            if (this.memory.RoomLabBind[id as string].rType == rType) {

                                if (!isInArray(this.memory.RoomLabBind[id as string].missonID, missObj.id)) this.memory.RoomLabBind[id as string].missonID.push(missObj.id as string)
                                this.memory.RoomLabBind[id as string].type = missObj.LabMessage[rType]
                                this.memory.RoomLabBind[id as string].occ = false
                            }
                            else {
                                /* 被强制占用的 */
                                this.memory.RoomLabBind[id as string] = { missonID: [missObj.id], rType: rType as ResourceConstant, occ: isInArray(['com', 'raw'], missObj.LabMessage[rType]) ? true : false, type: missObj.LabMessage[rType] }
                            }
                        }
                    }
                    else continue LoopC
                }
            }
        }
    }

    /**
     * 判断任务所需的某种资源类型强化的lab占用数据是否正常 只有返回normal才代表正常
     * 简单来说，这个函数可以确定任意任务对象任意资源的lab绑定情况，分别为 正常 | lab遭到破坏 | 无绑定信息 | 被其他高优先级占用 | 需要占用
     * @param miss 任务对象
     * @param rType 资源类型
     * @returns 该类型lab绑定数据
     */
    public Check_Occupy(miss: MissionModel, rType: ResourceConstant): 'normal' | 'damage' | 'unbind' | 'lost' | 'occupy' {
        if (!miss.LabBind) return 'unbind'
        if (miss.LabMessage && miss.LabMessage[rType] == 'com') {
            // com类型判断有没有空闲的lab 有的话就占用lab
            for (let lab of this.memory.StructureIdData.labs) {
                if (!isInArray(Object.keys(this.memory.RoomLabBind), lab))
                    return 'unbind'
            }
        }
        for (let i in miss.LabBind) {
            if (miss.LabBind[i] == rType) {
                let lab_ = Game.getObjectById(i as Id<StructureLab>) as StructureLab
                if (!lab_) {
                    delete this.memory.RoomLabBind[i]
                    // 删除 structureIdData中的无效lab
                    for (let z of this.memory.StructureIdData.labs) {
                        if (z == i) {
                            let index = this.memory.StructureIdData.labs.indexOf(z)
                            this.memory.StructureIdData.labs.splice(index, 1)
                        }
                    }
                    delete miss.LabBind[i]
                    return 'damage' // 代表绑定的lab损坏
                }
                if (this.memory.RoomLabBind[i] && miss.LabBind[i] == this.memory.RoomLabBind[i].rType) {
                    if (this.memory.RoomLabBind[i].type == miss.LabMessage[rType])
                        return 'normal' // 正常运转
                    else {
                        if (this.memory.RoomLabBind[i].type == 'boost') {
                            return 'normal' // 正常运转
                        }
                        console.log(miss.name, i, ` this.memory.RoomLabBind[i].type: ${this.memory.RoomLabBind[i].type} == miss.LabMessage[rType] : ${miss.LabMessage[rType]}`)
                        return 'unbind'
                    }

                }
                else {
                    if (!this.memory.RoomLabBind[i]) {
                        console.log(`error, 不存在this.memory.RoomLabBind[${i}]`)
                        delete miss.LabBind[i]
                        return 'unbind'
                    }
                    if (!miss.LabMessage) return 'lost'
                    let thisType = miss.LabMessage[rType]
                    if (!thisType) return 'lost'        // LabMessage中没这个信息 以被占用处理
                    let levelMap = {
                        'boost': 2,
                        'unboost': 2,
                        'raw': 3,
                        'com': 1
                    }
                    let thisLevel = levelMap[thisType] ? levelMap[thisType] : 0     // 任务对象的占用等级
                    let otherLevel = levelMap[this.memory.RoomLabBind[i].type] ? levelMap[this.memory.RoomLabBind[i].type] : 3
                    if (thisLevel > otherLevel) {
                        return "occupy" // 需要占用那个lab
                    }
                    // 自动删除
                    delete miss.LabBind[i]
                    /* 删除任务在RoomLabBind[i].MissionID中的任务id */
                    for (let mID of this.memory.RoomLabBind[i].missonID) {
                        if (mID == miss.id) {
                            let index = this.memory.RoomLabBind[i].missonID.indexOf(mID)
                            this.memory.RoomLabBind[i].missonID.splice(index, 1)
                        }
                    }
                    return 'lost'   // 被其他高优先级绑定占用了，需要重定向
                }
            }
        }
        // console.log(rType)
        return 'unbind' // 代表未绑定
    }

    /**
     * 分配lab 返回的是分配lab的数据，如果分配成功返回MissonLabBind对象 如果分配失败返回null
     * 简单来说，这是一个按照优先级自动给所需资源分配lab的函数，如果lab不够用，可能会占用，需要额外判断是否被占用了
     * @param miss 任务对象
     * @param rType 资源类型
     * @returns lab绑定信息 | null
     */
    public Allot_Occupy(miss: MissionModel, rType: ResourceConstant): string | string[] | null {
        if (!miss.LabMessage) return null          // 没有lab信息，分配失败
        if (!miss.LabMessage[rType]) return null
        let result: string = null    // 结果
        let rawLabList = []     // 底物lab列表
        if (this.memory.StructureIdData.labInspect.raw1) // 合成用的底物lab1
        {
            let raw1Lab = Game.getObjectById(this.memory.StructureIdData.labInspect.raw1) as StructureLab
            if (!raw1Lab) delete this.memory.StructureIdData.labInspect.raw1
            else rawLabList.push(this.memory.StructureIdData.labInspect.raw1)

        }
        if (this.memory.StructureIdData.labInspect.raw2) // 合成用的底物lab2
        {
            let raw2Lab = Game.getObjectById(this.memory.StructureIdData.labInspect.raw2) as StructureLab
            if (!raw2Lab) delete this.memory.StructureIdData.labInspect.raw2
            else rawLabList.push(this.memory.StructureIdData.labInspect.raw2)

        }
        /* 先判断一下是否已经有相关的lab占用了,当然，这只有LabMessage[i]为boost时才可用 */
        if (miss.LabMessage[rType] == 'boost') {
            for (let occ_lab_id in this.memory.RoomLabBind) {
                if (this.memory.RoomLabBind[occ_lab_id].rType == rType && !this.memory.RoomLabBind[occ_lab_id].occ) // !occ代表允许多任务占用该lab
                {
                    result = occ_lab_id
                    return result
                }
            }
        }
        /* boost unboost的lab */
        if (isInArray(['boost', 'unboost'], miss.LabMessage[rType]) && this.memory.StructureIdData.labs) {
            /* 寻找未占用的lab */
            LoopB:
            for (let lab_id of this.memory.StructureIdData.labs) {
                let bind_labs = Object.keys(this.memory.RoomLabBind)
                if (!isInArray(bind_labs, lab_id) && !isInArray(rawLabList, lab_id)) {
                    let thisLab = Game.getObjectById(lab_id) as StructureLab
                    if (!thisLab)   // lab损坏
                    {
                        var index = this.memory.StructureIdData.labs.indexOf(lab_id)
                        this.memory.StructureIdData.labs.splice(index, 1)
                        continue LoopB
                    }
                    if (thisLab.mineralType) {
                        if (thisLab.mineralType == rType)   // 相同资源的未占用lab
                        {
                            result = lab_id
                            return result
                        }
                        else continue LoopB
                    }
                    else        // 空lab
                    {
                        result = lab_id
                        return result
                    }
                }
            }
        }
        /* 到这一步不是lab被占光了就是合成底物的lab 寻找能占的lab */
        if (miss.LabMessage[rType] == 'raw') {
            LoopRaw:
            for (let rawID of rawLabList) {
                let thisLab = Game.getObjectById(rawID) as StructureLab
                if (!thisLab) continue LoopRaw
                // 先检查是否被占用了，如果被占用，就夺回
                if (this.memory.RoomLabBind[rawID] && this.memory.RoomLabBind[rawID].type && this.memory.RoomLabBind[rawID].type != 'raw') {
                    result = rawID
                    return result
                }
                if (!this.memory.RoomLabBind[rawID] && (!thisLab.mineralType || thisLab.mineralType == rType)) {
                    return rawID
                }
            }
        }
        else if (miss.LabMessage[rType] == 'com') {
            let strList = []
            LoopB:
            for (let lab_id of this.memory.StructureIdData.labs) {
                // 如果roomLabBind[lab_id].missonID中已经存在该任务, 直接push
                if (this.memory.RoomLabBind[lab_id] && isInArray(this.memory.RoomLabBind[lab_id].missonID, miss.id) && this.memory.RoomLabBind[lab_id].rType == rType) {
                    strList.push(lab_id)
                    continue
                }
                let bind_labs = Object.keys(this.memory.RoomLabBind)
                if (!isInArray(bind_labs, lab_id) && !isInArray(rawLabList, lab_id)) {
                    let thisLab = Game.getObjectById(lab_id) as StructureLab
                    if (!thisLab)   // lab损坏
                    {
                        var index = this.memory.StructureIdData.labs.indexOf(lab_id)
                        this.memory.StructureIdData.labs.splice(index, 1)
                        continue LoopB
                    }
                    if (thisLab.mineralType) {
                        if (thisLab.mineralType == rType)   // 相同资源的未占用lab
                        {
                            strList.push(lab_id)
                        }
                        else continue LoopB
                    }
                    else        // 空lab
                    {
                        strList.push(lab_id)
                    }
                }
            }
            return strList.length > 0 ? strList : null
        }
        else if (miss.LabMessage[rType] == 'boost') {
            // 寻找性质为com的lab
            for (let occ_lab_id in this.memory.RoomLabBind) {
                // 只要lab存在，且其ID注册为com 就强制占用
                if (this.memory.RoomLabBind[occ_lab_id].type && this.memory.RoomLabBind[occ_lab_id].type == 'com' && Game.getObjectById(occ_lab_id as Id<StructureLab>)) {
                    return occ_lab_id
                }
            }
        }
        return result
    }

    /* -----------------------lab优化区----------------------------(测试中) */


    /* 获取指定列表中类型的hit最小的建筑 (比值) 返回值： Structure | undefined */
    public getListHitsleast(sc: StructureConstant[], mode?: number, hitsMax?: number | null): Structure | undefined {
        if (!mode) mode = 2
        /* 3 */
        if (mode == 3) mode = 0
        // let s_l = this.find(FIND_STRUCTURES, {
        //     filter: (structure) => {
        //         return filter_structure(structure, sc) && structure.hits < structure.hitsMax
        //     }
        // })
        let s_l = this.find(FIND_STRUCTURES)
        let s_list = [];
        for (let structure of s_l) {
            if (!isInArray(sc, structure.structureType)) continue
            if (!structure.hits) continue;
            if (structure.hits >= structure.hitsMax) continue
            if (hitsMax && structure.hits > hitsMax) {
                continue
            }
            if (this.memory.state == 'war') {
                if (!CheckExcludeRampart(this, structure.pos)) {
                    continue
                }
            }
            s_list.push(structure)
        }
        if (s_list.length > 0) {
            s_list.sort(compare('hits'))
            return s_list[0]
        }
        return null;
        // let least_ = LeastHit(s_l, mode,)
        // return least_
    }

    /* 获取指定类型的建筑 */
    public getTypeStructure(sr: StructureConstant[]): Structure[] {
        var resultstructure = this.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return filter_structure(structure, sr)
            }
        })
        return resultstructure
    }

    /* 房间建筑执行任务 */
    public structureMission(strus: StructureConstant[]): void {
        var AllStructures = this.getTypeStructure(strus) as StructureLink[]
        for (var stru of AllStructures) {
            if (stru.ManageMission)
                stru.ManageMission()
        }
    }

    /**
    * 建筑任务初始化 目前包含terminal factory link
    */
    public StructureMission(): void {
        if (Game.cpu.bucket < 1000 && Memory.StopPixel) return;
        let structures = []
        var IdData = this.memory.StructureIdData
        /*终端信息*/
        if (Game.cpu.bucket > 1500 && Memory.StopPixel) {
            let terminal = this.terminal as StructureTerminal
            if (terminal) { structures.push(terminal) }
        }
        /*工厂信息*/
        if (IdData.FactoryId && Game.cpu.bucket > 2000 && Memory.StopPixel) {
            let factory = Game.getObjectById(IdData.FactoryId) as StructureFactory
            if (factory) { structures.push(factory) }
        }
        /*Link信息*/
        // for (let _link of this.getStructure(STRUCTURE_LINK) as StructureLink[]) {
        //     structures.push(_link)
        // }
        if (IdData.center_link) {
            let center_link = Game.getObjectById(IdData.center_link) as StructureLink
            if (!center_link) { delete IdData.center_link }
            else structures.push(center_link)
        }
        if (IdData.source_links && IdData.source_links.length > 0) {
            for (var s of IdData.source_links) {
                let sl = Game.getObjectById(s) as StructureLink
                if (!sl) {
                    var index = IdData.source_links.indexOf(s)
                    IdData.source_links.splice(index, 1)
                }
                else structures.push(sl)
            }
        }
        if (IdData.comsume_link && IdData.comsume_link.length > 0) {
            for (var s of IdData.comsume_link) {
                let sl = Game.getObjectById(s) as StructureLink
                if (!sl) {
                    var index = IdData.comsume_link.indexOf(s)
                    IdData.comsume_link.splice(index, 1)
                }
                else structures.push(sl)
            }
        }
        if (structures.length > 0) {
            for (var obj of structures) {
                if (obj.ManageMission) {
                    obj.ManageMission()
                }
            }
        }
    }

    /* 获取全局建筑对象变量 由于该对象每tick都不一样，所以需要每tick都获取 */
    public GlobalStructure(): void {
        // 目前只支持 storage terminal factory powerspawn 
        if (!global.Stru) global.Stru = {}
        if (!global.Stru[this.name]) global.Stru[this.name] = {}

        // Game.rooms[this.memory.belong].GetStructData('factory')
        // if (this.memory.StructureIdData.NtowerID) {
        //     global.Stru[this.name]['Ntower'] = Game.getObjectById(this.memory.StructureIdData.NtowerID) as StructureTower
        //     if (!global.Stru[this.name]['Ntower']) {
        //         delete this.memory.StructureIdData.NtowerID
        //     }
        // }
        // if (this.memory.StructureIdData.AtowerID && this.memory.StructureIdData.AtowerID.length > 0) {
        //     var otlist = global.Stru[this.name]['Atower'] = [] as StructureTower[]
        //     for (var ti of this.memory.StructureIdData.OtowerID) {
        //         var ot = Game.getObjectById(ti) as StructureTower
        //         if (!ot) {
        //             var index = this.memory.StructureIdData.OtowerID.indexOf(ti)
        //             this.memory.StructureIdData.OtowerID.splice(index, 1)
        //             continue
        //         }
        //         otlist.push(ot)
        //     }
        // }
    }

    /* 等级信息更新 */
    public LevelMessageUpdate(): void {
        if (this.controller.level > this.memory.originLevel)
            this.memory.originLevel = this.controller.level
    }
}
/* 按照列表中某个属性进行排序 配合sort使用 */
export function compare(property) {
    return function (a, b) {
        var value1 = a[property]
        var value2 = b[property]
        return value1 - value2
    }
}