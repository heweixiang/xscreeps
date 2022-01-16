import { Colorful, compare, generateID, isInArray } from "@/utils"

/* 房间原型拓展   --任务  --任务框架 */
export default class RoomMissonFrameExtension extends Room {
    /* 任务管理器 */
    public MissionManager():void{
        // 冷却监测
        this.CoolDownCaculator()
        // 超时监测
        this.DelayCaculator()
        // 任务-爬虫 绑定信息更新
        this.UnbindMonitor()
        /* 任务主动挂载区域 需要按照任务重要程度进行排序 */
        this.Task_Feed()
        this.Task_Build()
        /* 基本任务监控区域 */
        for (var index in this.memory.Misson)
        for (var misson of this.memory.Misson[index])
        {
            switch (misson.name){
                case "物流运输":{this.Task_Carry(misson);break;}
            }
        }
    }

    /* 添加任务 */
    public AddMission(mis:MissionModel):boolean{
        var Index:string
        if (mis.range == 'Creep') Index = 'C-'
        else if (mis.range == 'Room') Index = 'R-'
        else if (mis.range == 'Structure') Index = 'S-'
        else if (mis.range == 'PowerCreep') Index = 'P-'
        else return
        var tempID = Index + generateID()
        /* 最多允许同时有30个任务，超过则不能再挂载 */
        if (this.memory.Misson[mis.range] && this.memory.Misson[mis.range].length >= 30)
        {
            return false
        }
        /* 超过了任务的最大重复数，也不允许挂载 默认是1*/
        var maxtime = mis.maxTime?mis.maxTime:1
        if (mis.CreepBind)
        {
            /* 爬虫任务 */
            for (var c of Object.keys(mis.CreepBind))
            {
                if (this.RoleMissionNum(c,mis.name)>= maxtime)
                return false
            }
        }
        else
        {
            /* 房间、建筑类型的任务 */
            let NowNum = this.MissionNum(mis.range,mis.name)
            if (NowNum >= maxtime)
            {
                return false
            }
        }
        /* 如果该任务冷却时间不为0则不允许挂载 */
        if (this.memory.CoolDownDic[mis.name])
        {
            return false
        }
        mis.id = tempID
        /* lab绑定相关，涉及lab的绑定和解绑 */
        if (mis.LabBind && Object.keys(mis.LabBind).length > 0)
        {
            for (var l in mis.LabBind)
            {
                if (!this.CheckLabType(l,mis.LabBind[l] as ResourceConstant) || !this.CheckLabOcc(l))
                {
                    console.log(Colorful(`LabID:${l}绑定失败，请检查!`,'red',true))
                    return false
                }
            }
        }
        if (mis.LabBind === null) return false
        /* 每种相同任务成功挂载一次，将有冷却时间 默认为10 */
        var coolTick = mis.cooldownTick?mis.cooldownTick:10
        if (!this.memory.CoolDownDic[mis.name])
        this.memory.CoolDownDic[mis.name] = coolTick
        mis.level?mis.level:10  // 任务等级默认为10
        // 挂载任务
        this.memory.Misson[mis.range].push(mis)
        this.memory.Misson[mis.range].sort(compare('level'))      // 每次提交任务都根据优先级排列一下
        if (!isInArray(Memory.ignoreMissonName,mis.name))
            console.log(Colorful(`${mis.name} 任务挂载√√√ ID:${mis.id} Room:${this.name}`,'green'))
        /* 任务挂载成功才绑定实验室 */
        if (mis.LabBind && Object.keys(mis.LabBind).length > 0)
        {
            for (var ll in mis.LabBind)
            {
                this.BindLabData(ll,mis.LabBind[ll] as ResourceConstant,mis.id)
            }
        }
        return true
    }

    /* 删除任务 */
    public DeleteMission(id:string):boolean{
        var range:string
        if (!id) {console.log("存在id异常! 发生在房间",this.name);return false}
        if (id[0] == 'C') range = 'Creep'
        else if (id[0] == 'S') range = 'Structure'
        else if (id[0] == 'R') range = 'Room'
        else if (id[0]== 'P') range = 'PowerCreep'
        else return false
        for (var m of this.memory.Misson[range])
        {
            if (m.id == id)
            {
                /* 解绑lab */
                if (m.LabBind && Object.keys(m.LabBind).length > 0)
                {
                    for (var l in m.LabBind)
                    {
                        // console.log('LabID: ',m.LabBind[l],'------解绑-------->MissonID: ',m.id)
                        this.UnBindLabData(l,m.id)
                    }
                }
                /* 解绑爬虫的任务 对于没有超时监测的任务，删除任务也要删除任务绑定的爬虫 */
                if (m.delayTick < 99995 && m.CreepBind)
                {
                    for (var c in m.CreepBind)
                    for (var cc of m.CreepBind[c].bind)
                    {
                        if (Game.creeps[cc])
                        {
                            /* 删除任务也意味着初始化任务数据内存 */
                            Game.creeps[cc].memory.MissionData = {}
                        }
                    }
                }
                /* 删除任务*/
                var index = this.memory.Misson[range].indexOf(m)
                this.memory.Misson[range].splice(index,1)
                if (!isInArray(Memory.ignoreMissonName,m.name))
                    console.log(Colorful(`${m.name} 任务删除××× ID:${m.id} Room:${this.name}`,'blue'))
                return true
            }
        }
        console.log(Colorful(`任务删除失败 ID:${m.id} Name:${m.name} Room:${this.name}`,'red'))
        return false


    }

