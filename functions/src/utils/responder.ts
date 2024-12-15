export class Message {
    constructor(message:any,code:number = 200){
        return new Promise((resolve)=>{
            resolve({
                status:code,
                result:message
            })
        })
    }
}