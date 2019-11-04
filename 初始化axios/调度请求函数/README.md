# 请求调度函数——dispatchRequest()

该函数用于处理用户传入参数与报文头部信息等等，最后发起请求:

```js
function dispatchRequest(config) {

    // 用户配置有取消对象时，抛出取消信息
    throwIfCancellationRequested(config);

    // Support baseURL config
    // 支持基准URL，当设置有基准URL且是相对URL时，合并取出绝对URL
    if (config.baseURL && !isAbsoluteURL(config.url)) {
        config.url = combineURLs(config.baseURL, config.url);
    }

    // Ensure headers exist
    config.headers = config.headers || {};

    // Transform request data
    // 处理data和headers中的数据
    config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
    );

    // Flatten headers 扁平化头部信息
    config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers || {}
    );

    // 移除多余的头部信息配置
    utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
            delete config.headers[method];
        }
    );

    // 选择用于请求的适配器
    var adapter = config.adapter || defaults.adapter;

    // 直接通过适配器发送请求
    return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        // 转换响应信息格式
        response.data = transformData(
            response.data,
            response.headers,
            config.transformResponse
        );

        return response;
    }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
            throwIfCancellationRequested(config);

            // Transform response data
            if (reason && reason.response) {
                reason.response.data = transformData(
                    reason.response.data,
                    reason.response.headers,
                    config.transformResponse
                );
            }
        }

        return Promise.reject(reason);
    });
};
```

我们可以看到再发送请求之前，我们可以通过拦截器阻止发送请求，只需要配置`config.cancelToken`中的`cancelToken`对象，那么我们就会在正式发送请求时调用[`throwIfCancellationRequested()`](#%e8%af%b7%e6%b1%82%e5%8f%96%e6%b6%88%e5%87%bd%e6%95%b0throwifcancellationrequested)进行取消请求。

## 请求取消函数——throwIfCancellationRequested()

该函数利用`cancelToken`对象[`throwIfRequested()`](../../取消器/README.md#canceltokenprototypethrowifrequested%e6%8a%9b%e5%87%ba%e9%94%99%e8%af%af)方法来抛出一个错误来直接`reject`掉这次`promise`

```js
function throwIfCancellationRequested(config) {

    // 该值默认为空
    if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
    }
}
```