    /* 冷却计时器 */
    public CoolDownCaculator():void{
        if (!this.memory.CoolDownDic) this.memory.CoolDownDic = {}
        for (var i in this.memory.CoolDownDic)
        {
            if (this.memory.CoolDownDic[i] > 0)
                this.memory.CoolDownDic[i] -= 1
            else
                delete this.memory.CoolDownDic[i]
        }
    }
    /* 超时计时器 */
    public DelayCaculator():void{
        for (var key in this.memory.Misson)
        {
            for (var i of this.memory.Misson[key])
            {
                if (i.processing &&  i.delayTick < 99995)
                    i.delayTick --
                if (i.delayTick <= 0)
                {
                    /* 小于0就删除任务 */
                    this.DeleteMission(i.id)
                }
            }
        }
    }

    /* 任务解绑监测 */
    public UnbindMonitor():void{
        /* 只适用于Creep任务 */
        if (Game.time % 5) return
        if (!this.memory.Misson['Creep']) return
        for (var m of this.memory.Misson['Creep'])
        {
            if (!m.CreepBind) continue
            if (m.CreepBind && Object.keys(m.CreepBind).length > 0)
            {
                for (var r in m.CreepBind)
                {
                    for (var c of m.CreepBind[r].bind)
                    if (!Game.creeps[c])
                    {
                        console.log(`已经清除爬虫${c}的绑定数据！`)
                        var index = m.CreepBind[r].bind.indexOf(c)
                        m.CreepBind[r].bind.splice(index,1)
                    }
                }
            }
        }
    }
    /* 任务数量查询 */
    public MissionNum(range:string,name:string):number{
        if (!this.memory.Misson) this.memory.Misson = {}
        if (!this.memory.Misson[range]) this.memory.Misson[range] = []
        let n = 0
        for (var i of this.memory.Misson[range])
        {
            if (i.name == name)
            {
                n += 1
            }
        }
        return n
    }
    /* 与role相关的任务数量查询 */
    public RoleMissionNum(role:string,name:string):number{
        if (!this.memory.Misson) this.memory.Misson = {}
        if (!this.memory.Misson['Creep']) this.memory.Misson['Creep'] = []
        let n = 0
        for (var i of this.memory.Misson['Creep'])
        {
            if (!i.CreepBind) continue
            if (i.name == name && isInArray(Object.keys(i.CreepBind),role))
            {
                n += 1
            }
        }
        return n
    }

    /* 获取任务 */
    public GainMission(id:string):MissionModel | null{
        for (var i in this.memory.Misson)
            for (var t of this.memory.Misson[i])
            {
                if (t.id == id)
                    return t
            }
        return null
    }

    /* 判断实验室资源类型是否一致 */
    public CheckLabType(id:string,rType:ResourceConstant):boolean
    {
        if (!this.memory.RoomLabBind) this.memory.RoomLabBind = {}
        for (var i in this.memory.RoomLabBind)
        {
            if (i == id)
            {
                var thisLab = Game.getObjectById(i) as StructureLab
                if (!thisLab) return false
                if (thisLab.mineralType && thisLab.mineralType != rType)
                {
                    return false
                }
                if (this.memory.RoomLabBind[i].rType != rType) return false
                return true
            }
        }
        return true
    }

    /* 判断是否允许新增 */
    public CheckLabOcc(id:string):boolean{
        if (!this.memory.RoomLabBind) this.memory.RoomLabBind = {}
        for (var i in this.memory.RoomLabBind)
        {
            if (i == id)
            {
                if (this.memory.RoomLabBind[i].occ) return false
                return true
            }
        }
        return true
    }

    /* 设置lab绑定数据 */
    public BindLabData(id:string,rType:ResourceConstant,MissonID:string,occ?:boolean):boolean{
        for (var i in this.memory.RoomLabBind)
        {
            if (i == id)
            {
                if (this.memory.RoomLabBind[i].rType != rType) return false
                if (!isInArray(this.memory.RoomLabBind[i].missonID,MissonID))
                {
                    this.memory.RoomLabBind[i].missonID.push(MissonID)
                    return true
                }
            }
        }
        // 说明不存在该id
        this.memory.RoomLabBind[id] = {missonID:[MissonID],rType:rType,occ:occ?occ:false}
        return true
    }

    /* 解绑lab绑定数据 */
    public UnBindLabData(id:string,MissonID:string):boolean{
        for (var i in this.memory.RoomLabBind)
        {
            if (i == id)
            {
                if (this.memory.RoomLabBind[i].missonID.length <= 1)
                {
                    console.log('LabID: ',i,'------解绑-------->MissonID: ',MissonID)
                    delete this.memory.RoomLabBind[i]
                    return true
                }
                else
                {
                    for (var j of this.memory.RoomLabBind[i].missonID)
                    {
                        if (j == MissonID)
                        {
                            console.log('LabID: ',i,'------解绑-------->MissonID: ',MissonID)
                            var index = this.memory.RoomLabBind[i].missonID.indexOf(MissonID)
                            this.memory.RoomLabBind[i].missonID.splice(index,1)
                            return true
                        }
                    }
                    return false
                }
            }
        }
        return false
    }
}