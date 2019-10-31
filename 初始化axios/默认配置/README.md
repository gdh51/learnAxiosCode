# defaultConfig——默认配置

源码文件来源于[source code defaults](../../axios/lib/defaults.js)

在默认配置中包含一些对请求和响应初步处理的函数，还有对发送请求环境的检测以及对`HTTP Methods`的初步处理，具体为：

```js
var defaults = {
    adapter: getDefaultAdapter(),

    transformRequest: [function transformRequest(data, headers) {

        // 将headers中的报文头字段标准化
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');

        // 如为以下类型则直接返回
        if (utils.isFormData(data) ||
            utils.isArrayBuffer(data) ||
            utils.isBuffer(data) ||
            utils.isStream(data) ||
            utils.isFile(data) ||
            utils.isBlob(data)
        ) {
            return data;
        }

        // 传入ArrayBuffer二进制视图时，返回其buffer
        if (utils.isArrayBufferView(data)) {
            return data.buffer;
        }

        // 传入URLSearchParams时，转换为ASCII编码字符串
        if (utils.isURLSearchParams(data)) {
            setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
            return data.toString();
        }

        // 传入对象时转化为JSON对象
        if (utils.isObject(data)) {
            setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
            return JSON.stringify(data);
        }
        return data;
    }],

    transformResponse: [function transformResponse(data) {

        // 将响应字符串对象化
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                /* Ignore */
            }
        }
        return data;
    }],

    /**
     * A timeout in milliseconds to abort a request. If set to 0 (default) a
     * timeout is not created.
     * 请求超时时间，设置为0时，默认关闭
     */
    timeout: 0,

    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',

    maxContentLength: -1,

    // 成功响应的状态码检测(不包含304)
    validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
    }
};
```

其中`getDefaultAdapter()`方法用于检查当前运行环境适合使用的发送`http`请求的方式：

- **浏览器**：[XHR对象](../../适配器/浏览器适配器)
- **NodeJs**：[HTTP模块](../../适配器/服务器适配器)

```js
// 根据环境获取用于请求的适配对象
function getDefaultAdapter() {
    var adapter;

    // Only Node.JS has a process variable that is of [[Class]] process
    // 仅Node环境下有该环境变量
    if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {

        // For node use HTTP adapter
        // node环境中，用HTTP适配器
        adapter = require('./adapters/http');
    } else if (typeof XMLHttpRequest !== 'undefined') {

        // For browsers use XHR adapter
        // 浏览器环境使用XHR对象
        adapter = require('./adapters/xhr');
    }

    return adapter;
}
```

之后在向`defaults.headers`中添加一些公共和默认头部配置信息信息：

```js
var DEFAULT_CONTENT_TYPE = {
    'Content-Type': 'application/x-www-form-urlencoded'
};

// 设置默认头部的通用信息
defaults.headers = {
    common: {
        'Accept': 'application/json, text/plain, */*'
    }
};

// 为默认配置头部设置对应methods的对象
utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
    defaults.headers[method] = {};
});

// 为三个请求配置默认的Content-Type
utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
    defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});
```

到此为至默认的配置就设置完成了。
