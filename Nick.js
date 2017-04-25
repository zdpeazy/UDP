var udp=require('dgram');
var mm=require('./msgmodel');
var client=udp.createSocket('udp4');
var from={
    name:'Nick',
    host:client.address,
    port:client.remotePort,
    content:''
};
var msg=new mm.FMsg(from);
process.stdin.resume();
process.stdin.on('data',function(data){
    msg.setAction('chat');
    msg.setContent(data.toString('utf8'));
    //不设置发送给谁，默认发送给所有人
    msg.udpSendMsg(client,function(err,bytes){
        if(err){
            //发送失败
        }
    });

});
client.on('message',function(datas){
    var data=JSON.parse(data.toString());
    if(!data.from){
        console.log(data.content);
    }else{
        if(!data.to){
            console.log("[%s]:%s",data.from.name,data.content);
        }else{
            console.log("[%s@%s]:%s",data.from.name,data.to.name,data.content);
        }
    }
});
//默认连接后上线操作
msg.udpSendMsg(client,function(err,bytes){
    if(err==0){
        console.log("Nick上线!");
    }
});