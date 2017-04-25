var udp=require('dgram');
var mm=require('./msgmodel');
var client=udp.createSocket('udp4');
var from={
    name:'Lenka',
    host:client.address,
    port:client.remotePort,
    content:''
};
var msg=new mm.FMsg(from);
process.stdin.resume();
process.stdin.on('data',function(data){
    msg.setAction('chat');
    msg.setContent(data.toString('utf8'));
    //设置只能发送给Fred
    msg.setTo({
        name:'Fred'
    });
    msg.udpSendMsg(client,function(err,bytes){
        if(err){
            //发送失败
        }
    });

});
client.on('message',function(data){
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
        console.log("Lenka上线!");
    }
});