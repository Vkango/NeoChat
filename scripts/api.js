// HTTP API以及WS API的调用
export class API{
    constructor(httpUrl, wsObj) {
        this.httpUrl = httpUrl;
        this.ws = wsObj;
    };
    SendGroupMessage(group_id, message) {
        fetch('http://127.0.0.1:1145/send_group_msg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ group_id: group_id, message: message }),
        })
        .then(response => response.json())
        .then(data => console.log('API响应:', data))
        .catch(error => console.error('API错误:', error));
    };
    GetGroupInfo(group_id){
        this.ws.send(JSON.stringify({
            action: "get_group_info",
            params: {
                group_id: group_id,
                no_cache: true
            }
        }))
    };
};