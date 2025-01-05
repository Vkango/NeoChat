// HTTP API以及WS API的调用
export class API{
    constructor(httpUrl, wsObj) {
        this.httpUrl = httpUrl;
        this.ws = wsObj;
    };
    SendGroupMessage(group_id, message) {
        fetch(this.httpUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ group_id: group_id, message: message }),
        })
        .then(response => response.json())
        .then(data => {console.log('API响应:', data); return data;})
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
    async GetSelfInfo() {
        try {
            const response = await fetch(this.httpUrl + "/get_login_info", {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            console.log('API响应:', data);
            return data;
        } catch (error) {
            console.error('API错误:', error);
            throw error;
        }
    };
    async SendGroupMessageHTTP(group_id, msg) {
        try {
            const response = await fetch(this.httpUrl + "/send_group_msg", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ group_id: group_id, message: msg }),
            });
            const data = await response.json();
            console.log('API响应:', data);
            return data;
        } catch (error) {
            console.error('API错误:', error);
            throw error;
        }
    };
    async GetGroupMemberListHTTP(group_id) {
        try {
            const response = await fetch(this.httpUrl + "/get_group_member_list", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ group_id: group_id}),
            });
            const data = await response.json();
            console.log('API响应:', data);
            return data;
        } catch (error) {
            console.error('API错误:', error);
            throw error;
        }
    };
};