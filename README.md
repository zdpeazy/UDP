# UDP
从baidu摘过来一段：UDP，用户数据报协议，与所熟知的TCP（传输控制协议）协议一样，UDP协议直接位于IP（网际协议）协议的顶层。根据OSI（开放系统互连）参考模型，UDP和TCP都属于传输层协议。UDP协议的主要作用是将网络数据流量压缩成数据包的形式。一个典型的数据包就是一个二进制数据的传输单位。每一个数据包的前8个字节用来包含报头信息，剩余字节则用来包含具体的传输数据。

UDP报文没有可靠性保证、顺序保证和流量控制字段等，可靠性较差。但是正因为UDP协议的控制选项较少，在数据传输过程中延迟小、数据传输效率高，适合对可靠性要求不高的应用程序，或者可以保障可靠性的应用程序，如DNS、TFTP、SNMP等。

好了，接下来简要说明一下我实现的效果：

防工具盗链抓取【如果显示此文字，代表来自第三方转发】 freddon所有  

有Fred、Lenka、Nick三个人，均处于同一聊天室中：

即：Nick发的消息，Fred、Lenka均能收到；

       Fred、Lenka只能互相发消息。

OK，就这么简单。为了说明问题，就不过度封装代码，以说明为主。

防工具盗链抓取【如果显示此文字，代表来自第三方转发】 freddon所有  

Server端：

server.js

var udp = require('dgram');

var server = udp.createSocket('udp4');

/**
 * 用于存储人员之间的离线消息任务
 * @type {{tasks: Array}}
 */
var msgTask = {
    //config: {},
    tasks: []
};

/**
 * 存醋当前在线的用户
 * @type {{online: Array, pool: Array}}
 */
var userPool = {
    online: [],
    pool: []
};

/**
 * 加入某个用户的在线状态
 * @param name
 * @param rinfo
 */
var pushIntoPool = function (name, rinfo) {
    var index = userPool.online.indexOf(name);
    if (index >= 0) {
        userPool.online.splice(index, 1);
        userPool.pool.splice(index, 1);
    }
    userPool.online.push(name);
    userPool.pool.push({name: name, ip: rinfo.address, port: rinfo.port});
};

/**
 * 移除在线状态
 * @param name
 */
var pullFromPool = function (name) {
    var index = userPool.online.indexOf(name);
    if (index >= 0) {
        userPool.online.splice(index, 1);
        userPool.pool.splice(index, 1);
        return;
    }
};

/**
 * 加入离线消息任务
 * @param msg
 */
var addInTask = function (msg) {
    msgTask.tasks.push({msg: msg, expireTime: 7 * 24 * 3600 + new Date().getTime()});
};

/**
 * 发送消息
 * @param m
 * @param rinfo
 */
var sendMsg = function (m, rinfo) {
    process.nextTick(function () {
        if (m.to){
            //获取对方的服务地址\端口
            var index = userPool.online.indexOf(m.to.name);
            if (index >= 0) {
                //在线
                var config = userPool.pool[index];
                var msg = JSON.stringify(m);
                server.send(msg, 0, Buffer.byteLength(msg, encoding = 'utf8'), config.port, config.ip, function (err, bytes) {
                    if (err) {
                        //发送失败
                        //缓存数据
                        addInTask(m);
                    }
                });
            } else {
                if (rinfo) {
                    //离线
                    var content = JSON.stringify({content: m.to.name + '不在线'});
                    server.send(content, 0, Buffer.byteLength(content, encoding = 'utf8'), rinfo.port, rinfo.address, function (err, bytes) {
                        if (err) {
                            //发送失败
                        }
                    });
                }
                //不在线
                pullFromPool(m.to.name);
                //缓存数据
                addInTask(m);
            }

        } else {
            //群聊
            for (var i = 0; i < userPool.pool.length; i++) {
                var to_cfg = userPool.pool[i];
                if (to_cfg.name == m.from.name) {
                    continue;
                } else {
                    var msg = JSON.stringify(m);
                    server.send(msg, 0, Buffer.byteLength(msg, encoding = 'utf8'), to_cfg.port, to_cfg.ip, function (err, bytes) {
                        if (err) {
                            //发送失败
                        }
                    });
                }
            }
        }
    });
};

/**
 * 后台轮询任务
 */
var backgroundTask = function () {
    for (var i = 0; i < msgTask.tasks.length; i++) {
        var m = msgTask.tasks.splice(i, 1)[0];
        sendMsg(m.msg);
    }
    beginTask();
};

var tid;

var beginTask = function () {
    clearTimeout(tid);
    tid = setTimeout(backgroundTask, 1000);
};


server.on('message', function (msg, rinfo) {
    //注意msg为Buffer对象
    var m = JSON.parse(msg.toString());
    pushIntoPool(m.from.name, rinfo);
    if (m.action == 'online') {
        console.log('当前聊天室在线人数%d::%s', userPool.online.length,userPool.online.join(","));
        return;
    }
    //发送消息
    sendMsg(m, rinfo);
}).bind(8124, function () {
    console.log('服务端启动成功');
    //当服务启动后,开启后台消息轮询服务
    beginTask();
});
Client端：

Fred.js 用户fred

var udp=require('dgram');
var mm=require('./msgmodel');
var client=udp.createSocket('udp4');
var from={
    name:'Fred',
    host:client.address,
    port:client.remotePort,
    content:''
};
var msg=new mm.FMsg(from);
process.stdin.resume();
process.stdin.on('data',function(data){
    msg.setAction('chat');
    msg.setContent(data.toString('utf8'));
    //设置只能发送给Lenka
    msg.setTo({
        name:'Lenka'
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
        console.log("Fred上线!");
    }
});
Lenka.js 用户Lenka

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
Nick.js 用户Nick

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
消息类msgmodel.js  

var host = '127.0.0.1';//需要连接到服务器提供udp连接的ip
var port = 8124;//需要连接到服务器提供udp连接的端口
var ACTIONS=['online','chat','request','stranger','del','offline'];
function FMsg(from, to, content) {
    this.from = from;
    this.to = to;
    this.content = content;
    this.action = 'online';
    this.setAction = function (action) {
        this.action = action;
    };
    this.setTo = function (to) {
        this.to = to;
    };

    this.setContent = function (content) {
        this.content = content;
    };
    this.getMsg = function () {
        var msg = {
            from: this.from,
            to: this.to,
            content: this.content,
            action:this.action
        };
        return JSON.stringify(msg);
    };
    this.udpSendMsg = function (client, callback) {
        var data = this.getMsg();
        client.send(data, 0, Buffer.byteLength(data,encoding='utf8'), port, host, callback);
    };
}
exports.FMsg = FMsg;


接下来分别使用nodejs启动服务端和客户端。

启动服务端后，只启动Fred、Lenka中的一个（比如说启动了Fred）：





在Fred控制台进行如下输入：（Lenka不在线，所以该消息未发送成功）



然后启动Lenka，（Lenka收到了离线消息）Lenka的控制台为：



启动Nick，Nick说话，然后观察其他两个客户端，

server:



nick:



fred:



lenka:



Lenka、Fred说话，观察Nick控制台：

Lenka：



fred：



nick：







好啦，相当简单的一个点对点和聊天室的功能就这样搭好了。
